# 03 — Temporal Workflow Orchestration

Resilient Temporal workflows written in Go that guarantee atomic lab provisioning, automatic compensation on failure, and scheduled cleanup of expired sandboxes.

**Temporal server:** Self-hosted or Temporal Cloud  
**Worker language:** Go (runs inside orchestrator service or separate worker binary)

---

## 3.1 Workflow: `SetupLabEnvironment`

```
Workflow Input:
  - userId: string
  - quizId: string
  - seedManifest: string (base64 K8s YAML)
  - ttl: duration (default: 2h)

Activities (in order):
  1. CreateNamespace(userId, quizId) → namespaceName
  2. DeployVCluster(namespaceName) → vclusterReleaseName
  3. WaitUntilReady(namespaceName, vclusterReleaseName) → vclusterEndpoint
  4. ApplyNetworkPolicies(namespaceName)
  5. InitializeSeedData(vclusterEndpoint, seedManifest)
  6. VerifyReady(vclusterEndpoint) → SandboxInfo

Workflow Output:
  - sandboxId: string
  - kubeconfig: string
  - vclusterEndpoint: string

Error Handling:
  - Each activity has retry policy: 3 attempts, 5s initial backoff, 2x multiplier
  - On permanent failure: run CompensationWorkflow
```

---

## 3.2 Workflow: `CompensationWorkflow`

Runs when `SetupLabEnvironment` fails. Cleans up partial state.

```
Activities (best-effort, continue on error):
  1. DeleteVCluster(namespaceName, releaseName)  // if vCluster was deployed
  2. DeleteNamespace(namespaceName)               // if namespace was created
  3. CleanupNATSSubjects(sandboxId)               // remove any NATS subscriptions
  4. UpdateSessionStatus(sandboxId, "FAILED")     // mark in DB
```

---

## 3.3 Workflow: `CleanupExpiredSandboxes`

Scheduled cron workflow (runs every 5 minutes).

```
Activities:
  1. ListExpiredSessions(ttlThreshold) → expiredSessions[]
  2. For each session:
     a. DestroySandbox(session.sandboxId)
     b. MarkSessionCleaned(session.id)
```

---

## 3.4 Activity Definitions

| Activity | Timeout | Retry | Heartbeat |
|----------|---------|-------|-----------|
| `CreateNamespace` | 30s | 3x, 5s backoff | — |
| `DeployVCluster` | 120s | 2x, 10s backoff | every 15s |
| `WaitUntilReady` | 90s | 3x, 5s backoff | every 10s |
| `ApplyNetworkPolicies` | 15s | 3x, 2s backoff | — |
| `InitializeSeedData` | 60s | 2x, 5s backoff | — |
| `VerifyReady` | 30s | 3x, 3s backoff | — |
