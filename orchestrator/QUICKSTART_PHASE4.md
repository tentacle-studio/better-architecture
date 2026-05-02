# Quick Start Guide - Phase 4 Features

This guide covers the new features added in Phase 4: Integration & Polish.

## Prerequisites

- Kubernetes cluster (kind, minikube, or cloud)
- Go 1.22+
- NATS server (optional)
- OpenTelemetry Collector (optional)

## Installation

### 1. Download Dependencies

```bash
cd orchestrator
go mod download
go mod tidy
```

This will download:
- `github.com/nats-io/nats.go` - NATS client
- `go.opentelemetry.io/otel/*` - OpenTelemetry SDK and exporters

### 2. Generate Protobuf Code

```bash
make proto
```

### 3. Build the Service

```bash
make build
```

## Configuration

### Environment Variables

```bash
# Core settings
export GRPC_PORT=50051
export KUBECONFIG=~/.kube/config

# Phase 4 additions
export NATS_URL=nats://localhost:4222
export OTEL_ENDPOINT=localhost:4317

# Optional
export SANDBOX_TTL=2h
export TESTER_POD_CIDR=10.244.0.0/16
```

## Running the Service

### Basic Run

```bash
./bin/orchestrator
```

Expected output:
```
Starting orchestrator service...
Loaded configuration: gRPC port=50051
OpenTelemetry tracing initialized
OpenTelemetry metrics initialized
Kubernetes client initialized
NATS publisher connected to nats://localhost:4222
Sandbox manager initialized
Judge engine initialized
gRPC server initialized
Orchestrator gRPC server listening on :50051
```

### Run Without Optional Services

If NATS or OpenTelemetry are unavailable, the service will start with warnings:

```
Warning: Failed to connect to NATS: dial tcp [::1]:4222: connect: connection refused
Warning: Failed to initialize tracing: failed to create gRPC connection to collector
```

The service will continue to function without these features.

## Using Phase 4 Features

### 1. Seed Manifest Application

Create a sandbox with seed data:

```bash
# Encode your manifest
MANIFEST=$(cat <<EOF | base64
apiVersion: v1
kind: ConfigMap
metadata:
  name: app-config
data:
  database_url: postgres://localhost:5432/mydb
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-app
spec:
  replicas: 2
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: nginx
        image: nginx:latest
        ports:
        - containerPort: 80
EOF
)

# Create sandbox with seed data
grpcurl -d "{\"user_id\":\"user123\",\"quiz_id\":\"quiz456\",\"seed_manifest\":\"$MANIFEST\"}" \
  -plaintext localhost:50051 \
  orchestrator.Orchestrator/CreateSandbox
```

### 2. NATS Event Monitoring

Subscribe to sandbox events:

```bash
# Install NATS CLI
go install github.com/nats-io/natscli/nats@latest

# Subscribe to all sandbox events
nats sub "sandbox.>"

# Subscribe to specific sandbox
nats sub "sandbox.abc123.>"

# Subscribe to specific event type
nats sub "sandbox.*.ready"
```

Event format:
```json
{
  "sandbox_id": "abc123",
  "event_type": "ready",
  "timestamp": "2026-04-26T17:38:00Z",
  "data": {
    "namespace": "sandbox-user123-quiz456-abc123",
    "endpoint": "https://10.0.0.1:443"
  }
}
```

### 3. OpenTelemetry Tracing

#### Setup Jaeger (for viewing traces)

```bash
# Run Jaeger all-in-one
docker run -d --name jaeger \
  -e COLLECTOR_OTLP_ENABLED=true \
  -p 16686:16686 \
  -p 4317:4317 \
  jaegertracing/all-in-one:latest

# Access Jaeger UI
open http://localhost:16686
```

#### View Traces

1. Create a sandbox (generates traces)
2. Open Jaeger UI at http://localhost:16686
3. Select service: `orchestrator`
4. Click "Find Traces"
5. View detailed trace spans

### 4. Prometheus Metrics

#### Setup Prometheus

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'orchestrator'
    static_configs:
      - targets: ['localhost:50051']
```

#### Available Metrics

- `sandboxes_created_total` - Total sandboxes created
- `sandboxes_active` - Current active sandboxes
- `sandboxes_failed_total` - Failed sandbox creations
- `validation_latency_milliseconds` - Validation check duration

## Testing

### Unit Tests

```bash
# Run all unit tests
go test -short ./...

# Run with coverage
go test -short -cover ./...
```

### Integration Tests

```bash
# Run all integration tests
go test -v ./test/integration/...

# Run specific test
go test -v ./test/integration/ -run TestSandboxLifecycle

# Run with race detector
go test -race ./test/integration/...
```

## Troubleshooting

### Import Errors

If you see import errors:
```
could not import github.com/nats-io/nats.go
```

**Solution**:
```bash
go mod download
go mod tidy
```

### NATS Connection Failed

```
Warning: Failed to connect to NATS: dial tcp [::1]:4222: connect: connection refused
```

**Solutions**:
1. Start NATS server: `nats-server`
2. Or disable NATS: `unset NATS_URL`

### OpenTelemetry Connection Failed

```
Warning: Failed to initialize tracing: failed to create gRPC connection to collector
```

**Solutions**:
1. Start OTel collector or Jaeger
2. Or use different endpoint: `export OTEL_ENDPOINT=your-collector:4317`
3. Service will continue without tracing

### Seed Manifest Errors

```
failed to create resource Deployment/web-app (document 1): deployments.apps is forbidden
```

**Solution**: Check service account RBAC permissions in `deploy/helm/orchestrator/templates/rbac.yaml`

## Development Workflow

### 1. Make Changes

Edit code in `internal/` directories

### 2. Run Tests

```bash
go test -short ./...
```

### 3. Build

```bash
make build
```

### 4. Test Locally

```bash
./bin/orchestrator
```

### 5. Integration Test

```bash
go test -v ./test/integration/...
```

## Docker Deployment

### Build Image

```bash
make docker-build
```

### Run Container

```bash
docker run -p 50051:50051 \
  -e NATS_URL=nats://host.docker.internal:4222 \
  -e OTEL_ENDPOINT=host.docker.internal:4317 \
  orchestrator:latest
```

## Kubernetes Deployment

### Install with Helm

```bash
# Install
make helm-install

# Or with custom values
helm install orchestrator ./deploy/helm/orchestrator \
  --namespace orchestrator-system \
  --create-namespace \
  --set config.natsUrl=nats://nats.default.svc:4222 \
  --set config.otelEndpoint=otel-collector.observability.svc:4317
```

### Verify Deployment

```bash
kubectl get pods -n orchestrator-system
kubectl logs -n orchestrator-system -l app=orchestrator
```

## Next Steps

1. **Configure Observability Stack**
   - Deploy NATS cluster
   - Setup OpenTelemetry Collector
   - Configure Jaeger/Prometheus

2. **Run Integration Tests**
   - Verify sandbox lifecycle
   - Test seed manifest application
   - Validate event publishing

3. **Monitor Metrics**
   - Check sandbox creation rate
   - Monitor active sandboxes
   - Track validation latency

4. **Production Readiness**
   - Enable TLS for NATS
   - Configure sampling strategy
   - Setup alerting rules
   - Create runbooks

## Resources

- [NATS Documentation](https://docs.nats.io/)
- [OpenTelemetry Go](https://opentelemetry.io/docs/instrumentation/go/)
- [Jaeger](https://www.jaegertracing.io/)
- [Prometheus](https://prometheus.io/)
- [Main README](./README.md)
- [Phase 4 Completion Report](./PHASE4_COMPLETE.md)
