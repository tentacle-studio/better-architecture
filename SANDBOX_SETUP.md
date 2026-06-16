# Sandbox Creation Setup Guide

## Current Status

The orchestrator/k8s sandbox creation infrastructure is **partially configured** but requires a Kubernetes cluster to function.

## What Was Fixed

1. **Proto Definition Sync** ✅
   - Updated `gateway/proto/orchestrator.proto` to match the orchestrator's actual proto
   - Fixed field naming: `userId` → `user_id`, `labId` → `quiz_id`, `templateId` → `seed_manifest`
   - Fixed service name: `OrchestratorService` → `Orchestrator`

2. **Gateway Integration** ✅
   - Updated `orchestrator-client.ts` interfaces to use snake_case fields
   - Updated `labs.ts` route to pass correct field names to gRPC calls
   - Fixed `http-client.ts` to not send `Content-Type: application/json` on bodyless POST requests

3. **Database Schema** ✅
   - Added `tags` and `status` columns to labs table
   - Updated frontend `Lab` model to match DB schema
   - Fixed difficulty casing (lowercase in DB, capitalized in UI)

## What's Missing: Kubernetes Cluster

The orchestrator is configured to connect to a k8s cluster via:
- **In-cluster config** (when `KUBECONFIG` env var is empty)
- **Kubeconfig file** at `~/.kube/config` (mounted from host)

### Current Docker Setup

```yaml
orchestrator:
  environment:
    - KUBECONFIG=/root/.kube/config
  volumes:
    - ${HOME}/.kube:/root/.kube:ro
```

The orchestrator expects:
1. A running Kubernetes cluster (local or remote)
2. Valid kubeconfig with cluster access
3. Permissions to create namespaces, deploy Helm charts, and manage vCluster resources

### Options to Enable Sandbox Creation

#### Option A: Local Kubernetes (Recommended for Development)

Install a local k8s cluster:

```bash
# Using Docker Desktop (easiest)
# Enable Kubernetes in Docker Desktop settings

# OR using kind (Kubernetes in Docker)
brew install kind
kind create cluster --name better-arch

# OR using minikube
brew install minikube
minikube start
```

After setup, verify:
```bash
kubectl cluster-info
kubectl get nodes
```

Then restart containers:
```bash
make dev-down
make dev
```

#### Option B: Remote Kubernetes Cluster

Point `~/.kube/config` to a remote cluster (GKE, EKS, AKS, etc.) with appropriate permissions.

#### Option C: Mock Mode (For Testing Without K8s)

Create a mock orchestrator that returns fake sandbox data without actually provisioning infrastructure. This would require modifying the orchestrator to detect a `MOCK_MODE=true` env var.

## How Sandbox Creation Works

1. **User clicks "Start Lab"** on `/labs/:id`
2. **Frontend** calls `POST /labs/:id/start` (gateway)
3. **Gateway** calls `orchestrator.CreateSandbox()` via gRPC with:
   - `user_id`: authenticated user ID
   - `quiz_id`: lab ID
   - `seed_manifest`: base64-encoded k8s YAML from `lab.seedManifest`
4. **Orchestrator** provisions a vCluster sandbox:
   - Creates namespace `sandbox-{userId}-{quizId}-{randomId}`
   - Deploys vCluster via Helm chart
   - Waits for vCluster to be ready (90s timeout)
   - Applies seed manifest (k8s resources for the lab)
   - Generates scoped kubeconfig
5. **Gateway** stores session in Redis and returns:
   - `sandboxId`: unique sandbox identifier
   - WebSocket URLs for terminal, canvas, traffic monitoring
6. **Frontend** navigates to `/labs/:labId/session/:sandboxId`

## Testing Without K8s

Currently, clicking "Start Lab" will fail with:
```
Failed to create sandbox
```

Gateway logs will show a gRPC connection error to the orchestrator, and the orchestrator will fail when trying to connect to k8s.

## Next Steps

1. **Set up local k8s** (Option A above)
2. **Rebuild containers** to pick up proto changes:
   ```bash
   make dev-down
   make dev
   ```
3. **Test sandbox creation** by clicking "Start Lab" on any lab
4. **Monitor logs**:
   ```bash
   docker logs -f orchestrator
   docker logs -f gateway
   ```

## Architecture Overview

```
Frontend → Gateway → Orchestrator → Kubernetes
                ↓
              Redis (sessions)
              Postgres (labs, users)
```

The orchestrator uses:
- **vCluster**: Lightweight virtual k8s clusters for isolation
- **Helm**: To deploy vCluster charts
- **Temporal**: For long-running workflows (future)
- **NATS**: For event streaming
