# 06 — Validation Engine ("The Judge")

Automated grading system inside the Go orchestrator that runs three check types — state, liveness, and SLA — against a user's live vCluster sandbox to produce a score.

Located in `orchestrator/internal/judge/`

---

## 6.1 State Check

Queries the vCluster API server to verify Kubernetes resource state.

**Spec format:**
```json
{
  "checks": [
    {
      "kind": "Pod",
      "name": "nginx-pod",
      "namespace": "default",
      "conditions": {
        "status.phase": "Running",
        "spec.containers[0].image": "nginx:latest",
        "spec.containers[0].ports[0].containerPort": 80
      }
    },
    {
      "kind": "Deployment",
      "name": "web",
      "namespace": "default",
      "conditions": {
        "spec.replicas": 3,
        "status.availableReplicas": 3
      }
    }
  ]
}
```

**Implementation:**
- Use `client-go` dynamic client to fetch resources by GVR
- JSONPath evaluation for condition matching
- Return per-check pass/fail with actual vs expected values

---

## 6.2 Liveness Check

Deploys a temporary "tester pod" inside the vCluster and verifies network connectivity.

**Spec format:**
```json
{
  "target": "nginx-pod",
  "port": 80,
  "method": "HTTP_GET",
  "path": "/",
  "expected_status": 200,
  "timeout_ms": 5000
}
```

**Implementation:**
1. Deploy tester pod (`curlimages/curl:latest`) in vCluster's default namespace
2. Exec into tester pod: `curl -s -o /dev/null -w "%{http_code}" http://<target>:<port><path>`
3. Compare output to `expected_status`
4. Clean up tester pod after check
5. Max timeout enforced at activity level

---

## 6.3 SLA Check

Uses OpenTelemetry trace data to verify latency SLAs.

**Spec format:**
```json
{
  "service": "nginx-pod",
  "metric": "p95_latency_ms",
  "threshold": 200,
  "sample_duration_s": 30
}
```

**Implementation:**
1. Query OTel collector's Prometheus-compatible endpoint for the sandbox's namespace
2. PromQL: `histogram_quantile(0.95, rate(http_request_duration_ms_bucket{namespace="sandbox-..."}[30s]))`
3. Compare result against threshold
4. Requires OTel instrumented traffic generator (included in seed data for SLA-type labs)

---

## 6.4 Scoring

```
total_score = sum(check.points for check in passed_checks)
max_score = sum(check.points for all checks)
passed = (total_score / max_score) >= quiz.passing_threshold  # default 0.8
xp_awarded = passed ? base_xp * (total_score / max_score) : 0
```
