# Milestone 5: Production Hardening and Scale

## Objective
Harden the completed product for operational reliability, security, and controlled scale.

## Current State
- Core application subsystems exist, but cleanup guarantees, performance budgets, and production gates are not yet proven.
- The frontend build already reports a large chunk warning, which is an early sign that bundle discipline is needed.
- Session durability, cleanup behavior, and canonical realtime contracts must be completed before scale-oriented work is useful.

## In Scope
- Implement reliable cleanup and expiry guarantees for sandboxes and related control-plane state.
- Add warm pool management only after the core session lifecycle is stable.
- Add CI gates for build health, tests, coverage, and security scanning.
- Add frontend bundle controls such as route-level code splitting where needed.
- Establish observability for provisioning latency, teardown latency, failed cleanup, and session churn.
- Prepare production deployment baselines for gateway, orchestrator, and supporting infrastructure configuration.

## Out of Scope
- Premature infrastructure expansion before session lifecycle and grading flows are stable.
- Large-scale cost optimization before baseline production reliability is measured.

## Deliverables
- Cleanup and expiry workflows with measurable success criteria.
- CI policy for coverage, security, and build regressions.
- Warm pool design and implementation tied to measured provisioning latency.
- Bundle-size and performance controls for the frontend.
- Production deployment runbooks or configuration baselines for core services.

## Dependencies
- Milestones 1 through 4 must stabilize product behavior first.
- Observability signals from gateway and orchestrator must be in place before hardening can be measured.

## Acceptance Criteria
- Sandbox teardown and cleanup are measurable and reliable.
- Performance, coverage, and security gates fail CI when budgets are exceeded.
- Frontend bundle growth is controlled and tracked.
- Warm pool logic is based on observed latency data, not assumptions.

## Verification
- Add automated checks for cleanup timing and failure alerting.
- Add CI jobs for security scanning and coverage enforcement.
- Track frontend build size and flag regressions.
- Run production-like deployment verification for gateway and orchestrator charts or manifests.

## Risks
- Hardening work will be wasted if earlier milestones leave contract drift or session inconsistency unresolved.
- Warm pool work can mask provisioning problems instead of fixing them if introduced too early.
