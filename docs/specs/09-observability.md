# 09 — Observability (OpenTelemetry)

OpenTelemetry-based tracing and metrics across Go and Node.js services, with OTel latency data doubling as the core mechanic for SLA-check labs.

---

## 9.1 Tracing

Both Go and Node.js services export traces to an OTel Collector.

**Key spans:**
- `gateway.http.request` — every REST request
- `gateway.ws.message` — WebSocket message processing
- `orchestrator.vcluster.create` — vCluster provisioning
- `orchestrator.exec.stream` — terminal exec duration
- `judge.validate` — quiz validation
- `temporal.workflow.setup_lab` — full workflow duration

---

## 9.2 Metrics

| Metric | Type | Labels | Purpose |
|--------|------|--------|---------|
| `sandbox_provision_duration_s` | Histogram | `quiz_id`, `status` | Track provisioning latency |
| `sandbox_active_count` | Gauge | — | Current active sandboxes |
| `quiz_submission_total` | Counter | `quiz_id`, `passed` | Submission tracking |
| `ws_connections_active` | Gauge | `type` (terminal/canvas/traffic) | WebSocket connection count |
| `traffic_events_per_second` | Counter | `sandbox_id` | NATS throughput |

---

## 9.3 Gameplay Mechanic

For SLA-check labs, the OTel data is **the core mechanic** — students must optimize their architecture until the p95 latency reported by OTel drops below the threshold. The frontend displays a live "Latency Dashboard" widget showing:

- Current p50, p95, p99 latencies
- Time-series chart of request latency over the lab session
- Pass/fail indicator against target threshold
