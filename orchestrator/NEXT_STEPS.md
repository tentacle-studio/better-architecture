# Next Steps - Go Orchestrator

## Immediate Actions (To Get Running)

### 1. Install Dependencies & Generate Code

```bash
cd orchestrator

# Install protobuf compiler plugins
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest

# Download Go dependencies
go mod download
go mod tidy

# Generate protobuf code
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    internal/grpc/proto/orchestrator.proto
```

Or simply:
```bash
make install-tools
make deps
make proto
```

### 2. Build & Test

```bash
# Build the binary
make build

# The binary will be at: bin/orchestrator
```

### 3. Resolve Import Errors

The current import errors will be automatically resolved after running the commands above. They exist because:
- Dependencies haven't been downloaded (`go mod tidy` fixes this)
- Protobuf code hasn't been generated (`make proto` fixes this)

## Feature Implementation Priority

### Phase 1: Core Functionality (Week 1-2)

#### 1.1 Helm vCluster Integration
**File**: `internal/vcluster/provisioner.go`

```go
func (p *Provisioner) deployVCluster(ctx context.Context) error {
    // TODO: Implement Helm chart installation
    // Use: helm.sh/helm/v3/pkg/action
    // Install vCluster chart from p.config.ChartRepo
    // Wait for deployment to be ready
}

func (p *Provisioner) uninstallVCluster(ctx context.Context) error {
    // TODO: Implement Helm chart uninstallation
    // Use: helm.sh/helm/v3/pkg/action
    // Uninstall vCluster release
}
```

**Dependencies to add**:
```bash
go get helm.sh/helm/v3/pkg/action
go get helm.sh/helm/v3/pkg/cli
```

#### 1.2 vCluster Health Checking
**File**: `internal/vcluster/health.go`

```go
func (h *HealthChecker) checkHealth(ctx context.Context, namespace, vclusterName string) (bool, error) {
    // TODO: Implement health check
    // 1. Get vCluster service endpoint
    // 2. Create HTTP client
    // 3. Query /healthz or /readyz endpoint
    // 4. Return true if status is 200
}
```

#### 1.3 Kubeconfig Generation
**File**: `internal/k8s/client.go`

```go
func (c *Client) CreateVClusterKubeconfig(ctx context.Context, namespace, vclusterName string) (string, error) {
    // TODO: Implement kubeconfig generation
    // 1. Get vCluster service endpoint
    // 2. Extract CA cert from vCluster secret
    // 3. Create service account token
    // 4. Build kubeconfig YAML
    // 5. Return base64-encoded kubeconfig
}
```

### Phase 2: Validation Engine (Week 3)

#### 2.1 State Check Implementation
**File**: `internal/judge/state_check.go`

```go
func (c *StateChecker) getResourceState(ctx context.Context, spec StateCheckSpec) (map[string]string, error) {
    // TODO: Query Kubernetes API
    // 1. Use dynamic client to get resource
    // 2. Extract relevant fields based on spec.ResourceType
    // 3. Return as map[string]string
}
```

#### 2.2 Liveness Check Implementation
**File**: `internal/judge/liveness_check.go`

```go
func (c *LivenessChecker) testConnectivity(ctx context.Context, spec LivenessCheckSpec) (bool, error) {
    // TODO: Deploy tester pod
    // 1. Create a pod in the sandbox namespace
    // 2. Exec curl/wget to test connectivity
    // 3. Check response code
    // 4. Clean up tester pod
    // 5. Return connectivity status
}
```

#### 2.3 SLA Check Implementation
**File**: `internal/judge/sla_check.go`

```go
func (c *SLAChecker) queryOTelMetrics(ctx context.Context, spec SLACheckSpec) (*OTelMetrics, error) {
    // TODO: Query OpenTelemetry
    // 1. Connect to OTel collector
    // 2. Query metrics for the observation window
    // 3. Calculate avg latency and success rate
    // 4. Return metrics
}
```

**Dependencies to add**:
```bash
go get go.opentelemetry.io/otel/sdk/metric
go get go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetricgrpc
```

### Phase 3: Streaming & Real-time (Week 4)

#### 3.1 Terminal Exec Streaming
**File**: `internal/grpc/server.go`

```go
func (s *Server) ExecStream(stream pb.Orchestrator_ExecStreamServer) error {
    // TODO: Implement bidirectional streaming
    // 1. Get sandbox from first message
    // 2. Find target pod in sandbox
    // 3. Create SPDY executor
    // 4. Set up stdin/stdout/stderr pipes
    // 5. Handle resize events
    // 6. Stream I/O bidirectionally
}
```

#### 3.2 Resource Watching
**File**: `internal/grpc/server.go`

```go
func (s *Server) WatchResources(req *pb.WatchResourcesRequest, stream pb.Orchestrator_WatchResourcesServer) error {
    // TODO: Implement resource watching
    // 1. Get sandbox namespace
    // 2. Create informers for Pods, Services, Deployments
    // 3. Set up event handlers
    // 4. Stream events to client
    // 5. Handle client disconnect
}
```

**Dependencies to add**:
```bash
go get k8s.io/client-go/informers
```

### Phase 4: Integration & Polish (Week 5)

#### 4.1 Seed Manifest Application
**File**: `internal/sandbox/seed.go`

```go
func (s *Seeder) ApplyManifest(ctx context.Context, namespace, manifest string) error {
    // TODO: Apply YAML manifest
    // 1. Parse YAML into K8s objects
    // 2. Use dynamic client to apply each object
    // 3. Wait for resources to be created
    // 4. Return any errors
}
```

#### 4.2 NATS Integration
**New file**: `internal/events/publisher.go`

```go
type Publisher struct {
    nc *nats.Conn
}

func (p *Publisher) PublishSandboxEvent(sandboxID, eventType string, data interface{}) error {
    // TODO: Publish to NATS
    // Subject: sandbox.{sandboxID}.{eventType}
}
```

#### 4.3 OpenTelemetry Tracing
**File**: `cmd/orchestrator/main.go`

```go
func initTracing(cfg *config.Config) (*trace.TracerProvider, error) {
    // TODO: Initialize OTel tracing
    // 1. Create OTLP exporter
    // 2. Set up tracer provider
    // 3. Register as global tracer
}
```

## Testing Strategy

### Unit Tests
Create `*_test.go` files for each package:

```bash
# Example structure
internal/sandbox/manager_test.go
internal/vcluster/provisioner_test.go
internal/judge/engine_test.go
```

### Integration Tests
Create `test/integration/` directory:

```bash
test/integration/
├── sandbox_test.go      # End-to-end sandbox lifecycle
├── validation_test.go   # Validation engine tests
└── exec_test.go         # Terminal exec tests
```

### E2E Tests
Use a real Kubernetes cluster (kind/minikube):

```bash
test/e2e/
├── setup.sh             # Create test cluster
├── orchestrator_test.go # Full workflow tests
└── teardown.sh          # Cleanup
```

## Dependencies to Add

Add these to `go.mod` as you implement features:

```go
require (
    // Helm integration
    helm.sh/helm/v3 v3.13.0
    
    // Additional K8s tools
    k8s.io/client-go v0.29.0
    k8s.io/apimachinery v0.29.0
    k8s.io/api v0.29.0
    
    // UUID generation
    github.com/google/uuid v1.5.0
    
    // NATS
    github.com/nats-io/nats.go v1.31.0
    
    // OpenTelemetry
    go.opentelemetry.io/otel v1.21.0
    go.opentelemetry.io/otel/sdk v1.21.0
    go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc v1.21.0
    
    // gRPC
    google.golang.org/grpc v1.60.1
    google.golang.org/protobuf v1.31.0
)
```

## Monitoring & Observability

### Metrics to Add
```go
// internal/metrics/metrics.go
var (
    sandboxesCreated = prometheus.NewCounter(...)
    sandboxesActive = prometheus.NewGauge(...)
    validationDuration = prometheus.NewHistogram(...)
)
```

### Logging
Use structured logging:
```bash
go get go.uber.org/zap
```

## Documentation to Update

As you implement features, update:
1. `README.md` - Mark features as complete
2. `IMPLEMENTATION.md` - Update status percentages
3. API documentation - Add examples
4. Helm chart README - Document values

## Deployment Checklist

Before production deployment:
- [ ] All unit tests passing
- [ ] Integration tests passing
- [ ] E2E tests passing
- [ ] Security audit (RBAC, network policies)
- [ ] Performance testing (concurrent sandboxes)
- [ ] Resource limits tuned
- [ ] Monitoring dashboards created
- [ ] Runbook documentation
- [ ] Disaster recovery plan

## Questions to Answer

1. **vCluster Version**: Which vCluster version to use? (Currently: 0.19.0)
2. **Resource Limits**: What are the actual limits per sandbox?
3. **TTL Enforcement**: How to clean up expired sandboxes?
4. **Multi-tenancy**: How to isolate users?
5. **Persistence**: Do we need to persist sandbox state?

## Getting Help

- vCluster docs: https://www.vcluster.com/docs
- Kubernetes client-go: https://github.com/kubernetes/client-go
- gRPC Go: https://grpc.io/docs/languages/go/
- Helm SDK: https://helm.sh/docs/topics/advanced/

## Success Criteria

The orchestrator is complete when:
- ✅ Can create and destroy vClusters via gRPC
- ✅ Terminal exec works with real pods
- ✅ Validation checks return accurate results
- ✅ Resource watching streams real-time updates
- ✅ All tests pass
- ✅ Deployed to staging environment
- ✅ Documentation is complete
