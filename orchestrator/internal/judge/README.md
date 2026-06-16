# Validation Engine

The validation engine provides three types of checks to validate sandbox configurations and application behavior.

## Check Types

### 1. State Check
Validates Kubernetes resource state against expected values.

**Supported Resources**:
- Pods
- Deployments
- StatefulSets
- Services
- ConfigMaps
- Secrets
- Ingresses

**Example**:
```go
spec := StateCheckSpec{
    Name:         "deployment-ready",
    ResourceType: "deployment",
    ResourceName: "my-app",
    Namespace:    "default",
    ExpectedState: map[string]string{
        "replicas":       "3",
        "readyReplicas":  "3",
        "label.app":      "my-app",
    },
    Points: 10,
}
```

### 2. Liveness Check
Tests service connectivity by deploying a temporary tester pod.

**Features**:
- HTTP/HTTPS support
- Configurable expected response codes
- Automatic pod cleanup
- Timeout handling

**Example**:
```go
spec := LivenessCheckSpec{
    Name:          "api-reachable",
    TargetService: "api-service",
    TargetPort:    8080,
    Namespace:     "default",
    Protocol:      "http",
    ExpectedCode:  200,
    Points:        15,
}
```

### 3. SLA Check
Validates service performance metrics against SLA requirements.

**Metrics**:
- Average latency (ms)
- Success rate (percentage)

**Example**:
```go
spec := SLACheckSpec{
    Name:              "api-performance",
    MetricName:        "api-latency",
    MaxLatencyMs:      100.0,
    MinSuccessRate:    0.95,
    ObservationWindow: 60,
    Points:            20,
}
```

## Usage

```go
import "github.com/tentacle-studio/better-architecture/orchestrator/internal/judge"

// Create engine
engine := judge.NewEngine(k8sClient)

// Define checks
checks := []judge.Check{
    {
        Type:     judge.CheckTypeState,
        SpecJSON: `{"name":"check1","resource_type":"deployment",...}`,
    },
    {
        Type:     judge.CheckTypeLiveness,
        SpecJSON: `{"name":"check2","target_service":"api",...}`,
    },
}

// Run validation
result, err := engine.Validate(ctx, sandboxID, quizID, checks)
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Passed: %v, Score: %d\n", result.Passed, result.Score)
for _, r := range result.Results {
    fmt.Printf("- %s: %v (%s)\n", r.CheckName, r.Passed, r.Message)
}
```

## Testing

Run unit tests:
```bash
go test ./internal/judge/...
```

Run with coverage:
```bash
go test -cover ./internal/judge/...
```

## Implementation Details

### State Check Flow
1. Parse resource type to GVR (GroupVersionResource)
2. Query Kubernetes API using dynamic client
3. Extract relevant state fields
4. Compare with expected state
5. Return result

### Liveness Check Flow
1. Create tester pod with curl image
2. Wait for pod to be ready (60s timeout)
3. Execute curl command via SPDY
4. Parse HTTP response code
5. Clean up tester pod
6. Return result

### SLA Check Flow
1. Query OpenTelemetry metrics
2. Calculate average latency
3. Calculate success rate
4. Compare against thresholds
5. Return result

## Error Handling

All checks return `CheckResult` with:
- `Passed`: boolean indicating success
- `Message`: descriptive message
- `Points`: points awarded if passed

Errors during check execution are captured in the message field rather than failing the entire validation.

## Performance

- State checks: ~100-500ms (API query)
- Liveness checks: ~5-15s (pod creation + curl)
- SLA checks: ~100-300ms (metric query)

## Security

- Tester pods use minimal `curlimages/curl` image
- Pods are labeled for identification
- Automatic cleanup prevents resource leaks
- All operations respect namespace boundaries
