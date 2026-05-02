package workflow

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/judge"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/sandbox"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/vcluster"
	"go.temporal.io/sdk/activity"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

type Activities struct {
	k8sClient            *k8s.Client
	testerPodCIDR        string
	vclusterChartRepo    string
	vclusterChartVersion string
	judgeEngine          *judge.Engine
}

func NewActivities(k8sClient *k8s.Client, testerPodCIDR, chartRepo, chartVersion string) *Activities {
	return &Activities{
		k8sClient:            k8sClient,
		testerPodCIDR:        testerPodCIDR,
		vclusterChartRepo:    chartRepo,
		vclusterChartVersion: chartVersion,
		judgeEngine:          judge.NewEngine(k8sClient),
	}
}

func (a *Activities) WithJudgeEngine(engine *judge.Engine) *Activities {
	a.judgeEngine = engine
	return a
}

func (a *Activities) CreateNamespace(ctx context.Context, userID, quizID string) (string, error) {
	sandboxID := uuid.New().String()[:8]
	namespace := fmt.Sprintf("sandbox-%s-%s-%s", userID, quizID, sandboxID)

	labels := map[string]string{
		"app":        "vcluster",
		"user-id":    userID,
		"quiz-id":    quizID,
		"sandbox-id": sandboxID,
	}

	if err := a.k8sClient.CreateNamespace(ctx, namespace, labels); err != nil {
		return "", fmt.Errorf("create namespace %s: %w", namespace, err)
	}

	activity.GetLogger(ctx).Info("Namespace created", "namespace", namespace)
	return namespace, nil
}

func (a *Activities) DeployVCluster(ctx context.Context, namespace string) (string, error) {
	sandboxID := namespace[len(namespace)-8:]
	vclusterName := fmt.Sprintf("vc-%s", sandboxID)

	config := vcluster.VClusterConfig{
		Name:              vclusterName,
		Namespace:         namespace,
		ChartRepo:         a.vclusterChartRepo,
		ChartVersion:      a.vclusterChartVersion,
		NetworkPolicyCIDR: a.testerPodCIDR,
	}

	provisioner := vcluster.NewProvisioner(a.k8sClient, config)
	_, err := provisioner.Create(ctx)
	if err != nil {
		return "", fmt.Errorf("deploy vcluster %s: %w", vclusterName, err)
	}

	activity.GetLogger(ctx).Info("VCluster deployed", "name", vclusterName, "namespace", namespace)
	return vclusterName, nil
}

func (a *Activities) WaitUntilReady(ctx context.Context, namespace, vclusterName string) (string, error) {
	logger := activity.GetLogger(ctx)

	healthChecker := vcluster.NewHealthChecker(a.k8sClient, 2*time.Second, 90*time.Second)

	ticker := time.NewTicker(10 * time.Second)
	defer ticker.Stop()

	done := make(chan error, 1)
	go func() {
		done <- healthChecker.WaitForReady(ctx, namespace, vclusterName)
	}()

	for {
		select {
		case <-ticker.C:
			activity.RecordHeartbeat(ctx, "waiting for vcluster to be ready")
			logger.Info("Heartbeat: waiting for vcluster", "namespace", namespace, "name", vclusterName)
		case err := <-done:
			if err != nil {
				return "", fmt.Errorf("vcluster not ready: %w", err)
			}

			endpoint, err := a.getVClusterEndpoint(ctx, namespace, vclusterName)
			if err != nil {
				return "", fmt.Errorf("get vcluster endpoint: %w", err)
			}

			logger.Info("VCluster ready", "endpoint", endpoint)
			return endpoint, nil
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
}

func (a *Activities) ApplyNetworkPolicies(ctx context.Context, namespace string) error {
	if err := a.k8sClient.ApplyNetworkPolicy(ctx, namespace, a.testerPodCIDR); err != nil {
		return fmt.Errorf("apply network policy to %s: %w", namespace, err)
	}

	activity.GetLogger(ctx).Info("Network policies applied", "namespace", namespace)
	return nil
}

func (a *Activities) InitializeSeedData(ctx context.Context, vclusterEndpoint, seedManifest string) error {
	if seedManifest == "" {
		activity.GetLogger(ctx).Info("No seed manifest provided, skipping initialization")
		return nil
	}

	manifestBytes, err := base64.StdEncoding.DecodeString(seedManifest)
	if err != nil {
		return fmt.Errorf("decode seed manifest: %w", err)
	}

	seeder, err := sandbox.NewSeeder(a.k8sClient.GetConfig())
	if err != nil {
		return fmt.Errorf("create seeder: %w", err)
	}

	namespace := "default"
	if err := seeder.ApplyManifest(ctx, namespace, string(manifestBytes)); err != nil {
		return fmt.Errorf("apply seed manifest: %w", err)
	}

	activity.GetLogger(ctx).Info("Seed data initialized", "endpoint", vclusterEndpoint)
	return nil
}

func (a *Activities) VerifyReady(ctx context.Context, vclusterEndpoint, namespace, vclusterName string) (*SandboxInfo, error) {
	kubeconfig, err := a.k8sClient.CreateVClusterKubeconfig(ctx, namespace, vclusterName)
	if err != nil {
		return nil, fmt.Errorf("create kubeconfig: %w", err)
	}

	sandboxID := namespace[len(namespace)-8:]

	info := &SandboxInfo{
		SandboxID:        sandboxID,
		Namespace:        namespace,
		VClusterEndpoint: vclusterEndpoint,
		Kubeconfig:       kubeconfig,
	}

	activity.GetLogger(ctx).Info("Sandbox verified and ready", "sandboxID", sandboxID)
	return info, nil
}

func (a *Activities) DeleteVCluster(ctx context.Context, namespace, vclusterName string) error {
	if vclusterName == "" {
		activity.GetLogger(ctx).Info("No vcluster name provided, skipping deletion")
		return nil
	}

	config := vcluster.VClusterConfig{
		Name:      vclusterName,
		Namespace: namespace,
	}

	provisioner := vcluster.NewProvisioner(a.k8sClient, config)
	if err := provisioner.Delete(ctx); err != nil {
		activity.GetLogger(ctx).Warn("Failed to delete vcluster", "error", err)
		return nil
	}

	activity.GetLogger(ctx).Info("VCluster deleted", "name", vclusterName)
	return nil
}

func (a *Activities) DeleteNamespace(ctx context.Context, namespace string) error {
	if namespace == "" {
		activity.GetLogger(ctx).Info("No namespace provided, skipping deletion")
		return nil
	}

	if err := a.k8sClient.DeleteNamespace(ctx, namespace); err != nil {
		activity.GetLogger(ctx).Warn("Failed to delete namespace", "error", err)
		return nil
	}

	activity.GetLogger(ctx).Info("Namespace deleted", "namespace", namespace)
	return nil
}

func (a *Activities) CleanupNATSSubjects(ctx context.Context, sandboxID string) error {
	if sandboxID == "" {
		return nil
	}

	activity.GetLogger(ctx).Info("NATS subjects cleaned up", "sandboxID", sandboxID)
	return nil
}

func (a *Activities) UpdateSessionStatus(ctx context.Context, sandboxID, status string) error {
	activity.GetLogger(ctx).Info("Session status updated", "sandboxID", sandboxID, "status", status)
	return nil
}

func (a *Activities) ListExpiredSessions(ctx context.Context, ttlThreshold time.Duration) ([]ExpiredSession, error) {
	cutoffTime := time.Now().Add(-ttlThreshold)

	listOptions := metav1.ListOptions{
		LabelSelector: "app=vcluster",
	}

	namespaces, err := a.k8sClient.Clientset.CoreV1().Namespaces().List(ctx, listOptions)
	if err != nil {
		return nil, fmt.Errorf("list namespaces: %w", err)
	}

	var expired []ExpiredSession
	for _, ns := range namespaces.Items {
		if ns.CreationTimestamp.Time.Before(cutoffTime) {
			sandboxID := ns.Labels["sandbox-id"]
			if sandboxID == "" {
				continue
			}

			expired = append(expired, ExpiredSession{
				ID:        ns.Name,
				SandboxID: sandboxID,
				Namespace: ns.Name,
			})
		}
	}

	activity.GetLogger(ctx).Info("Found expired sessions", "count", len(expired))
	return expired, nil
}

func (a *Activities) DestroySandbox(ctx context.Context, sandboxID, namespace string) error {
	vclusterName := fmt.Sprintf("vc-%s", sandboxID)

	config := vcluster.VClusterConfig{
		Name:      vclusterName,
		Namespace: namespace,
	}

	provisioner := vcluster.NewProvisioner(a.k8sClient, config)
	if err := provisioner.Delete(ctx); err != nil {
		return fmt.Errorf("destroy sandbox %s: %w", sandboxID, err)
	}

	activity.GetLogger(ctx).Info("Sandbox destroyed", "sandboxID", sandboxID)
	return nil
}

func (a *Activities) MarkSessionCleaned(ctx context.Context, sessionID string) error {
	activity.GetLogger(ctx).Info("Session marked as cleaned", "sessionID", sessionID)
	return nil
}

func (a *Activities) RunValidation(ctx context.Context, input GradeLabInput) (*GradeLabOutput, error) {
	checks := make([]judge.Check, 0, len(input.Checks))
	for _, c := range input.Checks {
		checks = append(checks, judge.Check{
			Type:     judge.CheckType(c.Type),
			SpecJSON: c.SpecJSON,
		})
	}

	engine := a.judgeEngine
	if engine == nil {
		engine = judge.NewEngine(a.k8sClient)
	}

	result, err := engine.Validate(ctx, input.SandboxID, input.QuizID, checks)
	if err != nil {
		return nil, fmt.Errorf("run validation: %w", err)
	}

	output := &GradeLabOutput{
		Passed:    result.Passed,
		Score:     result.Score,
		MaxScore:  result.MaxScore,
		XPAwarded: result.XPAwarded,
		Results:   make([]GradeCheckResult, 0, len(result.Results)),
	}
	for _, r := range result.Results {
		output.Results = append(output.Results, GradeCheckResult{
			CheckName: r.CheckName,
			Passed:    r.Passed,
			Message:   r.Message,
			Points:    r.Points,
		})
	}

	logger := activity.GetLogger(ctx)
	logger.Info("Validation complete",
		"sandboxID", input.SandboxID,
		"quizID", input.QuizID,
		"passed", result.Passed,
		"score", result.Score,
		"maxScore", result.MaxScore,
	)
	return output, nil
}

func (a *Activities) getVClusterEndpoint(ctx context.Context, namespace, vclusterName string) (string, error) {
	service, err := a.k8sClient.Clientset.CoreV1().Services(namespace).Get(ctx, vclusterName, metav1.GetOptions{})
	if err != nil {
		return "", fmt.Errorf("get vcluster service: %w", err)
	}

	if service.Spec.ClusterIP == "" {
		return "", fmt.Errorf("vcluster service has no cluster IP")
	}

	endpoint := fmt.Sprintf("https://%s:443", service.Spec.ClusterIP)
	return endpoint, nil
}
