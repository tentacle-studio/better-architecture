package grpc

import (
	"context"
	"fmt"
	"io"
	"log"

	pb "github.com/tentacle-studio/better-architecture/orchestrator/internal/grpc/proto"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/judge"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/sandbox"
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

	for {
		in, err := stream.Recv()
		if err == io.EOF {
			return nil
		}
		if err != nil {
			return fmt.Errorf("failed to receive exec input: %w", err)
		}

		if in.Resize != nil {
			log.Printf("Terminal resize: %dx%d", in.Resize.Width, in.Resize.Height)
		}

		if len(in.Stdin) > 0 {
			log.Printf("Received stdin: %d bytes", len(in.Stdin))
		}

		if err := stream.Send(&pb.ExecOutput{
			Stdout: []byte("not implemented\n"),
		}); err != nil {
			return fmt.Errorf("failed to send exec output: %w", err)
		}
	}
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

	event := &pb.ResourceEvent{
		Kind:      "Pod",
		Name:      "example-pod",
		Namespace: "default",
		Status:    "Running",
		JsonPatch: "{}",
	}

	if err := stream.Send(event); err != nil {
		return fmt.Errorf("failed to send resource event: %w", err)
	}

	return nil
}
