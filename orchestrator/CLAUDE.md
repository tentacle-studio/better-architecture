# Orchestrator - CLAUDE.md

## Overview
The Orchestrator is a Go-based microservice that manages isolated lab environments for educational infrastructure challenges. It provisions vCluster-based sandboxes, handles terminal sessions via gRPC streaming, and validates user submissions through automated checks.

## Architecture

### High-Level Components

```
cmd/
└── orchestrator/
    └── main.go          # Entry point: initializes servers, clients, and lifecycle

internal/
├── config/              # Configuration management (env-based)
├── grpc/                # gRPC server implementation
│   ├── server.go        # OrchestratorService implementation
│   ├── proto/           # Protocol buffer definitions
│   └── stream_adapters.go
├── k8s/                 # Kubernetes client wrapper
│   ├── client.go        # K8s client creation & kubeconfig utilities
│   ├── namespace.go     # Namespace operations
│   ├── networkpolicy.go # Network policy management
│   └── exec.go          # Remote command execution
├── sandbox/             # Sandbox lifecycle management
│   ├── manager.go       # Core sandbox provisioning/teardown
│   └── seed.go          # Seed data application
├── vcluster/            # vCluster provisioning logic
│   ├── provisioner.go   # Create/delete vClusters
│   ├── types.go         # vCluster config & status types
│   └── health.go        # Health checks
├── judge/               # Validation/grading engine
│   ├── engine.go        # Check orchestration & scoring
│   ├── state_check.go   # Resource state validation
│   ├── liveness_check.go# Service liveness verification
│   └── sla_check.go     # Performance/SLA verification
├── workflow/            # Temporal workflows (if async mode enabled)
│   ├── workflows.go     # Long-running provisioning workflows
│   ├── activities.go    # Workflow activities
│   └── types.go         # Type definitions
├── events/              # Event publishing (NATS)
│   └── publisher.go     # Event/message publishing
└── telemetry/           # Observability
    ├── metrics.go       # OpenTelemetry metrics
    └── tracing.go       # Distributed tracing

deploy/
├── Dockerfile           # Multi-stage build configuration
└── helm/               # Helm chart for K8s deployment
```

## Code Style Guidelines

### General Principles
- **Simplicity First**: Minimal abstractions; prefer concrete implementations
- **Error Handling**: Use `fmt.Errorf` with `%w` for wrapping; avoid panic except in main
- **Context Propagation**: Always pass context as first parameter in public APIs
- **Positional Arguments**: Keep structs with <=3 fields as positional; use options pattern for 4+

### Naming Conventions
- **Interfaces**: Single methods end with `-er` (e.g., `Checker`, `Provisioner`)
- **Structs**: Use concrete names (e.g., `Manager`, `Engine`, `Client`)
- **Functions**: Verb-first (e.g., `CreateSandbox`, `ValidateQuiz`)
- **Variables**: Semantic abbreviation allowed (e.g., `cfg`, `ctx`, `err`, `sb`)

### Error Handling Pattern
```go
func DoSomething(ctx context.Context, input Input) (*Output, error) {
    if err := validate(input); err != nil {
        return nil, fmt.Errorf("validate input: %w", err)
    }

    result, err := process(ctx)
    if err != nil {
        return nil, fmt.Errorf("process request: %w", err)
    }

    return result, nil
}
```

### Configuration Pattern
```go
type Config struct {
    Port     string
    Timeout  time.Duration
    Endpoint string
}

func Load() *Config {
    return &Config{
        Port:     getEnv("PORT", "50051"),
        Timeout:  getDurationEnv("TIMEOUT", 30*time.Second),
    }
}
```

### Struct Initialization
```go
// For simple structs (<=3 fields):
sb := &Sandbox{
    ID:        id,
    Namespace: ns,
    State:     StateCreating,
}

// For complex configs with many options:
engine := NewEngine(k8sClient,
    WithPrometheusURL(url),
    WithPassingThreshold(0.8),
)
```

### Import Ordering
```go
import (
    // Standard library
    "context"
    "fmt"
    "log"

    // Third-party
    "github.com/google/uuid"
    "k8s.io/api/core/v1"

    // Internal
    "github.com/tentacle-studio/better-architecture/orchestrator/internal/config"
)
```

## Commands

### Build & Run
```bash
# Generate protobuf code
make proto

# Build binary
make build

# Run service (requires KUBECONFIG)
make run

# Build and run in one step
make all
```

### Testing
```bash
# Run all tests
make test

# Run specific test
go test -v ./internal/judge/...

# Run with coverage
go test -cover ./...
```

### Development Tools
```bash
# Install required tools (protoc plugins)
make install-tools

# Download dependencies
make deps
```

### Docker & Deployment
```bash
# Build Docker image
make docker-build

# Install via Helm
make helm-install

# Upgrade deployment
make helm-upgrade

# Uninstall
make helm-uninstall
```

### Temporal (Workflow Engine)
```bash
# Start Temporal server locally
make temporal-up

# Stop Temporal server
make temporal-down

# Build and run Temporal worker
make worker
```

## Architecture Details

### gRPC Services
The Orchestrator exposes a gRPC service defined in `internal/grpc/proto/orchestrator.proto`:

| Method | Purpose |
|--------|---------|
| `CreateSandbox` | Provision a new vCluster sandbox with optional seed data |
| `DestroySandbox` | Teardown sandbox and release resources |
| `GetSandboxStatus` | Query sandbox state and metadata |
| `ExecStream` | Bidirectional terminal session (stdin/stdout via socat) |
| `ValidateQuiz` | Run validation checks and return score |
| `WatchResources` | Stream K8s resource events (Pods, Services, Deployments) |

### Sandbox Lifecycle
1. **Create**: User requests sandbox → namespace + vCluster provisioned → seed applied
2. **Ready**: Shell pod running → kubeconfig generated → endpoint available
3. **Active**: User connects via gRPC exec stream → terminal over port-forward + socat
4. **TTL Expiry**: Automatic cleanup after configured TTL (default 2 hours)

### Judge Engine
The grading system supports multiple check types:

| Check Type | Description |
|------------|-------------|
| `STATE` | Verifies K8s resource manifests match expected state |
| `LIVENESS` | HTTP/TCP endpoint health checks |
| `SLA` | Performance metrics via Prometheus queries |

### External Dependencies
- **Kubernetes**: Cluster for sandbox isolation
- **vCluster**: Virtual clusters per sandbox (Helm chart)
- **NATS** (optional): Event publishing for cross-service communication
- **Temporal** (optional): Workflow orchestration for long-running provisioning
- **OpenTelemetry**: Distributed tracing and metrics

## Important Notes

### Development Considerations (2024 Best Practices)

1. **Kubernetes Client**: Uses client-go v0.29 (K8s 1.29 compatible). For production, pin to LTS versions.

2. **Security**:
   - Insecure TLS (`InsecureSkipVerify`) is enabled for local dev (OrbStack/k3d compat)
   - Enable proper mTLS for production with cert-manager

3. **Network Isolation**:
   - NetworkPolicies restrict tester pod access
   - Pod CIDR must be configured (`TESTER_POD_CIDR`)

4. **Port-Forwarding Hack**:
   - Socat-based terminal avoids SPDY requirement of kubectl exec
   - This works in OrbStack/local K8s where kubelet is unreachable
   - For production, consider Krtun or direct container exec

5. **Temporal Integration**:
   - Workflows support complex provisioning with compensation
   - Not enabled by default; synchronous path used in `main.go`
   - Enable for production with durability requirements

6. **Observability**:
   - OpenTelemetry tracing via OTLP gRPC
   - Metrics exported to Prometheus
   - Configure `OTEL_ENDPOINT` for collector

7. **Resource Limits**:
   - Set pod resource requests/limits in Helm values
   - Configure `SANDBOX_TTL` to prevent stale resource accumulation

### Production Hardening Checklist
- [ ] Enable mTLS for gRPC
- [ ] Configure resource quotas per namespace
- [ ] Set up NATS clustering for event durability
- [ ] Enable Temporal for workflow recovery
- [ ] Configure alerting on sandbox creation failures
- [ ] Implement rate limiting per user

## Protocol Buffer Regeneration
```bash
# Install protoc plugins (once)
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Regenerate
make proto
```

## Environment Variables
| Variable | Default | Description |
|----------|---------|-------------|
| `GRPC_PORT` | `50051` | gRPC server port |
| `KUBECONFIG` | (empty) | Path to kubeconfig (uses in-cluster if empty) |
| `SANDBOX_TTL` | `2h` | Sandbox lifetime |
| `TESTER_POD_CIDR` | `10.244.0.0/16` | CIDR for network policies |
| `NATS_URL` | `nats://localhost:4222` | NATS server URL (optional) |
| `OTEL_ENDPOINT` | `localhost:4317` | OTLP collector endpoint |
| `VCLUSTER_CHART_REPO` | `https://charts.loft.sh` | vCluster Helm repo |
| `TEMPORAL_HOST` | `localhost:7233` | Temporal server address (optional) |