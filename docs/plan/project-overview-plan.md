# Atoll Engineering Roadmap

This document is the top-level roadmap for the Atoll platform. It summarizes the product direction, current implementation status, milestone sequencing, and cross-cutting delivery criteria. Detailed implementation plans for each milestone live in separate files in this folder.

## Vision
Atoll is a high-fidelity system design and DevOps learning platform. It replaces static multiple-choice content with interactive labs backed by isolated infrastructure, live terminals, topology visualization, and automated grading.

## Current State Snapshot
The repository is beyond the initial scaffold phase, but it is not yet production-ready end to end.

- The orchestrator is the strongest subsystem. It already includes gRPC sandbox lifecycle APIs, Temporal-based setup workflows, terminal streaming, resource watching, a judge engine, and passing Go tests.
- The gateway is functional enough to compile and expose auth, lab, websocket, and observability routes, but part of the route layer still drifts from the active database schema and frontend expectations.
- The frontend already contains authenticated pages, lab browsing, live session UI, resource streaming, and submission flows, but some routes and API integrations are inconsistent with the backend.
- The main delivery risk is integration drift, not lack of primitives.

## Architecture Summary

```text
[ React Frontend: Terminal + Canvas + Session UI ]
                    |
          (HTTPS + WebSockets)
                    |
       [ Fastify Gateway / API Layer ]
            |                    |
         (gRPC)               (NATS)
            |                    |
      [ Go Orchestrator ]   [ Event / Telemetry Bus ]
            |
      [ Kubernetes Host Cluster ]
            |
      [ Per-user vCluster Sandbox ]
```

## Milestone Timeline

| Milestone | Focus | Status View | Detail |
| :--- | :--- | :--- | :--- |
| Milestone 1 | Steel thread stabilization | Required first | [milestone-1-steel-thread-stabilization.md](./milestone-1-steel-thread-stabilization.md) |
| Milestone 2 | Session, auth, and multi-tenancy | Builds on M1 | [milestone-2-session-auth-multitenancy.md](./milestone-2-session-auth-multitenancy.md) |
| Milestone 3 | Real-time visualization | Builds on M1-M2 | [milestone-3-realtime-visualization.md](./milestone-3-realtime-visualization.md) |
| Milestone 4 | Judgement engine completion | Builds on M1-M3 | [milestone-4-judgement-engine.md](./milestone-4-judgement-engine.md) |
| Milestone 5 | Production hardening and scale | Final hardening | [milestone-5-production-hardening.md](./milestone-5-production-hardening.md) |

## Milestone Summary

### Milestone 1: Steel Thread Stabilization
Establish one reliable end-to-end path from auth to lab start to live session to submission to teardown. This milestone focuses on fixing missing routes, schema drift, DTO mismatches, and fragmented live-session UX.

### Milestone 2: Session, Auth, and Multi-Tenancy
Make sandbox lifecycle state durable and authoritative across gateway, orchestrator, and UI. Harden the current JWT/refresh-token model and enforce ownership and isolation around persisted session state.

### Milestone 3: Real-Time Visualization
Finish the intended live canvas architecture by making one websocket/event model authoritative for topology and traffic updates. Consolidate NATS-backed event handling and reconnect behavior.

### Milestone 4: Judgement Engine
Turn the current validation primitives into a complete authored grading pipeline with durable submission records, per-check feedback, XP updates, and stable lab check specifications.

### Milestone 5: Production Hardening
Focus on cleanup guarantees, warm pools, CI and security gates, bundle control, operational observability, and production deployment baselines after the core product flow is stable.

## Cross-Cutting Risks

| Risk | Current Concern | Mitigation Direction |
| :--- | :--- | :--- |
| Integration drift | Frontend and gateway already disagree on some route and schema contracts | Treat shared DTOs and route contracts as milestone deliverables |
| Session durability | Active sandbox state currently relies too heavily on ephemeral process memory | Move lifecycle truth to persisted session records |
| Realtime complexity | Multiple websocket paths overlap in responsibility | Define one canonical stream per product capability |
| Operational cleanup | Sandbox teardown and expiry guarantees are not yet fully proven | Add cleanup workflows, metrics, and recovery checks before hardening |

## Global Definition of Done
A milestone is complete only when all of the following are true:

- The user-visible flow for that milestone works end to end without depending on undocumented manual recovery.
- All changed backend and frontend contracts are captured in code and reflected in tests.
- Build and test commands for affected services pass.
- Security, cleanup, and failure handling for the changed path are explicit rather than assumed.
- The milestone acceptance criteria in the corresponding detail doc are satisfied.
