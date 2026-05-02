package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/config"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/events"
	grpcserver "github.com/tentacle-studio/better-architecture/orchestrator/internal/grpc"
	pb "github.com/tentacle-studio/better-architecture/orchestrator/internal/grpc/proto"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/judge"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/sandbox"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/telemetry"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
)

func main() {
	log.Println("Starting orchestrator service...")

	cfg := config.Load()
	log.Printf("Loaded configuration: gRPC port=%s", cfg.GRPCPort)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	tp, err := telemetry.InitTracing(ctx, "orchestrator", cfg.OTelEndpoint)
	if err != nil {
		log.Printf("Warning: Failed to initialize tracing: %v", err)
	} else {
		defer func() {
			if err := telemetry.Shutdown(context.Background(), tp); err != nil {
				log.Printf("Error shutting down tracer provider: %v", err)
			}
		}()
		log.Println("OpenTelemetry tracing initialized")
	}

	if err := telemetry.InitMetrics(); err != nil {
		log.Printf("Warning: Failed to initialize metrics: %v", err)
	} else {
		log.Println("OpenTelemetry metrics initialized")
	}

	k8sClient, err := k8s.NewClient(cfg.KubeConfigPath)
	if err != nil {
		log.Fatalf("Failed to create k8s client: %v", err)
	}
	log.Println("Kubernetes client initialized")

	var eventPublisher *events.Publisher
	if cfg.NATSUrl != "" {
		eventPublisher, err = events.NewPublisher(cfg.NATSUrl)
		if err != nil {
			log.Printf("Warning: Failed to connect to NATS: %v", err)
		} else {
			defer eventPublisher.Close()
			log.Printf("NATS publisher connected to %s", cfg.NATSUrl)
		}
	}

	sandboxManager := sandbox.NewManager(
		k8sClient,
		cfg.SandboxTTL,
		cfg.TesterPodCIDR,
		cfg.VClusterChartRepo,
		cfg.VClusterChartVersion,
	)
	log.Println("Sandbox manager initialized")

	judgeEngine := judge.NewEngine(k8sClient)
	log.Println("Judge engine initialized")

	grpcServer := grpcserver.NewServer(sandboxManager, judgeEngine)
	log.Println("gRPC server initialized")

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", cfg.GRPCPort))
	if err != nil {
		log.Fatalf("Failed to listen: %v", err)
	}

	s := grpc.NewServer()
	pb.RegisterOrchestratorServer(s, grpcServer)
	reflection.Register(s)

	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		<-sigChan
		log.Println("Received shutdown signal, gracefully stopping...")
		s.GracefulStop()
		cancel()
	}()

	log.Printf("Orchestrator gRPC server listening on :%s", cfg.GRPCPort)
	if err := s.Serve(lis); err != nil {
		log.Fatalf("Failed to serve: %v", err)
	}

	time.Sleep(100 * time.Millisecond)
	log.Println("Orchestrator service stopped")
}
