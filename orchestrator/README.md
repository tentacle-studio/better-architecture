# Orchestrator - Go Infrastructure Orchestrator

gRPC service written in Go that manages vCluster lifecycle, terminal exec streaming into pods, and real-time Kubernetes resource watching.

## Overview

The orchestrator service is responsible for:
- **vCluster Lifecycle Management**: Create, manage, and destroy isolated Kubernetes virtual clusters
- **Terminal Exec Streaming**: Bidirectional streaming for terminal access to pods via SPDY
- **Quiz Validation**: Run automated checks (state, liveness, SLA) against sandbox environments
- **Resource Watching**: Real-time streaming of Kubernetes resource events
- **Seed Data Application**: Apply Kubernetes manifests to sandbox environments
- **Event Publishing**: Publish sandbox lifecycle events to NATS
- **Observability**: Distributed tracing and metrics via OpenTelemetry

## Architecture

```
orchestrator/
├── cmd/orchestrator/          # Main entrypoint with graceful shutdown
├── internal/
│   ├── config/               # Environment-based configuration
│   ├── k8s/                  # Kubernetes client wrappers
│   ├── vcluster/             # vCluster provisioning & health checks
│   ├── sandbox/              # High-level sandbox management & seeding
│   ├── judge/                # Validation engine (state, liveness, SLA)
│   ├── grpc/                 # gRPC server with streaming support
│   ├── events/               # NATS event publishing
│   └── telemetry/            # OpenTelemetry tracing & metrics
├── deploy/                   # Dockerfile & Helm charts
└── test/integration/         # Integration test suite
```

## Prerequisites

- Go 1.22+
- Protocol Buffers compiler (`protoc`)
- Access to a Kubernetes cluster
- Helm 3.x (for deployment)

## Development

### 1. Install Dependencies

```bash
cd orchestrator
go mod download
```

### 2. Generate Protobuf Code

```bash
# Install protoc plugins
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Generate Go code from proto files
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    internal/grpc/proto/orchestrator.proto
```

### 3. Build

```bash
go build -o bin/orchestrator ./cmd/orchestrator
```

### 4. Run Locally

```bash
# Set environment variables
export GRPC_PORT=50051
export KUBECONFIG=~/.kube/config
export SANDBOX_TTL=2h
export TESTER_POD_CIDR=10.244.0.0/16

# Run the service
./bin/orchestrator
```

## Configuration

All configuration is done via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `GRPC_PORT` | `50051` | gRPC server port |
| `KUBECONFIG` | (in-cluster) | Path to kubeconfig file |
| `VCLUSTER_NAMESPACE` | `vcluster-system` | Namespace for vCluster deployments |
| `VCLUSTER_CHART_REPO` | `https://charts.loft.sh` | Helm chart repository |
| `VCLUSTER_CHART_VERSION` | `0.19.0` | vCluster chart version |
| `SANDBOX_TTL` | `2h` | Sandbox session TTL |
| `MAX_SANDBOXES_PER_USER` | `5` | Max concurrent sandboxes per user |
| `NATS_URL` | `nats://localhost:4222` | NATS server URL |
| `OTEL_ENDPOINT` | `localhost:4317` | OpenTelemetry collector endpoint |
| `TESTER_POD_CIDR` | `10.244.0.0/16` | CIDR for tester pod network policy |
| `HEALTH_CHECK_INTERVAL` | `2s` | vCluster health check interval |
| `HEALTH_CHECK_TIMEOUT` | `90s` | vCluster health check timeout |

## gRPC API

### CreateSandbox
Creates a new isolated sandbox environment with a vCluster.

### DestroySandbox
Destroys a sandbox and cleans up all resources.

### GetSandboxStatus
Retrieves the current status of a sandbox.

### ExecStream (bidirectional streaming)
Streams terminal I/O to/from a pod in the sandbox.

### ValidateQuiz
Runs validation checks against a sandbox environment.

### WatchResources (server streaming)
Streams real-time Kubernetes resource events from a sandbox.

## Deployment

### Docker Build

```bash
docker build -f deploy/Dockerfile -t orchestrator:latest .
```

### Helm Install

```bash
helm install orchestrator deploy/helm/orchestrator \
  --namespace orchestrator-system \
  --create-namespace
```

## Implementation Status

### ✅ Completed
- Project structure and organization
- Protobuf definitions
- Configuration management
- Kubernetes client wrappers (namespace, network policy, exec)
- vCluster types and provisioner skeleton
- Sandbox manager
- Judge engine with check types (state, liveness, SLA)
- gRPC server implementation
- Dockerfile and Helm charts

### 🚧 To Be Implemented
- Helm-based vCluster deployment integration
- vCluster health checking implementation
- Kubeconfig generation for vClusters
- Seed manifest application
- Terminal exec streaming with SPDY
- Resource watching with Kubernetes informers
- State check implementation (query K8s API)
- Liveness check implementation (tester pod deployment)
- SLA check implementation (OpenTelemetry metrics query)
- NATS integration for pub/sub
- OpenTelemetry tracing

## License

MIT
