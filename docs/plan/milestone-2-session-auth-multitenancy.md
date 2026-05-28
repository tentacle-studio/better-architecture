# Milestone 2: Session, Auth, and Multi-Tenancy

## Objective
Make sandbox lifecycle state durable, authoritative, and tenant-safe across the gateway, orchestrator, and frontend.

## Current State
- The gateway already has JWT access and refresh-token flows.
- Redis is used for session and refresh-token storage, but session truth is still too ephemeral.
- The orchestrator keeps active sandbox references in process memory.
- Ownership checks exist on route and websocket paths, but they rely on current-process session state.

## In Scope
- Persist sandbox sessions in Postgres as the source of truth.
- Define and enforce lifecycle states such as `PROVISIONING`, `READY`, `FAILED`, `TERMINATING`, and `TERMINATED`.
- Synchronize session state across Temporal, orchestrator, gateway, and UI.
- Keep Redis as cache or TTL acceleration rather than the only session store.
- Harden the current JWT plus refresh-token model.
- Enforce ownership checks against persisted session state for REST and websocket access.
- Add expiry and cleanup handling for stale or abandoned sessions.

## Out of Scope
- Full passkey rollout.
- OpenFGA or relationship-graph authorization.
- Advanced workspace or organization models.

## Deliverables
- A persisted sandbox session model with explicit lifecycle transitions.
- Gateway and frontend contracts for querying authoritative session status.
- Recovery behavior for service restarts without losing active session state.
- Cleanup logic for expired sessions and failed provisioning attempts.

## Dependencies
- Milestone 1 must establish a stable single session flow.
- Temporal workflow outputs and gateway persistence logic must agree on session identifiers and status transitions.

## Acceptance Criteria
- Active sessions survive gateway restarts without becoming unusable.
- REST and websocket access for a sandbox session is blocked if the authenticated user does not own that session.
- Session status visible in the UI reflects persisted truth rather than optimistic local state.
- Expired or failed sessions transition predictably and are eligible for cleanup.

## Verification
- Add integration tests for persisted session lifecycle transitions.
- Add recovery tests simulating gateway or orchestrator restart with an active session.
- Add authorization tests for cross-user REST and websocket access attempts.

## Risks
- There is a risk of split-brain state if orchestrator memory and persisted gateway state diverge.
- Status transitions can become inconsistent if Temporal, orchestrator, and gateway each define their own lifecycle semantics.
