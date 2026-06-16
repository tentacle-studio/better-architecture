# Temporal Workflow Implementation

This package implements resilient Temporal workflows for lab environment provisioning with automatic compensation and cleanup.

## Architecture

### Workflows

#### 1. SetupLabEnvironment
Main workflow for provisioning lab sandboxes with atomic guarantees.

**Input:**
- `UserID`: User identifier
- `QuizID`: Quiz identifier  
- `SeedManifest`: Base64-encoded Kubernetes YAML
- `TTL`: Time-to-live duration (default: 2h)

**Activities (in order):**
1. `CreateNamespace` - Creates isolated K8s namespace
2. `DeployVCluster` - Deploys vCluster via Helm
3. `WaitUntilReady` - Waits for vCluster to be healthy (with heartbeats)
4. `ApplyNetworkPolicies` - Applies network isolation
5. `InitializeSeedData` - Applies seed manifests
6. `VerifyReady` - Final verification and kubeconfig generation

**Output:**
- `SandboxID`: Unique sandbox identifier
- `Kubeconfig`: Base64-encoded kubeconfig
- `VClusterEndpoint`: Internal cluster endpoint

**Error Handling:**
- Each activity has retry policies (3 attempts, exponential backoff)
- On permanent failure: triggers `CompensationWorkflow`
- Heartbeats for long-running activities

#### 2. CompensationWorkflow
Cleanup workflow that runs on `SetupLabEnvironment` failure.

**Activities (best-effort):**
1. `DeleteVCluster` - Removes vCluster Helm release
2. `DeleteNamespace` - Deletes K8s namespace
3. `CleanupNATSSubjects` - Removes NATS subscriptions
4. `UpdateSessionStatus` - Marks session as FAILED in DB

**Behavior:**
- Continues on error (best-effort cleanup)
- Only cleans up resources that were created

#### 3. CleanupExpiredSandboxes
Scheduled cron workflow (runs every 5 minutes).

**Activities:**
1. `ListExpiredSessions` - Queries namespaces with expired TTL
2. For each session:
   - `DestroySandbox` - Full sandbox teardown
   - `MarkSessionCleaned` - Updates DB status

## Activity Timeouts & Retries

| Activity | Timeout | Retry | Heartbeat |
|----------|---------|-------|-----------|
| `CreateNamespace` | 30s | 3x, 5s backoff | — |
| `DeployVCluster` | 120s | 2x, 10s backoff | 15s |
| `WaitUntilReady` | 90s | 3x, 5s backoff | 10s |
| `ApplyNetworkPolicies` | 15s | 3x, 2s backoff | — |
| `InitializeSeedData` | 60s | 2x, 5s backoff | — |
| `VerifyReady` | 30s | 3x, 3s backoff | — |

## Usage

### Starting the Worker

```bash
# Set environment variables
export TEMPORAL_HOST=localhost:7233
export TEMPORAL_NAMESPACE=default
export TEMPORAL_TASK_QUEUE=lab-provisioning

# Run the worker
go run cmd/worker/main.go
```

### Triggering a Workflow

```go
import (
    "go.temporal.io/sdk/client"
    "github.com/tentacle-studio/better-architecture/orchestrator/internal/workflow"
)

// Create Temporal client
c, _ := client.Dial(client.Options{
    HostPort: "localhost:7233",
})
defer c.Close()

// Start workflow
input := workflow.SetupLabInput{
    UserID:       "user123",
    QuizID:       "quiz456",
    SeedManifest: "base64EncodedYAML",
    TTL:          2 * time.Hour,
}

workflowOptions := client.StartWorkflowOptions{
    ID:        "setup-lab-user123-quiz456",
    TaskQueue: "lab-provisioning",
}

we, err := c.ExecuteWorkflow(context.Background(), workflowOptions, workflow.SetupLabEnvironment, input)
if err != nil {
    log.Fatalf("Failed to start workflow: %v", err)
}

// Get result
var result workflow.SetupLabOutput
err = we.Get(context.Background(), &result)
```

## Configuration

Environment variables:

```bash
# Temporal connection
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=lab-provisioning

# K8s configuration
KUBECONFIG=/path/to/kubeconfig
VCLUSTER_CHART_REPO=https://charts.loft.sh
VCLUSTER_CHART_VERSION=0.33.1
TESTER_POD_CIDR=10.244.0.0/16

# Sandbox settings
SANDBOX_TTL=2h
```

## Go Patterns Applied

### Error Handling
- Wrapped errors with context: `fmt.Errorf("create namespace %s: %w", namespace, err)`
- Sentinel errors for specific cases
- Proper error propagation through workflow layers

### Concurrency
- Heartbeats for long-running activities
- Context-aware cancellation
- Graceful shutdown with signal handling

### Interface Design
- Small, focused activity methods
- Clear separation between workflows and activities
- Dependency injection via `WorkerConfig`

### Zero Values
- Default task queue if not specified
- Optional seed manifest handling

### Logging
- Structured logging with Temporal's logger
- Info/Warn levels for different scenarios
- Contextual fields (namespace, sandboxID, etc.)

## Testing

```bash
# Run unit tests
go test ./internal/workflow/...

# Integration tests (requires Temporal server)
go test -tags=integration ./internal/workflow/...
```

## Deployment

### Option 1: Embedded Worker
Run worker in the same process as the orchestrator service.

### Option 2: Standalone Worker
Deploy as separate binary for horizontal scaling:

```bash
docker build -t temporal-worker -f Dockerfile.worker .
kubectl apply -f deploy/worker-deployment.yaml
```

## Monitoring

Temporal UI: http://localhost:8080 (default)

Key metrics to monitor:
- Workflow success/failure rates
- Activity retry counts
- Compensation workflow triggers
- Cleanup schedule execution
