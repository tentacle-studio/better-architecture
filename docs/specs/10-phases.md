# 10 — Phased Delivery Map

Four implementation phases that progress from a minimal steel-thread proof of concept to a production-ready, multi-tenant platform with live visualization and automated grading.

---

## Phase 1: Steel Thread (Weeks 1-4)

- [ ] Set up single-node K8s host (k3d or kind for dev)
- [ ] Go orchestrator: `CreateSandbox`, `DestroySandbox`, `ExecStream` (gRPC)
- [ ] Fastify gateway: Auth (hardcoded JWT for dev), `/labs/:id/start`, WS terminal proxy
- [ ] PostgreSQL: users, labs, sandbox_sessions tables (no Citus yet)
- [ ] Frontend: Replace E2B with WebSocket terminal, add auth guard, wire `/labs/:id/start`
- [ ] Temporal: `SetupLabEnvironment` + `CompensationWorkflow`

**Deliverable:** User can start a lab, get a terminal connected to a real vCluster pod, and run `kubectl` commands.

---

## Phase 2: Orchestration & Progress (Weeks 5-8)

- [ ] Temporal: `CleanupExpiredSandboxes` cron workflow
- [ ] PostgreSQL + Citus: full schema, user progress, daily tasks, streaks
- [ ] Gateway: All REST endpoints (progress, daily-tasks, roadmap, submissions)
- [ ] Frontend: Wire all pages to real APIs (dashboard, progress, daily-tasks, roadmap)
- [ ] Frontend: Lab detail page, submission history in sidebar
- [ ] XP + leveling system in gateway

**Deliverable:** Full learning platform loop — daily tasks, progress tracking, lab completion, XP awards.

---

## Phase 3: Visuals & Validation (Weeks 9-12)

- [ ] eBPF agent DaemonSet for traffic capture
- [ ] NATS JetStream setup + gateway consumer
- [ ] Frontend: Live resource visualization on canvas (pods, services as nodes)
- [ ] Frontend: Animated traffic dots from NATS events
- [ ] Judge: State check + liveness check validation
- [ ] Gateway: `/labs/:id/submit` wired to judge
- [ ] First 5 quiz specs authored (seed manifests + check definitions)

**Deliverable:** Interactive labs with live visualization and automated grading.

---

## Phase 4: Hardening & Scale (Weeks 13+)

- [ ] SLA check validation (OTel-based)
- [ ] gVisor / Kata Containers pod runtime
- [ ] Frontend: Latency dashboard widget for SLA labs
- [ ] Stress test: 50 concurrent sandboxes per node
- [ ] Global load balancing for gateway
- [ ] OIDC provider integration (Auth0 or Clerk)
- [ ] Image scanning pipeline (Trivy)
- [ ] Production Citus cluster (3 workers)

**Deliverable:** Production-ready, multi-tenant, hardened platform.
