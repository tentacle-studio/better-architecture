# V1 Implementation Specs — Index

Detailed implementation specifications for all components described in `docs/plans/v1-plan.md`, split into 10 standalone files for easy navigation.

---

## Specs

| # | File | Component | Summary |
|---|------|-----------|---------|
| 01 | [01-go-orchestrator.md](./01-go-orchestrator.md) | Go Infrastructure Orchestrator | gRPC service managing vCluster lifecycle, terminal exec, and resource watching |
| 02 | [02-fastify-gateway.md](./02-fastify-gateway.md) | Node.js / Fastify API Gateway | REST + WebSocket gateway handling auth, lab sessions, and real-time state sync |
| 03 | [03-temporal-workflows.md](./03-temporal-workflows.md) | Temporal Workflow Orchestration | Resilient workflows for lab provisioning, compensation, and cleanup |
| 04 | [04-database.md](./04-database.md) | PostgreSQL + Citus Database | Full schema, distributed tables, and indexes for the learning platform |
| 05 | [05-realtime-pipeline.md](./05-realtime-pipeline.md) | Real-time Visualization Pipeline | eBPF traffic capture → NATS JetStream → frontend canvas dot animation |
| 06 | [06-validation-engine.md](./06-validation-engine.md) | Validation Engine ("The Judge") | State, liveness, and SLA checks for automated quiz grading |
| 07 | [07-frontend.md](./07-frontend.md) | Frontend Integration & Remaining Work | New FSD slices, E2B replacement, canvas live data, and new pages |
| 08 | [08-security.md](./08-security.md) | Security & Isolation | ResourceQuotas, NetworkPolicies, IMDS blocking, pod security standards |
| 09 | [09-observability.md](./09-observability.md) | Observability (OpenTelemetry) | Tracing spans, custom metrics, and OTel as a gameplay mechanic |
| 10 | [10-phases.md](./10-phases.md) | Phased Delivery Map | Four implementation phases with per-phase checklists and deliverables |

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Core Orchestrator | Go 1.22+, `client-go`, `controller-runtime`, gRPC |
| API Gateway | TypeScript, Fastify, `@fastify/websocket`, `@grpc/grpc-js` |
| Workflow Engine | Temporal.io (Go worker) |
| Sandboxing | vCluster (K3s-based Helm chart) |
| Messaging | NATS JetStream |
| Persistence | PostgreSQL + Citus |
| Observability | OpenTelemetry (Go SDK + JS SDK) |
| Traffic Capture | eBPF (`cilium-ebpf`) DaemonSet |
| Frontend | React 19, TypeScript, Vite, FSD architecture, Zustand |
