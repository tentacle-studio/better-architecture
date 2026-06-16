# Temporal Workflow Implementation Guide

This document describes the complete implementation of Temporal workflows for resilient lab environment provisioning.

## Overview

The implementation provides three main workflows:
1. **SetupLabEnvironment** - Atomic lab provisioning with automatic rollback
2. **CompensationWorkflow** - Cleanup on failure
3. **CleanupExpiredSandboxes** - Scheduled cleanup (every 5 minutes)

## Architecture Decisions

### Go Patterns Applied

#### 1. Error Handling
- **Wrapped errors with context**: All errors include operation context
  ```go
  return fmt.Errorf("create namespace %s: %w", namespace, err)
  ```
- **Proper error propagation**: Errors flow through workflow layers
- **Best-effort cleanup**: Compensation continues on error

#### 2. Concurrency Patterns
- **Heartbeats**: Long-running activities send heartbeats
- **Context cancellation**: Proper cleanup on timeout/cancellation
- **Graceful shutdown**: Signal handling for worker termination

#### 3. Interface Design
- **Small, focused activities**: Each activity does one thing
- **Accept interfaces, return structs**: Activities return concrete types
- **Dependency injection**: Configuration via `WorkerConfig` struct

#### 4. Zero Values
- **Useful defaults**: Empty task queue defaults to "lab-provisioning"
- **Optional parameters**: Seed manifest can be empty

#### 5. Structured Logging
- **Contextual fields**: All logs include relevant identifiers
- **Appropriate levels**: Info for success, Warn for recoverable errors

## File Structure

```
orchestrator/
├── internal/
│   └── workflow/
│       ├── types.go          # Workflow input/output types
│       ├── activities.go     # Activity implementations
│       ├── workflows.go      # Workflow definitions
│       ├── worker.go         # Worker initialization
│       └── README.md         # Package documentation
├── cmd/
│   └── worker/
│       └── main.go           # Worker entry point
├── docker-compose.temporal.yml  # Local Temporal server
└── .env.example              # Configuration template
```

## Implementation Details

### Activity Retry Policies

Each activity has tailored retry configuration:

| Activity | Initial Backoff | Multiplier | Max Attempts | Rationale |
|----------|----------------|------------|--------------|-----------|
| CreateNamespace | 5s | 2.0 | 3 | Fast K8s API calls |
| DeployVCluster | 10s | 2.0 | 2 | Helm operations are slow |
| WaitUntilReady | 5s | 2.0 | 3 | Polling operation |
| ApplyNetworkPolicies | 2s | 2.0 | 3 | Fast K8s API calls |
| InitializeSeedData | 5s | 2.0 | 2 | Manifest application |
| VerifyReady | 3s | 2.0 | 3 | Final verification |

### Workflow Execution Flow

```
SetupLabEnvironment
├─> CreateNamespace (30s timeout)
│   └─> On failure: Return error
├─> DeployVCluster (120s timeout, 15s heartbeat)
│   └─> On failure: Run CompensationWorkflow
├─> WaitUntilReady (90s timeout, 10s heartbeat)
│   └─> On failure: Run CompensationWorkflow
├─> ApplyNetworkPolicies (15s timeout)
│   └─> On failure: Run CompensationWorkflow
├─> InitializeSeedData (60s timeout)
│   └─> On failure: Run CompensationWorkflow
└─> VerifyReady (30s timeout)
    └─> On failure: Run CompensationWorkflow
```

### Compensation Logic

The compensation workflow tracks which steps completed:

```go
compensationInput := CompensationInput{
    Namespace:      "sandbox-user-quiz-abc123",
    VClusterName:   "vc-abc123",
    SandboxID:      "abc123",
    StepsCompleted: []string{"namespace", "vcluster"},
}
```

Cleanup happens in reverse order:
1. Delete vCluster (if deployed)
2. Delete namespace (if created)
3. Cleanup NATS subjects
4. Update session status to FAILED

## Setup Instructions

### 1. Install Dependencies

The Temporal SDK needs to be downloaded. Run:

```bash
cd orchestrator
go mod tidy
```

This will download `go.temporal.io/sdk v1.25.1` and its dependencies.

### 2. Start Temporal Server

```bash
make temporal-up
```

This starts:
- PostgreSQL (port 5432)
- Temporal server (port 7233)
- Temporal UI (http://localhost:8080)

### 3. Configure Environment

Copy `.env.example` to `.env` and adjust if needed:

```bash
cp .env.example .env
```

Key Temporal settings:
```bash
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=lab-provisioning
```

### 4. Run the Worker

```bash
make worker
```

The worker will:
- Connect to Temporal server
- Register workflows and activities
- Start the cleanup schedule (every 5 minutes)
- Begin polling for workflow tasks

## Usage Examples

### Starting a Workflow (Go)

```go
package main

import (
    "context"
    "log"
    "time"
    
    "go.temporal.io/sdk/client"
    "github.com/tentacle-studio/better-architecture/orchestrator/internal/workflow"
)

func main() {
    c, err := client.Dial(client.Options{
        HostPort: "localhost:7233",
    })
    if err != nil {
        log.Fatalln("Unable to create Temporal client", err)
    }
    defer c.Close()

    input := workflow.SetupLabInput{
        UserID:       "user123",
        QuizID:       "quiz456",
        SeedManifest: "YXBpVmVyc2lvbjogdjEKa2luZDogUG9k...", // base64
        TTL:          2 * time.Hour,
    }

    options := client.StartWorkflowOptions{
        ID:        "setup-lab-user123-quiz456",
        TaskQueue: "lab-provisioning",
    }

    we, err := c.ExecuteWorkflow(context.Background(), options, workflow.SetupLabEnvironment, input)
    if err != nil {
        log.Fatalln("Unable to execute workflow", err)
    }

    log.Println("Started workflow", "WorkflowID", we.GetID(), "RunID", we.GetRunID())

    var result workflow.SetupLabOutput
    err = we.Get(context.Background(), &result)
    if err != nil {
        log.Fatalln("Unable to get workflow result", err)
    }

    log.Printf("Sandbox created: %s\n", result.SandboxID)
    log.Printf("Endpoint: %s\n", result.VClusterEndpoint)
}
```

### Starting a Workflow (CLI)

```bash
temporal workflow start \
    --task-queue lab-provisioning \
    --type SetupLabEnvironment \
    --workflow-id setup-lab-user123-quiz456 \
    --input '{"UserID":"user123","QuizID":"quiz456","SeedManifest":"","TTL":"2h"}'
```

### Querying Workflow Status

```bash
temporal workflow describe \
    --workflow-id setup-lab-user123-quiz456
```

### Viewing Workflows in UI

Open http://localhost:8080 to see:
- Running workflows
- Workflow history
- Activity execution details
- Retry attempts
- Error messages

## Monitoring & Observability

### Key Metrics

Monitor these in production:
- **Workflow completion rate**: Success vs failure ratio
- **Activity retry rate**: How often activities retry
- **Compensation triggers**: Frequency of rollbacks
- **Cleanup schedule execution**: Scheduled workflow runs
- **Worker lag**: Task queue backlog

### Temporal UI Insights

The UI shows:
- Workflow execution timeline
- Activity durations and retries
- Error stack traces
- Heartbeat status
- Pending activities

### Logging

All activities log structured data:
```go
activity.GetLogger(ctx).Info("Namespace created", 
    "namespace", namespace,
    "userID", userID,
    "quizID", quizID)
```

## Production Deployment

### Horizontal Scaling

Run multiple workers for high availability:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: temporal-worker
spec:
  replicas: 3  # Multiple workers
  template:
    spec:
      containers:
      - name: worker
        image: orchestrator-worker:latest
        env:
        - name: TEMPORAL_HOST
          value: "temporal.temporal-system.svc.cluster.local:7233"
```

### Resource Limits

Configure worker resources:
```yaml
resources:
  requests:
    memory: "256Mi"
    cpu: "250m"
  limits:
    memory: "512Mi"
    cpu: "500m"
```

### Temporal Cloud

For managed Temporal:

```bash
export TEMPORAL_HOST=namespace.account.tmprl.cloud:7233
export TEMPORAL_NAMESPACE=namespace.account
export TEMPORAL_TLS_CERT=/path/to/client.pem
export TEMPORAL_TLS_KEY=/path/to/client-key.pem
```

## Testing

### Unit Tests

Test individual activities:

```go
func TestCreateNamespace(t *testing.T) {
    testSuite := &testsuite.WorkflowTestSuite{}
    env := testSuite.NewTestActivityEnvironment()
    
    activities := NewActivities(k8sClient, "10.0.0.0/16", "repo", "version")
    env.RegisterActivity(activities.CreateNamespace)
    
    val, err := env.ExecuteActivity(activities.CreateNamespace, "user1", "quiz1")
    require.NoError(t, err)
    
    var namespace string
    val.Get(&namespace)
    assert.Contains(t, namespace, "sandbox-user1-quiz1")
}
```

### Workflow Tests

Test workflow logic:

```go
func TestSetupLabEnvironment(t *testing.T) {
    testSuite := &testsuite.WorkflowTestSuite{}
    env := testSuite.NewTestWorkflowEnvironment()
    
    env.OnActivity("CreateNamespace", mock.Anything, "user1", "quiz1").
        Return("sandbox-user1-quiz1-abc123", nil)
    
    env.ExecuteWorkflow(SetupLabEnvironment, SetupLabInput{
        UserID: "user1",
        QuizID: "quiz1",
    })
    
    require.True(t, env.IsWorkflowCompleted())
    require.NoError(t, env.GetWorkflowError())
}
```

## Troubleshooting

### Worker Not Connecting

Check Temporal server is running:
```bash
docker-compose -f docker-compose.temporal.yml ps
```

Verify connectivity:
```bash
temporal operator namespace list --address localhost:7233
```

### Workflow Stuck

Check activity timeouts and heartbeats. Long-running activities need heartbeats:
```go
activity.RecordHeartbeat(ctx, "progress message")
```

### Import Errors

The lint errors about missing Temporal SDK packages will resolve after running:
```bash
cd orchestrator
go mod tidy
```

This downloads the SDK and updates `go.sum`.

## Next Steps

1. **Run `go mod tidy`** to download Temporal SDK
2. **Start Temporal server**: `make temporal-up`
3. **Run the worker**: `make worker`
4. **Test a workflow** using the CLI or Go client
5. **Monitor in UI**: http://localhost:8080

## References

- [Temporal Documentation](https://docs.temporal.io/)
- [Go SDK Guide](https://docs.temporal.io/dev-guide/go)
- [Workflow Patterns](https://docs.temporal.io/encyclopedia/workflow-patterns)
- [Production Deployment](https://docs.temporal.io/production-deployment)
