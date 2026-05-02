# Temporal Workflows - Quick Start Guide

Get the Temporal-based lab provisioning system running in 5 minutes.

## Prerequisites

- Go 1.22+
- Docker & Docker Compose
- kubectl configured with K8s cluster access

## Step 1: Start Temporal Server (30 seconds)

```bash
cd orchestrator
make temporal-up
```

This starts:
- ✅ PostgreSQL database
- ✅ Temporal server (localhost:7233)
- ✅ Temporal UI (http://localhost:8080)

Verify it's running:
```bash
docker-compose -f docker-compose.temporal.yml ps
```

## Step 2: Configure Environment (10 seconds)

```bash
cp .env.example .env
```

The defaults work for local development. Key settings:
```bash
TEMPORAL_HOST=localhost:7233
TEMPORAL_NAMESPACE=default
TEMPORAL_TASK_QUEUE=lab-provisioning
```

## Step 3: Start the Worker (10 seconds)

```bash
make worker
```

You should see:
```
Temporal worker started successfully
  Host: localhost:7233
  Namespace: default
  Task Queue: lab-provisioning
```

The worker is now polling for workflow tasks.

## Step 4: Test a Workflow (2 minutes)

### Option A: Using Temporal CLI

Install the CLI:
```bash
brew install temporal
```

Start a workflow:
```bash
temporal workflow start \
    --task-queue lab-provisioning \
    --type SetupLabEnvironment \
    --workflow-id test-lab-001 \
    --input '{
      "UserID": "testuser",
      "QuizID": "quiz001",
      "SeedManifest": "",
      "TTL": "2h"
    }'
```

Check status:
```bash
temporal workflow describe --workflow-id test-lab-001
```

### Option B: Using Go Client

Create `test_workflow.go`:

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
    c, _ := client.Dial(client.Options{HostPort: "localhost:7233"})
    defer c.Close()

    input := workflow.SetupLabInput{
        UserID: "testuser",
        QuizID: "quiz001",
        TTL:    2 * time.Hour,
    }

    we, _ := c.ExecuteWorkflow(context.Background(), 
        client.StartWorkflowOptions{
            ID:        "test-lab-001",
            TaskQueue: "lab-provisioning",
        }, 
        workflow.SetupLabEnvironment, 
        input,
    )

    log.Println("Workflow started:", we.GetID())

    var result workflow.SetupLabOutput
    we.Get(context.Background(), &result)
    
    log.Printf("Sandbox ID: %s\n", result.SandboxID)
    log.Printf("Endpoint: %s\n", result.VClusterEndpoint)
}
```

Run it:
```bash
go run test_workflow.go
```

## Step 5: Monitor in UI

Open http://localhost:8080

You'll see:
- ✅ Workflow execution timeline
- ✅ Activity progress and retries
- ✅ Any errors with stack traces
- ✅ Heartbeat status

## What Just Happened?

The workflow executed these steps:

1. **CreateNamespace** - Created K8s namespace `sandbox-testuser-quiz001-xxxxx`
2. **DeployVCluster** - Deployed vCluster via Helm
3. **WaitUntilReady** - Waited for vCluster to be healthy (with heartbeats)
4. **ApplyNetworkPolicies** - Applied network isolation
5. **InitializeSeedData** - Applied seed manifests (skipped if empty)
6. **VerifyReady** - Generated kubeconfig and verified

If any step failed, **CompensationWorkflow** would automatically clean up.

## Scheduled Cleanup

The worker automatically started a cron schedule that runs every 5 minutes:

```
CleanupExpiredSandboxes
├─> ListExpiredSessions (finds namespaces older than TTL)
└─> For each expired session:
    ├─> DestroySandbox (removes vCluster + namespace)
    └─> MarkSessionCleaned (updates DB)
```

View scheduled workflows in the UI under "Schedules".

## Common Commands

```bash
# Start Temporal server
make temporal-up

# Stop Temporal server
make temporal-down

# Run worker
make worker

# View logs
docker-compose -f docker-compose.temporal.yml logs -f temporal

# List workflows
temporal workflow list

# Describe workflow
temporal workflow describe --workflow-id <id>

# Cancel workflow
temporal workflow cancel --workflow-id <id>
```

## Troubleshooting

### Worker won't start
```bash
# Check Temporal is running
docker-compose -f docker-compose.temporal.yml ps

# Check connectivity
temporal operator namespace list
```

### Workflow stuck
- Check Temporal UI for activity errors
- Verify K8s cluster is accessible
- Check activity timeouts in workflow code

### Import errors
```bash
# Re-download dependencies
cd orchestrator
go mod tidy
```

## Next Steps

1. **Read the spec**: `docs/specs/03-temporal-workflows.md`
2. **Implementation details**: `orchestrator/TEMPORAL_IMPLEMENTATION.md`
3. **Package docs**: `orchestrator/internal/workflow/README.md`
4. **Integrate with gRPC**: Add workflow triggers to orchestrator service
5. **Production deployment**: Deploy worker to K8s cluster

## Production Checklist

- [ ] Use Temporal Cloud or self-hosted cluster
- [ ] Configure TLS for Temporal connection
- [ ] Set up monitoring and alerting
- [ ] Deploy multiple worker replicas
- [ ] Configure resource limits
- [ ] Set up log aggregation
- [ ] Test compensation workflows
- [ ] Load test with realistic workloads

## Architecture Highlights

### Go Patterns Used

✅ **Error wrapping with context**
```go
return fmt.Errorf("create namespace %s: %w", namespace, err)
```

✅ **Structured logging**
```go
activity.GetLogger(ctx).Info("Namespace created", "namespace", ns)
```

✅ **Dependency injection**
```go
activities := NewActivities(k8sClient, cidr, repo, version)
```

✅ **Graceful shutdown**
```go
signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
<-quit
worker.Stop()
```

✅ **Context-aware cancellation**
```go
select {
case <-ticker.C:
    activity.RecordHeartbeat(ctx, "waiting")
case <-ctx.Done():
    return ctx.Err()
}
```

✅ **Zero value defaults**
```go
if taskQueue == "" {
    taskQueue = DefaultTaskQueue
}
```

## Resources

- [Temporal Docs](https://docs.temporal.io/)
- [Go SDK Guide](https://docs.temporal.io/dev-guide/go)
- [Best Practices](https://docs.temporal.io/dev-guide/go/best-practices)
