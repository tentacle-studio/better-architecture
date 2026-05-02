package integration

import (
	"context"
	"testing"

	"github.com/tentacle-studio/better-architecture/orchestrator/internal/k8s"
	"github.com/tentacle-studio/better-architecture/orchestrator/internal/sandbox"
)

func TestSeedManifestApplication(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping integration test in short mode")
	}

	k8sClient, err := k8s.NewClient("")
	if err != nil {
		t.Fatalf("Failed to create k8s client: %v", err)
	}

	seeder, err := sandbox.NewSeeder(k8sClient.GetConfig())
	if err != nil {
		t.Fatalf("Failed to create seeder: %v", err)
	}

	ctx := context.Background()
	testNamespace := "test-seed-ns"

	manifest := `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test-config
data:
  key: value
---
apiVersion: v1
kind: Service
metadata:
  name: test-service
spec:
  selector:
    app: test
  ports:
  - port: 80
    targetPort: 8080
`

	t.Run("ApplyManifest", func(t *testing.T) {
		err := seeder.ApplyManifest(ctx, testNamespace, manifest)
		if err != nil {
			t.Fatalf("Failed to apply manifest: %v", err)
		}

		t.Logf("Successfully applied manifest to namespace %s", testNamespace)
	})
}
