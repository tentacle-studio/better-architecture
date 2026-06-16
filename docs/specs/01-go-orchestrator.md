# 01 — Go Infrastructure Orchestrator

gRPC service written in Go that manages vCluster lifecycle, terminal exec streaming into pods, and real-time Kubernetes resource watching.

**Service name:** `orchestrator`  
**Language:** Go 1.22+  
**Key deps:** `client-go`, `controller-runtime`, `vcluster` SDK, `nats.go`, OpenTelemetry Go SDK

---

## 1.1 Project Structure

```
orchestrator/
├── cmd/
│   └── orchestrator/main.go       # Entrypoint, DI wiring
├── internal/
│   ├── vcluster/                   # vCluster lifecycle manager
│   │   ├── provisioner.go          # Create/delete vCluster instances
│   │   ├── health.go               # Readiness polling
│   │   └── types.go                # VClusterConfig, VClusterStatus
│   ├── k8s/                        # Low-level K8s client wrappers
│   │   ├── client.go               # client-go factory, kubeconfig
│   │   ├── namespace.go            # Namespace CRUD + labels
│   │   ├── networkpolicy.go        # NetworkPolicy templates
│   │   └── exec.go                 # SPDY exec into pods
│   ├── sandbox/                    # High-level sandbox abstraction
│   │   ├── manager.go              # Create/destroy sandbox sessions
│   │   └── seed.go                 # Deploy seed data into vCluster
│   ├── judge/                      # Validation engine
│   │   ├── engine.go               # Orchestrate checks
│   │   ├── state_check.go          # Query vCluster API for state
│   │   ├── liveness_check.go       # Tester pod connectivity
│   │   └── sla_check.go            # OTel latency verification
│   ├── grpc/                       # gRPC server for gateway comms
│   │   ├── server.go
│   │   └── proto/orchestrator.proto
│   └── config/                     # Env-based config loader
├── deploy/
│   ├── Dockerfile
│   └── helm/orchestrator/
└── go.mod
```

---

## 1.2 gRPC API Surface

The gateway communicates with the orchestrator via gRPC (not REST) for type-safety and streaming.

```protobuf
service Orchestrator {
  // Sandbox lifecycle
  rpc CreateSandbox(CreateSandboxRequest) returns (CreateSandboxResponse);
  rpc DestroySandbox(DestroySandboxRequest) returns (Empty);
  rpc GetSandboxStatus(GetSandboxStatusRequest) returns (SandboxStatus);

  // Terminal exec — bidirectional stream
  rpc ExecStream(stream ExecInput) returns (stream ExecOutput);

  // Validation
  rpc ValidateQuiz(ValidateQuizRequest) returns (ValidateQuizResponse);

  // Sandbox resource state — server-side stream for real-time updates
  rpc WatchResources(WatchResourcesRequest) returns (stream ResourceEvent);
}

message CreateSandboxRequest {
  string user_id = 1;
  string quiz_id = 2;
  string seed_manifest = 3;  // base64-encoded K8s YAML
}

message CreateSandboxResponse {
  string sandbox_id = 1;
  string vcluster_endpoint = 2;
  string kubeconfig = 3;  // scoped kubeconfig for this sandbox
}

message ExecInput {
  string sandbox_id = 1;
  bytes stdin = 2;
  TerminalResize resize = 3;
}

message ExecOutput {
  bytes stdout = 1;
  bytes stderr = 2;
}

message ValidateQuizRequest {
  string sandbox_id = 1;
  string quiz_id = 2;
  repeated Check checks = 3;
}

message Check {
  enum Type { STATE = 0; LIVENESS = 1; SLA = 2; }
  Type type = 1;
  string spec_json = 2;  // check-type-specific config
}

message ValidateQuizResponse {
  bool passed = 1;
  repeated CheckResult results = 2;
  int32 score = 3;
}

message ResourceEvent {
  string kind = 1;       // Pod, Service, Deployment, etc.
  string name = 2;
  string namespace = 3;
  string status = 4;     // Running, Pending, Failed, etc.
  string json_patch = 5; // delta update
}
```

---

## 1.3 vCluster Lifecycle

| Step | Action | Detail |
|------|--------|--------|
| 1 | **Create namespace** | `sandbox-{userId}-{quizId}-{shortUUID}`, apply ResourceQuota + LimitRange |
| 2 | **Deploy vCluster** | Helm install K3s-based vCluster chart into namespace. Sync resources: Pods, Services, ConfigMaps only |
| 3 | **Wait for ready** | Poll vCluster API server health endpoint (max 90s, 2s interval). Exponential backoff on failure |
| 4 | **Apply NetworkPolicy** | Deny all ingress/egress except: DNS (kube-dns), intra-namespace traffic, tester pod CIDR |
| 5 | **Seed data** | Apply the quiz's "starting state" manifest inside the vCluster (e.g., broken nginx, partial deployment) |
| 6 | **Return kubeconfig** | Generate a scoped kubeconfig pointing to the vCluster API server, valid for session TTL (default: 2h) |

**Cleanup (on session end or TTL expiry):**
1. Delete all resources inside vCluster
2. `helm uninstall` the vCluster release
3. Delete the host namespace
4. Remove NATS subjects for this sandbox

---

## 1.4 Terminal Exec Bridge

- Uses K8s SPDY protocol via `client-go`'s `remotecommand` package
- The `ExecStream` gRPC method maps to `kubectl exec -it` semantics
- **Flow:** Browser → WebSocket (gateway) → gRPC stream (orchestrator) → SPDY exec (vCluster pod)
- Supports `resize` messages for terminal dimension changes
- Target pod: user-specified or default shell pod in vCluster namespace
