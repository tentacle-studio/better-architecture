package grpc

import (
	"context"
	"encoding/base64"
	"fmt"
	"log"
	"net"
	"os"
	"os/exec"
	"sync"
	"time"

	pb "github.com/tentacle-studio/better-architecture/orchestrator/internal/grpc/proto"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/judge"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/sandbox"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/telemetry"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/workflow"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.temporal.io/sdk/client"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/watch"
)

type termSession struct {
	conn   net.Conn
	pf     *exec.Cmd
	readMu sync.Mutex
}

type Server struct {
	pb.UnimplementedOrchestratorServer
	sandboxManager    *sandbox.Manager
	judgeEngine       *judge.Engine
	temporalClient    client.Client
	temporalTaskQueue string
	sandboxTTL        time.Duration
	termMu            sync.Mutex
	termSessions      map[string]*termSession
}

func NewServer(sandboxManager *sandbox.Manager, judgeEngine *judge.Engine, temporalClient client.Client, taskQueue string, ttl time.Duration) *Server {
	if temporalClient == nil {
		panic("temporal client is required")
	}

	return &Server{
		sandboxManager:    sandboxManager,
		judgeEngine:       judgeEngine,
		temporalClient:    temporalClient,
		temporalTaskQueue: taskQueue,
		sandboxTTL:        ttl,
		termSessions:      make(map[string]*termSession),
	}
}

func (s *Server) getOrCreateTermSession(sandboxID, namespace, kubeconfigPath string, stream pb.Orchestrator_ExecStreamServer) (*termSession, error) {
	s.termMu.Lock()
	defer s.termMu.Unlock()

	if ts, ok := s.termSessions[sandboxID]; ok {
		if ts.conn != nil {
			return ts, nil
		}
		delete(s.termSessions, sandboxID)
	}

	// Wait for shell pod to be Ready in vcluster (readiness probe checks port 8080)
	// Use kubectl with the vcluster kubeconfig to check pod readiness
	// With pre-built lab-shell image, this should be very fast (5-10 seconds)
	log.Printf("Waiting for shell pod to be Ready in sandbox %s...", sandboxID)
	for i := 0; i < 40; i++ {
		checkCmd := exec.Command("kubectl", "get", "pod", "shell", "-n", namespace, "-o", "jsonpath={.status.conditions[?(@.type=='Ready')].status}")
		checkCmd.Env = append(os.Environ(), "KUBECONFIG="+kubeconfigPath)
		output, checkErr := checkCmd.Output()
		if checkErr == nil && string(output) == "True" {
			log.Printf("Shell pod is Ready in sandbox %s", sandboxID)
			break
		}
		if i == 39 {
			return nil, fmt.Errorf("timed out waiting for shell pod to be Ready")
		}
		if i%10 == 0 && i > 0 {
			log.Printf("Still waiting for shell pod readiness (attempt %d/40)...", i)
		}
		s.termMu.Unlock()
		time.Sleep(2 * time.Second)
		s.termMu.Lock()
	}

	// Get a free local port
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		return nil, fmt.Errorf("failed to get free port: %w", err)
	}
	localPort := listener.Addr().(*net.TCPAddr).Port
	listener.Close()

	log.Printf("Starting port-forward for sandbox %s on local port %d", sandboxID, localPort)
	pf := exec.Command(
		"kubectl", "port-forward",
		"pod/shell", fmt.Sprintf("%d:8080", localPort),
		"-n", namespace,
	)
	pf.Env = append(os.Environ(), "KUBECONFIG="+kubeconfigPath)
	pf.Stderr = os.Stderr
	if err := pf.Start(); err != nil {
		return nil, fmt.Errorf("failed to start port-forward: %w", err)
	}

	// Retry connection for up to 20 seconds (port-forward setup time)
	var conn net.Conn
	for i := 0; i < 40; i++ {
		time.Sleep(500 * time.Millisecond)
		c, dialErr := net.Dial("tcp", fmt.Sprintf("127.0.0.1:%d", localPort))
		if dialErr == nil {
			conn = c
			log.Printf("Successfully connected to shell pod for sandbox %s", sandboxID)
			break
		}
		if i%10 == 0 && i > 0 {
			log.Printf("Still waiting for port-forward connection (attempt %d/40)...", i)
		}
	}
	if conn == nil {
		pf.Process.Kill()
		return nil, fmt.Errorf("timed out waiting for port-forward to be ready after 20 seconds")
	}

	ts := &termSession{conn: conn, pf: pf}
	s.termSessions[sandboxID] = ts
	return ts, nil
}

func (s *Server) CreateSandbox(ctx context.Context, req *pb.CreateSandboxRequest) (*pb.CreateSandboxResponse, error) {
	log.Printf("Creating sandbox for user %s, quiz %s", req.UserId, req.QuizId)
	startedAt := time.Now()
	ctx, span := otel.Tracer("orchestrator").Start(ctx, "temporal.workflow.setup_lab")
	span.SetAttributes(
		attribute.String("user.id", req.UserId),
		attribute.String("quiz.id", req.QuizId),
	)
	status := "success"
	defer func() {
		telemetry.RecordSandboxProvisionDuration(ctx, req.QuizId, status, time.Since(startedAt).Seconds())
		span.End()
	}()

	workflowID := fmt.Sprintf("setup-lab-%s-%s-%d", req.UserId, req.QuizId, time.Now().Unix())
	workflowOptions := client.StartWorkflowOptions{
		ID:        workflowID,
		TaskQueue: s.temporalTaskQueue,
	}

	input := workflow.SetupLabInput{
		UserID:       req.UserId,
		QuizID:       req.QuizId,
		SeedManifest: req.SeedManifest,
		TTL:          s.sandboxTTL,
	}

	we, err := s.temporalClient.ExecuteWorkflow(ctx, workflowOptions, workflow.SetupLabEnvironment, input)
	if err != nil {
		status = "failed"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, fmt.Errorf("failed to start workflow: %w", err)
	}

	log.Printf("Started workflow %s (RunID: %s)", workflowID, we.GetRunID())

	var result workflow.SetupLabOutput
	if err := we.Get(ctx, &result); err != nil {
		status = "failed"
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, fmt.Errorf("workflow failed: %w", err)
	}

	// Register sandbox in manager so WatchResources and ExecStream can find it
	namespace := fmt.Sprintf("sandbox-%s", result.SandboxID)
	vclusterName := fmt.Sprintf("vc-%s", result.SandboxID)
	sb := &sandbox.Sandbox{
		ID:               result.SandboxID,
		UserID:           req.UserId,
		QuizID:           req.QuizId,
		Namespace:        namespace,
		VClusterName:     vclusterName,
		VClusterEndpoint: result.VClusterEndpoint,
		Kubeconfig:       result.Kubeconfig,
		State:            "ready",
		CreatedAt:        time.Now(),
		ExpiresAt:        time.Now().Add(s.sandboxTTL),
	}

	// Store in sandbox manager's in-memory map
	s.sandboxManager.StoreSandbox(sb)
	telemetry.AddSandboxActive(ctx, 1)

	return &pb.CreateSandboxResponse{
		SandboxId:        result.SandboxID,
		VclusterEndpoint: result.VClusterEndpoint,
		Kubeconfig:       result.Kubeconfig,
		TerminalPodIp:    "",
	}, nil
}

func (s *Server) DestroySandbox(ctx context.Context, req *pb.DestroySandboxRequest) (*pb.Empty, error) {
	log.Printf("Destroying sandbox %s", req.SandboxId)

	if err := s.sandboxManager.DestroySandbox(ctx, req.SandboxId); err != nil {
		return nil, fmt.Errorf("failed to destroy sandbox: %w", err)
	}

	telemetry.AddSandboxActive(ctx, -1)

	return &pb.Empty{}, nil
}

func (s *Server) GetSandboxStatus(ctx context.Context, req *pb.GetSandboxStatusRequest) (*pb.SandboxStatus, error) {
	sb, err := s.sandboxManager.GetSandbox(req.SandboxId)
	if err != nil {
		return nil, fmt.Errorf("failed to get sandbox: %w", err)
	}

	return &pb.SandboxStatus{
		SandboxId:        sb.ID,
		State:            sb.State,
		VclusterEndpoint: sb.VClusterEndpoint,
		CreatedAt:        sb.CreatedAt.Unix(),
		ExpiresAt:        sb.ExpiresAt.Unix(),
	}, nil
}

func (s *Server) ExecStream(stream pb.Orchestrator_ExecStreamServer) error {
	log.Printf("Starting exec stream")
	_, span := otel.Tracer("orchestrator").Start(stream.Context(), "orchestrator.exec.stream")
	defer span.End()

	in, err := stream.Recv()
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return fmt.Errorf("failed to receive initial message: %w", err)
	}

	if in.SandboxId == "" {
		return fmt.Errorf("sandbox_id is required in first message")
	}

	sandboxID := in.SandboxId
	span.SetAttributes(attribute.String("sandbox.id", sandboxID))
	log.Printf("Exec stream for sandbox: %s", sandboxID)

	sb, err := s.sandboxManager.GetSandbox(sandboxID)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return fmt.Errorf("failed to get sandbox: %w", err)
	}

	if sb.State != "ready" {
		return fmt.Errorf("sandbox is not ready (state: %s)", sb.State)
	}

	// Decode vcluster kubeconfig and write to temp file for kubectl port-forward
	kubeconfigBytes, err := base64.StdEncoding.DecodeString(sb.Kubeconfig)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return fmt.Errorf("failed to decode vcluster kubeconfig: %w", err)
	}

	tmpFile, err := os.CreateTemp("", "vcluster-kubeconfig-*.yaml")
	if err != nil {
		return fmt.Errorf("failed to create temp kubeconfig file: %w", err)
	}
	defer os.Remove(tmpFile.Name())

	if _, err := tmpFile.Write(kubeconfigBytes); err != nil {
		return fmt.Errorf("failed to write temp kubeconfig: %w", err)
	}
	tmpFile.Close()

	// Shell pod is now in vcluster's default namespace
	ts, err := s.getOrCreateTermSession(sandboxID, "default", tmpFile.Name(), stream)
	if err != nil {
		return fmt.Errorf("failed to get terminal session: %w", err)
	}

	stdoutWriter := NewStdoutWriter(stream)

	// Pump stdin from gRPC stream → socat TCP conn
	go func() {
		for {
			msg, recvErr := stream.Recv()
			if recvErr != nil {
				return
			}
			if len(msg.Stdin) > 0 {
				ts.conn.Write(msg.Stdin)
			}
		}
	}()

	// Pump socat output → gRPC stdout (only one stream reads at a time)
	ts.readMu.Lock()
	defer ts.readMu.Unlock()
	log.Printf("Starting exec session for sandbox %s via port-forward+socat", sandboxID)
	buf := make([]byte, 4096)
	for {
		n, readErr := ts.conn.Read(buf)
		if n > 0 {
			if _, writeErr := stdoutWriter.Write(buf[:n]); writeErr != nil {
				break
			}
		}
		if readErr != nil {
			// Connection broken — remove from cache so next call reconnects
			s.termMu.Lock()
			if s.termSessions[sandboxID] == ts {
				delete(s.termSessions, sandboxID)
				ts.pf.Process.Kill()
			}
			s.termMu.Unlock()
			break
		}
	}
	log.Printf("Exec session ended for sandbox %s", sandboxID)
	return nil
}

func (s *Server) ValidateQuiz(ctx context.Context, req *pb.ValidateQuizRequest) (*pb.ValidateQuizResponse, error) {
	log.Printf("Validating quiz %s for sandbox %s", req.QuizId, req.SandboxId)
	ctx, span := otel.Tracer("orchestrator").Start(ctx, "judge.validate")
	defer span.End()
	span.SetAttributes(
		attribute.String("sandbox.id", req.SandboxId),
		attribute.String("quiz.id", req.QuizId),
	)

	checks := make([]judge.Check, len(req.Checks))
	for i, c := range req.Checks {
		checks[i] = judge.Check{
			Type:     judge.CheckType(c.Type.String()),
			SpecJSON: c.SpecJson,
		}
	}

	result, err := s.judgeEngine.Validate(ctx, req.SandboxId, req.QuizId, checks)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, fmt.Errorf("failed to validate quiz: %w", err)
	}

	pbResults := make([]*pb.CheckResult, len(result.Results))
	for i, r := range result.Results {
		pbResults[i] = &pb.CheckResult{
			CheckName: r.CheckName,
			Passed:    r.Passed,
			Message:   r.Message,
			Points:    r.Points,
		}
	}

	return &pb.ValidateQuizResponse{
		Passed:  result.Passed,
		Results: pbResults,
		Score:   result.Score,
	}, nil
}

func (s *Server) WatchResources(req *pb.WatchResourcesRequest, stream pb.Orchestrator_WatchResourcesServer) error {
	log.Printf("Starting resource watch for sandbox %s", req.SandboxId)

	sb, err := s.sandboxManager.GetSandbox(req.SandboxId)
	if err != nil {
		return fmt.Errorf("failed to get sandbox: %w", err)
	}

	// Create a K8s client for the vCluster using its kubeconfig
	k8sClient, err := k8s.NewClientFromKubeconfig(sb.Kubeconfig)
	if err != nil {
		return fmt.Errorf("failed to create vcluster client: %w", err)
	}

	ctx := stream.Context()

	// Watch resources in the default namespace inside the vCluster
	namespace := "default"
	log.Printf("Watching resources in vCluster namespace: %s", namespace)

	// Send initial state before watching
	if err := s.sendInitialResources(stream, ctx, k8sClient, namespace); err != nil {
		return fmt.Errorf("failed to send initial resources: %w", err)
	}
	log.Printf("Initial resources sent for sandbox %s", req.SandboxId)

	podWatcher, err := k8sClient.Clientset.CoreV1().Pods(namespace).Watch(ctx, metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to create pod watcher: %w", err)
	}
	defer podWatcher.Stop()

	serviceWatcher, err := k8sClient.Clientset.CoreV1().Services(namespace).Watch(ctx, metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to create service watcher: %w", err)
	}
	defer serviceWatcher.Stop()

	deploymentWatcher, err := k8sClient.Clientset.AppsV1().Deployments(namespace).Watch(ctx, metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to create deployment watcher: %w", err)
	}
	defer deploymentWatcher.Stop()

	for {
		select {
		case <-ctx.Done():
			log.Printf("Resource watch cancelled for sandbox %s", req.SandboxId)
			return nil

		case event, ok := <-podWatcher.ResultChan():
			if !ok {
				return fmt.Errorf("pod watch channel closed")
			}
			if err := s.sendResourceEvent(stream, "Pod", event); err != nil {
				return err
			}

		case event, ok := <-serviceWatcher.ResultChan():
			if !ok {
				return fmt.Errorf("service watch channel closed")
			}
			if err := s.sendResourceEvent(stream, "Service", event); err != nil {
				return err
			}

		case event, ok := <-deploymentWatcher.ResultChan():
			if !ok {
				return fmt.Errorf("deployment watch channel closed")
			}
			if err := s.sendResourceEvent(stream, "Deployment", event); err != nil {
				return err
			}
		}
	}
}

func (s *Server) sendInitialResources(stream pb.Orchestrator_WatchResourcesServer, ctx context.Context, k8sClient *k8s.Client, namespace string) error {
	// List and send all existing pods
	pods, err := k8sClient.Clientset.CoreV1().Pods(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		for i := range pods.Items {
			event := watch.Event{
				Type:   watch.Added,
				Object: &pods.Items[i],
			}
			if err := s.sendResourceEvent(stream, "Pod", event); err != nil {
				return err
			}
		}
	}

	// List and send all existing services
	services, err := k8sClient.Clientset.CoreV1().Services(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		for i := range services.Items {
			obj := runtime.Object(&services.Items[i])
			event := watch.Event{
				Type:   watch.Added,
				Object: obj,
			}
			if err := s.sendResourceEvent(stream, "Service", event); err != nil {
				return err
			}
		}
	}

	// List and send all existing deployments
	deployments, err := k8sClient.Clientset.AppsV1().Deployments(namespace).List(ctx, metav1.ListOptions{})
	if err == nil {
		for i := range deployments.Items {
			obj := runtime.Object(&deployments.Items[i])
			event := watch.Event{
				Type:   watch.Added,
				Object: obj,
			}
			if err := s.sendResourceEvent(stream, "Deployment", event); err != nil {
				return err
			}
		}
	}

	return nil
}

func (s *Server) sendResourceEvent(stream pb.Orchestrator_WatchResourcesServer, kind string, event watch.Event) error {
	obj := event.Object

	metadata, err := meta.Accessor(obj)
	if err != nil {
		log.Printf("Failed to get metadata: %v", err)
		return nil
	}

	status := s.extractStatus(obj, kind)
	eventType := string(event.Type)

	is := &pb.ResourceEvent{
		Kind:      kind,
		Name:      metadata.GetName(),
		Namespace: metadata.GetNamespace(),
		Status:    status,
		JsonPatch: fmt.Sprintf(`{"type":"%s"}`, eventType),
		EventType: eventType,
	}

	// Extract pod-specific details
	if pod, ok := obj.(*corev1.Pod); ok {
		is.ReadyContainers = int32(countReadyContainers(pod))
		is.TotalContainers = int32(len(pod.Spec.Containers))
		is.RestartCount = s.getPodRestartCount(pod)
		is.Conditions = s.getPodConditions(pod)
	}

	if err := stream.Send(is); err != nil {
		return fmt.Errorf("failed to send resource event: %w", err)
	}

	return nil
}

func countReadyContainers(pod *corev1.Pod) int {
	count := 0
	for _, status := range pod.Status.ContainerStatuses {
		if status.Ready {
			count++
		}
	}
	return count
}

func (s *Server) getPodRestartCount(pod *corev1.Pod) int32 {
	var total int32
	for _, status := range pod.Status.ContainerStatuses {
		total += status.RestartCount
	}
	return total
}

func (s *Server) getPodConditions(pod *corev1.Pod) []string {
	var conditions []string
	for _, cond := range pod.Status.Conditions {
		if cond.Status == corev1.ConditionTrue {
			conditions = append(conditions, string(cond.Type))
		}
	}
	return conditions
}

func (s *Server) extractStatus(obj runtime.Object, kind string) string {
	switch kind {
	case "Pod":
		if pod, ok := obj.(*corev1.Pod); ok {
			return string(pod.Status.Phase)
		}
	case "Service":
		return "Active"
	case "Deployment":
		if deployment, ok := obj.(*appsv1.Deployment); ok {
			if deployment.Status.ReadyReplicas == deployment.Status.Replicas {
				return "Ready"
			}
			return "Progressing"
		}
	}
	return "Unknown"
}
