package sandbox

import (
	"context"
	"encoding/base64"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/vcluster"
	corev1 "k8s.io/api/core/v1"
	rbacv1 "k8s.io/api/rbac/v1"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/util/intstr"
)

type Manager struct {
	k8sClient            *k8s.Client
	sandboxes            map[string]*Sandbox
	mu                   sync.RWMutex
	ttl                  time.Duration
	testerPodCIDR        string
	vclusterChartRepo    string
	vclusterChartVersion string
}

type Sandbox struct {
	ID               string
	UserID           string
	QuizID           string
	Namespace        string
	VClusterName     string
	VClusterEndpoint string
	Kubeconfig       string
	TerminalPodIP    string
	State            string
	CreatedAt        time.Time
	ExpiresAt        time.Time
}

func (m *Manager) K8sClient() *k8s.Client {
	return m.k8sClient
}

func NewManager(k8sClient *k8s.Client, ttl time.Duration, testerPodCIDR, chartRepo, chartVersion string) *Manager {
	return &Manager{
		k8sClient:            k8sClient,
		sandboxes:            make(map[string]*Sandbox),
		ttl:                  ttl,
		testerPodCIDR:        testerPodCIDR,
		vclusterChartRepo:    chartRepo,
		vclusterChartVersion: chartVersion,
	}
}

func (m *Manager) CreateSandbox(ctx context.Context, userID, quizID, seedManifest string) (*Sandbox, error) {
	sandboxID := uuid.New().String()[:8]
	namespace := fmt.Sprintf("sandbox-%s", sandboxID)
	vclusterName := fmt.Sprintf("vc-%s", sandboxID)

	sandbox := &Sandbox{
		ID:           sandboxID,
		UserID:       userID,
		QuizID:       quizID,
		Namespace:    namespace,
		VClusterName: vclusterName,
		State:        vcluster.StateCreating,
		CreatedAt:    time.Now(),
		ExpiresAt:    time.Now().Add(m.ttl),
	}

	m.mu.Lock()
	m.sandboxes[sandboxID] = sandbox
	m.mu.Unlock()

	config := vcluster.VClusterConfig{
		Name:              vclusterName,
		Namespace:         namespace,
		ChartRepo:         m.vclusterChartRepo,
		ChartVersion:      m.vclusterChartVersion,
		NetworkPolicyCIDR: m.testerPodCIDR,
	}

	provisioner := vcluster.NewProvisioner(m.k8sClient, config)
	status, err := provisioner.Create(ctx)
	if err != nil {
		sandbox.State = vcluster.StateFailed
		return sandbox, fmt.Errorf("failed to create vcluster: %w", err)
	}

	sandbox.State = status.State
	sandbox.VClusterEndpoint = status.Endpoint

	kubeconfig, err := m.k8sClient.CreateVClusterKubeconfig(ctx, namespace, vclusterName)
	if err != nil {
		return sandbox, fmt.Errorf("failed to create kubeconfig: %w", err)
	}
	sandbox.Kubeconfig = kubeconfig

	// Create a client for the vcluster to deploy resources inside it
	vclusterClient, err := k8s.NewClientFromKubeconfig(kubeconfig)
	if err != nil {
		return sandbox, fmt.Errorf("failed to create vcluster client: %w", err)
	}

	// Setup RBAC for shell pod to allow kubectl operations
	if err := m.setupShellRBAC(ctx, vclusterClient); err != nil {
		return sandbox, fmt.Errorf("failed to setup shell RBAC: %w", err)
	}

	if seedManifest != "" {
		if err := m.applySeedData(ctx, kubeconfig, seedManifest); err != nil {
			return sandbox, fmt.Errorf("failed to apply seed data: %w", err)
		}
	}

	// Create a shell pod inside the vcluster that exposes an interactive PTY shell over TCP via socat.
	// This avoids kubectl exec which requires SPDY to the kubelet (unreachable in OrbStack).
	// Uses custom lab-shell image with kubectl, socat, and dev tools pre-installed.
	pod := &corev1.Pod{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "shell",
			Namespace: "default",
			Labels:    map[string]string{"app": "workload"},
		},
		Spec: corev1.PodSpec{
			ServiceAccountName: "lab-user",
			SecurityContext: &corev1.PodSecurityContext{
				RunAsNonRoot: func() *bool { b := true; return &b }(),
				RunAsUser:    func() *int64 { u := int64(1000); return &u }(),
				FSGroup:      func() *int64 { g := int64(1000); return &g }(),
				SeccompProfile: &corev1.SeccompProfile{
					Type: corev1.SeccompProfileTypeRuntimeDefault,
				},
			},
			Containers: []corev1.Container{{
				Name:  "shell",
				Image: "lab-shell:latest",
				Ports: []corev1.ContainerPort{{
					ContainerPort: 8080,
					Protocol:      corev1.ProtocolTCP,
				}},
				ImagePullPolicy: corev1.PullIfNotPresent,
				SecurityContext: &corev1.SecurityContext{
					AllowPrivilegeEscalation: func() *bool { b := false; return &b }(),
					RunAsNonRoot:             func() *bool { b := true; return &b }(),
					RunAsUser:                func() *int64 { u := int64(1000); return &u }(),
					ReadOnlyRootFilesystem:   func() *bool { b := true; return &b }(),
					Capabilities: &corev1.Capabilities{
						Drop: []corev1.Capability{"ALL"},
					},
				},
				ReadinessProbe: &corev1.Probe{
					ProbeHandler: corev1.ProbeHandler{
						TCPSocket: &corev1.TCPSocketAction{
							Port: intstr.FromInt(8080),
						},
					},
					InitialDelaySeconds: 5,
					PeriodSeconds:       3,
					TimeoutSeconds:      2,
					SuccessThreshold:    1,
					FailureThreshold:    3,
				},
				VolumeMounts: []corev1.VolumeMount{
					{
						Name:      "tmp",
						MountPath: "/tmp",
					},
					{
						Name:      "home",
						MountPath: "/home/user",
					},
				},
			}},
			Volumes: []corev1.Volume{
				{
					Name: "tmp",
					VolumeSource: corev1.VolumeSource{
						EmptyDir: &corev1.EmptyDirVolumeSource{},
					},
				},
				{
					Name: "home",
					VolumeSource: corev1.VolumeSource{
						EmptyDir: &corev1.EmptyDirVolumeSource{},
					},
				},
			},
		},
	}
	if _, err := vclusterClient.Clientset.CoreV1().Pods("default").Create(ctx, pod, metav1.CreateOptions{}); err != nil {
		return sandbox, fmt.Errorf("failed to create shell pod in vcluster: %w", err)
	}

	return sandbox, nil
}

func (m *Manager) DestroySandbox(ctx context.Context, sandboxID string) error {
	m.mu.RLock()
	sandbox, exists := m.sandboxes[sandboxID]
	m.mu.RUnlock()

	if !exists {
		return fmt.Errorf("sandbox %s not found", sandboxID)
	}

	sandbox.State = vcluster.StateDestroying

	config := vcluster.VClusterConfig{
		Name:      sandbox.VClusterName,
		Namespace: sandbox.Namespace,
	}

	provisioner := vcluster.NewProvisioner(m.k8sClient, config)
	if err := provisioner.Delete(ctx); err != nil {
		return fmt.Errorf("failed to delete vcluster: %w", err)
	}

	m.mu.Lock()
	delete(m.sandboxes, sandboxID)
	m.mu.Unlock()

	return nil
}

func (m *Manager) GetSandbox(sandboxID string) (*Sandbox, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sandbox, exists := m.sandboxes[sandboxID]
	if !exists {
		return nil, fmt.Errorf("sandbox %s not found", sandboxID)
	}

	return sandbox, nil
}

func (m *Manager) StoreSandbox(sandbox *Sandbox) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.sandboxes[sandbox.ID] = sandbox
}

func (m *Manager) GetK8sClient() *k8s.Client {
	return m.k8sClient
}

func (m *Manager) applySeedData(ctx context.Context, vclusterKubeconfig, seedManifest string) error {
	manifestBytes, err := base64.StdEncoding.DecodeString(seedManifest)
	if err != nil {
		return fmt.Errorf("failed to decode seed manifest: %w", err)
	}

	// Create a client for the vcluster using the vcluster kubeconfig
	vclusterClient, err := k8s.NewClientFromKubeconfig(vclusterKubeconfig)
	if err != nil {
		return fmt.Errorf("failed to create vcluster client: %w", err)
	}

	seeder, err := NewSeeder(vclusterClient.GetConfig())
	if err != nil {
		return fmt.Errorf("failed to create seeder: %w", err)
	}

	// Apply to default namespace in vcluster (resources will be isolated inside vcluster)
	if err := seeder.ApplyManifest(ctx, "default", string(manifestBytes)); err != nil {
		return fmt.Errorf("failed to apply manifest: %w", err)
	}

	return nil
}

func (m *Manager) setupShellRBAC(ctx context.Context, vclusterClient *k8s.Client) error {
	// Create ServiceAccount for shell pod
	sa := &corev1.ServiceAccount{
		ObjectMeta: metav1.ObjectMeta{
			Name:      "lab-user",
			Namespace: "default",
		},
	}
	if _, err := vclusterClient.Clientset.CoreV1().ServiceAccounts("default").Create(ctx, sa, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create service account: %w", err)
	}

	// Create ClusterRole with full permissions for educational purposes
	clusterRole := &rbacv1.ClusterRole{
		ObjectMeta: metav1.ObjectMeta{
			Name: "lab-user-role",
		},
		Rules: []rbacv1.PolicyRule{
			{
				APIGroups: []string{"*"},
				Resources: []string{"*"},
				Verbs:     []string{"*"},
			},
			{
				NonResourceURLs: []string{"*"},
				Verbs:           []string{"*"},
			},
		},
	}
	if _, err := vclusterClient.Clientset.RbacV1().ClusterRoles().Create(ctx, clusterRole, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create cluster role: %w", err)
	}

	// Create ClusterRoleBinding to bind the role to the service account
	clusterRoleBinding := &rbacv1.ClusterRoleBinding{
		ObjectMeta: metav1.ObjectMeta{
			Name: "lab-user-binding",
		},
		Subjects: []rbacv1.Subject{
			{
				Kind:      "ServiceAccount",
				Name:      "lab-user",
				Namespace: "default",
			},
		},
		RoleRef: rbacv1.RoleRef{
			APIGroup: "rbac.authorization.k8s.io",
			Kind:     "ClusterRole",
			Name:     "lab-user-role",
		},
	}
	if _, err := vclusterClient.Clientset.RbacV1().ClusterRoleBindings().Create(ctx, clusterRoleBinding, metav1.CreateOptions{}); err != nil {
		return fmt.Errorf("failed to create cluster role binding: %w", err)
	}

	return nil
}
