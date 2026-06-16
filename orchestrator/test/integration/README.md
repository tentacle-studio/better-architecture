# Integration Tests

This directory contains integration tests for the orchestrator service.

## Prerequisites

- Access to a Kubernetes cluster (kind, minikube, or real cluster)
- `kubectl` configured to access the cluster
- Go 1.22 or later

## Running Tests

### Run all integration tests
```bash
cd orchestrator
go test -v ./test/integration/...
```

### Run specific test
```bash
go test -v ./test/integration/ -run TestSandboxLifecycle
```

### Skip integration tests (run only unit tests)
```bash
go test -short ./...
```

## Test Coverage

### Sandbox Lifecycle Tests (`sandbox_test.go`)
- **TestSandboxLifecycle**: End-to-end sandbox creation, retrieval, and destruction
  - CreateSandbox: Validates sandbox creation with proper ID and namespace
  - GetSandbox: Validates sandbox retrieval
  - DestroySandbox: Validates sandbox cleanup

### Seed Manifest Tests (`seed_test.go`)
- **TestSeedManifestApplication**: Tests YAML manifest application
  - ApplyManifest: Validates multi-document YAML parsing and resource creation

## Notes

- Integration tests require a real Kubernetes cluster
- Tests use `testing.Short()` to allow skipping in CI/CD
- Each test includes cleanup logic to prevent resource leaks
- Tests are isolated and can run in parallel

## Future Tests

- Terminal exec streaming
- Resource watching
- Validation engine
- NATS event publishing
- OpenTelemetry tracing
