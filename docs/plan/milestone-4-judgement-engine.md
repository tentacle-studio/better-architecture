# Milestone 4: Judgement Engine

## Objective
Turn the existing validation primitives into a complete, durable grading pipeline for authored labs.

## Current State
- The orchestrator already contains a judge engine with state, liveness, and SLA checks.
- The gateway already calls validation on lab submission and can return check feedback.
- Submission persistence and progress integration are incomplete.
- Lab authoring rules for checks, feedback, and solution unlocking are not yet fully formalized in the application flow.

## In Scope
- Persist full grading results for every submission.
- Define stable authored check specifications for supported check types.
- Connect grading outcomes to submission history, XP updates, progress surfaces, and solution unlock rules.
- Normalize check result payloads across orchestrator, gateway, and frontend.
- Make grading deterministic for repeated submissions against the same sandbox state.
- Add the minimum authoring and validation workflow needed for current labs.

## Out of Scope
- Broad chaos-testing expansion as a default grading mode.
- Advanced load-controller orchestration beyond what is needed for the supported authored checks.

## Deliverables
- Durable submission records with per-check results, score, and XP awarded.
- Stable check-spec format for state, liveness, and SLA checks.
- UI support for viewing submission outcomes and unlock state based on actual grading records.
- Consistent grading feedback returned from the gateway.

## Dependencies
- Milestone 1 must provide working submission APIs and persistence wiring.
- Milestone 3 should provide the observability and telemetry path used by SLA-oriented checks.

## Acceptance Criteria
- Every seeded lab has executable authored checks with stable expected inputs.
- Submitting a lab stores the full result and makes it queryable from the UI.
- XP and progress changes derive from persisted grading results rather than transient UI state.
- Re-running the same graded state yields the same pass/fail and score result.

## Verification
- Add orchestrator tests for authored check-spec handling.
- Add gateway tests for submission persistence and score/XP propagation.
- Add frontend tests for submission history rendering and solution unlock behavior.

## Risks
- If check authoring remains loosely defined, labs will drift and grading behavior will become difficult to trust.
- Progress and XP bugs will be hard to diagnose if grading writes are not the authoritative source for those updates.
