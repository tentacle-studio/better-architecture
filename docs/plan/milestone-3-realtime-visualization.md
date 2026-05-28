# Milestone 3: Real-Time Visualization

## Objective
Complete the live topology and traffic visualization path so the canvas uses one authoritative event stream for resource and traffic updates.

## Current State
- The gateway already exposes websocket handlers for terminal, canvas, traffic, and resources.
- The frontend currently consumes the resource stream for canvas synchronization instead of the dedicated canvas stream.
- Resource watching is functional, but the intended batched event model is only partially integrated.
- NATS support exists in the gateway and orchestrator, but the end-to-end canvas event contract is not yet unified.

## In Scope
- Make `/ws/canvas/:sandboxId` the canonical live canvas feed.
- Define one shared event schema for resource, traffic, and batch messages.
- Update the frontend live lab UI to consume the canonical canvas stream.
- Keep `/ws/resources/:sandboxId` as an operational or debug-oriented stream only.
- Wire NATS-backed traffic events into the same product-level event model.
- Define reconnect and initial-state behavior for the live canvas.

## Out of Scope
- Advanced shader or animation polish beyond the stable event/data model.
- New nonessential telemetry surfaces that are not needed for the live lab UX.

## Deliverables
- A shared websocket event contract used by gateway and frontend.
- A frontend canvas sync path that no longer depends on the resource-only stream.
- Stable batching and reconnect behavior for resource and traffic updates.
- Clear separation between product streams and diagnostic streams.

## Dependencies
- Milestone 1 must stabilize the live session entry path.
- Milestone 2 should provide durable sandbox identity and ownership.

## Acceptance Criteria
- Opening a live lab session renders resource topology from the canonical canvas feed.
- Traffic or topology changes update the UI through one event stream, not overlapping parallel streams.
- Reconnect behavior restores the live canvas state without manual refresh.
- Product-level websocket contracts are shared and versionable.

## Verification
- Add gateway websocket contract tests for canvas event payloads.
- Add frontend integration tests for reconnect and event application behavior.
- Add end-to-end verification that a live session receives both resource and traffic updates.

## Risks
- Multiple websocket paths with overlapping purpose can continue to drift unless one path is explicitly deprecated for product use.
- Event batching can hide ordering bugs if the canonical schema is not defined carefully.
