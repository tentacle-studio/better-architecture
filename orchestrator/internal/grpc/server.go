package grpc

import (
	"context"
	"fmt"
	"io"
	"log"

	pb "github.com/tentacle-studio/better-architecture/orchestrator/internal/grpc/proto"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/judge"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/sandbox"
	appsv1 "k8s.io/api/apps/v1"
	corev1 "k8s.io/api/core/v1"
	"k8s.io/apimachinery/pkg/api/meta"
	metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
	"k8s.io/apimachinery/pkg/runtime"
	"k8s.io/apimachinery/pkg/watch"
)

type Server struct {
	pb.UnimplementedOrchestratorServer
	sandboxManager *sandbox.Manager
	judgeEngine    *judge.Engine
}

func NewServer(sandboxManager *sandbox.Manager, judgeEngine *judge.Engine) *Server {
	return &Server{
		sandboxManager: sandboxManager,
		judgeEngine:    judgeEngine,
	}
}

func (s *Server) CreateSandbox(ctx context.Context, req *pb.CreateSandboxRequest) (*pb.CreateSandboxResponse, error) {
	log.Printf("Creating sandbox for user %s, quiz %s", req.UserId, req.QuizId)

	sb, err := s.sandboxManager.CreateSandbox(ctx, req.UserId, req.QuizId, req.SeedManifest)
	if err != nil {
		return nil, fmt.Errorf("failed to create sandbox: %w", err)
	}

	return &pb.CreateSandboxResponse{
		SandboxId:        sb.ID,
		VclusterEndpoint: sb.VClusterEndpoint,
		Kubeconfig:       sb.Kubeconfig,
	}, nil
}

func (s *Server) DestroySandbox(ctx context.Context, req *pb.DestroySandboxRequest) (*pb.Empty, error) {
	log.Printf("Destroying sandbox %s", req.SandboxId)

	if err := s.sandboxManager.DestroySandbox(ctx, req.SandboxId); err != nil {
		return nil, fmt.Errorf("failed to destroy sandbox: %w", err)
	}

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

	in, err := stream.Recv()
	if err != nil {
		return fmt.Errorf("failed to receive initial message: %w", err)
	}

	if in.SandboxId == "" {
		return fmt.Errorf("sandbox_id is required in first message")
	}

	sandboxID := in.SandboxId
	log.Printf("Exec stream for sandbox: %s", sandboxID)

	sb, err := s.sandboxManager.GetSandbox(sandboxID)
	if err != nil {
		return fmt.Errorf("failed to get sandbox: %w", err)
	}

	if sb.State != "ready" {
		return fmt.Errorf("sandbox is not ready (state: %s)", sb.State)
	}

	k8sClient := s.sandboxManager.GetK8sClient()
	pods, err := k8sClient.Clientset.CoreV1().Pods(sb.Namespace).List(
		stream.Context(),
		metav1.ListOptions{
			LabelSelector: "app=workload",
			Limit:         1,
		},
	)
	if err != nil {
		return fmt.Errorf("failed to list pods: %w", err)
	}

	if len(pods.Items) == 0 {
		return fmt.Errorf("no workload pods found in sandbox")
	}

	targetPod := pods.Items[0]
	containerName := ""
	if len(targetPod.Spec.Containers) > 0 {
		containerName = targetPod.Spec.Containers[0].Name
	}

	log.Printf("Executing in pod %s, container %s", targetPod.Name, containerName)

	stdinReader := NewStdinReader(stream)
	stdoutWriter := NewStdoutWriter(stream)
	stderrWriter := NewStderrWriter(stream)
	resizeQueue := NewTerminalSizeQueue()

	defer stdinReader.Close()
	defer resizeQueue.Close()

	go func() {
		for {
			msg, err := stream.Recv()
			if err != nil {
				if err != io.EOF {
					log.Printf("Error receiving from stream: %v", err)
				}
				return
			}

			if msg.Resize != nil {
				resizeQueue.Resize(msg.Resize.Width, msg.Resize.Height)
			}
		}
	}()

	execOpts := k8s.ExecOptions{
		Namespace:     sb.Namespace,
		PodName:       targetPod.Name,
		ContainerName: containerName,
		Command:       []string{"/bin/sh"},
		Stdin:         stdinReader,
		Stdout:        stdoutWriter,
		Stderr:        stderrWriter,
		TTY:           true,
	}

	err = k8sClient.ExecWithResize(stream.Context(), execOpts, resizeQueue)
	if err != nil {
		log.Printf("Exec failed: %v", err)
		return fmt.Errorf("exec failed: %w", err)
	}

	return nil
}

func (s *Server) ValidateQuiz(ctx context.Context, req *pb.ValidateQuizRequest) (*pb.ValidateQuizResponse, error) {
	log.Printf("Validating quiz %s for sandbox %s", req.QuizId, req.SandboxId)

	checks := make([]judge.Check, len(req.Checks))
	for i, c := range req.Checks {
		checks[i] = judge.Check{
			Type:     judge.CheckType(c.Type.String()),
			SpecJSON: c.SpecJson,
		}
	}

	result, err := s.judgeEngine.Validate(ctx, req.SandboxId, req.QuizId, checks)
	if err != nil {
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

	k8sClient := s.sandboxManager.GetK8sClient()
	ctx := stream.Context()

	podWatcher, err := k8sClient.Clientset.CoreV1().Pods(sb.Namespace).Watch(ctx, metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to create pod watcher: %w", err)
	}
	defer podWatcher.Stop()

	serviceWatcher, err := k8sClient.Clientset.CoreV1().Services(sb.Namespace).Watch(ctx, metav1.ListOptions{})
	if err != nil {
		return fmt.Errorf("failed to create service watcher: %w", err)
	}
	defer serviceWatcher.Stop()

	deploymentWatcher, err := k8sClient.Clientset.AppsV1().Deployments(sb.Namespace).Watch(ctx, metav1.ListOptions{})
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

func (s *Server) sendResourceEvent(stream pb.Orchestrator_WatchResourcesServer, kind string, event watch.Event) error {
	obj := event.Object

	metadata, err := meta.Accessor(obj)
	if err != nil {
		log.Printf("Failed to get metadata: %v", err)
		return nil
	}

	status := s.extractStatus(obj, kind)

	jsonPatch := "{}"
	if event.Type == watch.Modified {
		jsonPatch = fmt.Sprintf(`{"type":"%s"}`, event.Type)
	}

	resourceEvent := &pb.ResourceEvent{
		Kind:      kind,
		Name:      metadata.GetName(),
		Namespace: metadata.GetNamespace(),
		Status:    status,
		JsonPatch: jsonPatch,
	}

	if err := stream.Send(resourceEvent); err != nil {
		return fmt.Errorf("failed to send resource event: %w", err)
	}

	return nil
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
