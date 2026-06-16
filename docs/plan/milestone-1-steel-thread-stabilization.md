# Milestone 1: Steel Thread Stabilization

## Objective
Establish one reliable user path from authentication to lab start to live sandbox session to submission to teardown.

## Current State
- The gateway, frontend, and orchestrator all build successfully.
- The orchestrator already exposes sandbox lifecycle, terminal streaming, resource watching, and validation primitives.
- The frontend already has lab detail, session, and live lab pages, but the route shape is inconsistent.
- The frontend calls APIs for submissions and solutions that are not currently implemented in the gateway route layer.
- Some gateway routes still use raw SQL against tables and columns that do not match the active Drizzle schema.

## In Scope
- Align frontend routes so one live lab session flow is canonical.
- Implement the missing submissions and solutions APIs already referenced by the frontend.
- Persist submission records when lab validation is run.
- Replace schema-drifted raw SQL in user, progress, and daily-task routes with schema-aligned queries.
- Normalize shared DTOs for lab start, lab detail, submissions, and session state.
- Unify token handling so HTTP and websocket clients use a consistent access-token source.
- Verify teardown works from the UI and clears the active session cleanly.

## Out of Scope
- Passkey or cookie-session rollout.
- Warm pool optimization.
- New grading capabilities beyond persistence and feedback wiring.
- Production-scale infrastructure changes.

## Deliverables
- A single supported route for entering and using a live lab session.
- Gateway support for:
  - `GET /submissions`
  - `GET /labs/:id/solutions`
  - durable submission creation during lab submission
- Schema-aligned progress, user, and daily-task handlers.
- Shared request and response contracts that match between gateway and frontend.
- A verified happy path from login to teardown.

## Dependencies
- Existing orchestrator gRPC APIs remain the backend execution primitive.
- Existing Postgres schema remains the source of truth for application data.

## Acceptance Criteria
- A user can register or log in and reach the labs UI.
- A user can start a lab and receive a valid sandbox session payload.
- The live lab session renders without depending on missing routes.
- Submission history is visible in the UI through implemented APIs.
- Submitting a lab creates a durable submission record and returns per-check feedback.
- The user can disconnect or tear down the session from the UI without leaving orphaned app state.

## Verification
- Build `gateway` and `frontend`.
- Run `go test ./...` in `orchestrator`.
- Add or update gateway tests covering submissions, solutions, and schema-aligned user/progress endpoints.
- Add one end-to-end test for the auth -> start lab -> live session -> submit -> teardown flow.

## Risks
- Existing frontend components may duplicate responsibility for session rendering.
- Schema drift is likely broader than the first set of broken routes and may surface additional cleanup tasks once queries are normalized.
