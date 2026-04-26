# Quick Start Guide

## Prerequisites

Before you begin, ensure you have:
- Go 1.22 or higher installed
- Protocol Buffers compiler (`protoc`) installed
- Access to a Kubernetes cluster
- `kubectl` configured

## Step 1: Install Dependencies

```bash
cd orchestrator

# Install protoc plugins
make install-tools

# Download Go dependencies
make deps
```

This will:
- Install `protoc-gen-go` and `protoc-gen-go-grpc`
- Download all required Go modules
- Run `go mod tidy` to clean up dependencies

## Step 2: Generate Protobuf Code

```bash
make proto
```

This generates Go code from `internal/grpc/proto/orchestrator.proto`.

## Step 3: Build the Service

```bash
make build
```

The binary will be created at `bin/orchestrator`.

## Step 4: Configure Environment

Create a `.env` file or export environment variables:

```bash
export GRPC_PORT=50051
export KUBECONFIG=~/.kube/config
export SANDBOX_TTL=2h
export TESTER_POD_CIDR=10.244.0.0/16
export NATS_URL=nats://localhost:4222
export OTEL_ENDPOINT=localhost:4317
```

## Step 5: Run the Service

```bash
make run
```

Or run directly:

```bash
./bin/orchestrator
```

You should see:
```
Starting orchestrator service...
Loaded configuration: gRPC port=50051
Kubernetes client initialized
Sandbox manager initialized
Judge engine initialized
gRPC server initialized
Orchestrator gRPC server listening on :50051
```

## Step 6: Test the gRPC API

Use `grpcurl` to test the API:

```bash
# Install grpcurl if needed
go install github.com/fullstorydev/grpcurl/cmd/grpcurl@latest

# List services
grpcurl -plaintext localhost:50051 list

# Create a sandbox
grpcurl -plaintext -d '{
  "user_id": "user123",
  "quiz_id": "quiz456",
  "seed_manifest": ""
}' localhost:50051 orchestrator.Orchestrator/CreateSandbox
```

## Docker Deployment

### Build Docker Image

```bash
make docker-build
```

### Run with Docker

```bash
docker run -p 50051:50051 \
  -e GRPC_PORT=50051 \
  -e KUBECONFIG=/root/.kube/config \
  -v ~/.kube:/root/.kube \
  orchestrator:latest
```

## Kubernetes Deployment

### Install with Helm

```bash
make helm-install
```

Or manually:

```bash
helm install orchestrator deploy/helm/orchestrator \
  --namespace orchestrator-system \
  --create-namespace \
  --set image.tag=latest
```

### Verify Deployment

```bash
kubectl get pods -n orchestrator-system
kubectl logs -n orchestrator-system -l app.kubernetes.io/name=orchestrator
```

### Port Forward for Testing

```bash
kubectl port-forward -n orchestrator-system svc/orchestrator 50051:50051
```

## Next Steps

The current implementation includes:
- ✅ Complete project structure
- ✅ gRPC API definitions
- ✅ Configuration management
- ✅ Kubernetes client wrappers
- ✅ Sandbox manager skeleton
- ✅ Judge engine framework

To complete the implementation, you'll need to:
1. Implement Helm-based vCluster deployment
2. Add vCluster health checking logic
3. Implement kubeconfig generation
4. Add terminal exec streaming
5. Implement resource watching
6. Add validation check implementations
7. Integrate NATS for pub/sub
8. Add OpenTelemetry tracing

## Troubleshooting

### Import Errors

If you see import errors, run:
```bash
make deps
```

### Protobuf Generation Fails

Ensure protoc plugins are installed:
```bash
make install-tools
```

### Cannot Connect to Kubernetes

Verify your kubeconfig:
```bash
kubectl cluster-info
```

Set the correct KUBECONFIG path:
```bash
export KUBECONFIG=/path/to/your/kubeconfig
```

## Development Workflow

```bash
# Make changes to code
vim internal/sandbox/manager.go

# Rebuild
make build

# Run tests
make test

# Clean build artifacts
make clean

# Rebuild everything
make all
```

## Available Make Targets

- `make all` - Generate proto and build
- `make proto` - Generate protobuf code
- `make build` - Build the binary
- `make run` - Build and run
- `make clean` - Remove build artifacts
- `make docker-build` - Build Docker image
- `make helm-install` - Install Helm chart
- `make test` - Run tests
- `make deps` - Download dependencies
- `make install-tools` - Install protoc plugins
