package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/config"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/workflow"
)

func main() {
	cfg := config.Load()

	k8sClient, err := k8s.NewClient(cfg.KubeConfigPath)
	if err != nil {
		log.Fatalf("Failed to create k8s client: %v", err)
	}

	workerConfig := workflow.WorkerConfig{
		TemporalHost:         cfg.TemporalHost,
		TemporalNamespace:    cfg.TemporalNamespace,
		TaskQueue:            cfg.TemporalTaskQueue,
		K8sClient:            k8sClient,
		TesterPodCIDR:        cfg.TesterPodCIDR,
		VClusterChartRepo:    cfg.VClusterChartRepo,
		VClusterChartVersion: cfg.VClusterChartVersion,
	}

	worker, err := workflow.NewWorker(workerConfig)
	if err != nil {
		log.Fatalf("Failed to create worker: %v", err)
	}

	ctx := context.Background()
	if err := workflow.StartCleanupSchedule(ctx, worker.GetClient(), cfg.SandboxTTL); err != nil {
		log.Printf("Warning: Failed to create cleanup schedule: %v", err)
	}

	if err := worker.Start(); err != nil {
		log.Fatalf("Failed to start worker: %v", err)
	}

	fmt.Println("Temporal worker started successfully")
	fmt.Printf("  Host: %s\n", cfg.TemporalHost)
	fmt.Printf("  Namespace: %s\n", cfg.TemporalNamespace)
	fmt.Printf("  Task Queue: %s\n", cfg.TemporalTaskQueue)

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	fmt.Println("\nShutting down worker...")
	worker.Stop()

	time.Sleep(1 * time.Second)
	fmt.Println("Worker stopped")
}
