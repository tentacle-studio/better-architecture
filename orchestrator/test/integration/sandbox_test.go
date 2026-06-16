package integration

import (
	"context"
	"testing"
	"time"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/sandbox"
)

func TestSandboxLifecycle(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	k8sClient, err := k8s.NewClient("")
	if err != nil {
		t.Fatalf("Failed to create k8s client: %v", err)
	}

	manager := sandbox.NewManager(
		k8sClient,
		2*time.Hour,
		"10.244.0.0/16",
		"https://charts.loft.sh",
		"0.19.0",
	)

	ctx := context.Background()

	t.Run("CreateSandbox", func(t *testing.T) {
		sb, err := manager.CreateSandbox(ctx, "test-user", "test-quiz", "")
		if err != nil {
			t.Fatalf("Failed to create sandbox: %v", err)
		}

		if sb.ID == "" {
			t.Error("Sandbox ID should not be empty")
		}

		if sb.Namespace == "" {
			t.Error("Sandbox namespace should not be empty")
		}

		t.Logf("Created sandbox: %s in namespace %s", sb.ID, sb.Namespace)

		t.Cleanup(func() {
			if err := manager.DestroySandbox(ctx, sb.ID); err != nil {
				t.Logf("Warning: Failed to cleanup sandbox: %v", err)
			}
		})
	})

	t.Run("GetSandbox", func(t *testing.T) {
		sb, err := manager.CreateSandbox(ctx, "test-user", "test-quiz", "")
		if err != nil {
			t.Fatalf("Failed to create sandbox: %v", err)
		}

		defer manager.DestroySandbox(ctx, sb.ID)

		retrieved, err := manager.GetSandbox(sb.ID)
		if err != nil {
			t.Fatalf("Failed to get sandbox: %v", err)
		}

		if retrieved.ID != sb.ID {
			t.Errorf("Expected sandbox ID %s, got %s", sb.ID, retrieved.ID)
		}
	})

	t.Run("DestroySandbox", func(t *testing.T) {
		sb, err := manager.CreateSandbox(ctx, "test-user", "test-quiz", "")
		if err != nil {
			t.Fatalf("Failed to create sandbox: %v", err)
		}

		if err := manager.DestroySandbox(ctx, sb.ID); err != nil {
			t.Fatalf("Failed to destroy sandbox: %v", err)
		}

		_, err = manager.GetSandbox(sb.ID)
		if err == nil {
			t.Error("Expected error when getting destroyed sandbox")
		}
	})
}
