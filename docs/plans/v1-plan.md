## 1. Executive Summary
This document details the backend architecture for a high-fidelity system design learning platform. The architecture follows a polyglot microservices pattern designed to manage thousands of isolated virtual Kubernetes (vCluster) environments, providing real-time visual feedback and terminal access to users.

## 2. System Architecture Overview

### 2.1 The Polyglot Approach
- **Go Orchestrator (The "Core"):** Manages the heavy-duty Kubernetes interactions. It interfaces with the Host Cluster to provision and lifecycle-manage vClusters.
- **Node.js API Gateway (The "Bridge"):** Handles user authentication, WebSocket connections for terminals, and real-time state synchronization for the 2D PixiJS canvas.

### 2.2 Key Technologies
| Component | Technology | Rationale |
| :--- | :--- | :--- |
| Core Language | Go 1.26+ | Native K8s SDK support, high concurrency, low footprint. |
| API Layer | Fastify (TypeScript) | Highest throughput Node.js framework; shared types with frontend. |
| Workflow Engine | Temporal.io | Guarantees reliability for multi-step infrastructure provisioning. |
| Sandboxing | vCluster | High-density, low-latency virtual Kubernetes clusters. |
| Messaging | NATS JetStream | Ultra-fast, lightweight pub/sub for real-time traffic data. |
| Persistence | PostgreSQL + Citus | Relational integrity with horizontal scaling via sharding. |
| Observability | OpenTelemetry | Built-in tracing used as a core gameplay mechanic for latency. |

---

## 3. Detailed Component Implementation

### 3.1 Infrastructure Orchestrator (Go)
The Go service is responsible for the "Physical to Virtual" mapping.

- **K8s Client:** Uses `client-go` and `controller-runtime` to manage resources in the Host Cluster.
- **vCluster Lifecycle:** - Provisions a unique Namespace per quiz session.
    - Deploys the vCluster Helm chart (K3s-based) into the namespace.
    - Configures `VirtualCluster` resources to sync only necessary resources (Pods, Services, ConfigMaps).
- **Network Isolation:** Automatically applies `NetworkPolicies` to ensure inter-sandbox isolation and block unauthorized egress.

### 3.2 API & Real-time Gateway (Node.js/Fastify)
This service acts as the state manager for the frontend.

- **WebSocket Proxy:** Bridges browser Xterm.js calls to the Go Orchestrator, which then uses the K8s SPDY protocol to `exec` into pods.
- **State Sync Loop:** - Polls the vCluster API server for pod/service status changes.
    - Aggregates "Traffic Events" from the NATS bus.
    - Sends delta-updates to the PixiJS frontend via WebSockets to minimize bandwidth.
- **Authentication:** JWT-based auth integrated with an OIDC provider (e.g., Auth0 or Clerk).

### 3.3 Workflow Orchestration (Temporal)
Provisioning a lab is a "Long Running Action" that must be resilient.

- **Workflow: `SetupLabEnvironment`**
    1. `CreateNamespace`: Create a restricted host namespace.
    2. `DeployVCluster`: Install the vCluster control plane.
    3. `WaitUntilReady`: Poll the vCluster API until the control plane is healthy.
    4. `InitializeSeedData`: Deploy the "Starting State" for the quiz (e.g., a broken Nginx config).
    5. `VerifyReady`: Run a heartbeat check.
- **Error Handling:** If any step fails, Temporal executes a "Compensation Activity" to clean up the partially created resources.

---

## 4. Real-time Visualization Engine (The "Game" Data)

### 4.1 Traffic Capture (eBPF)
To drive the "dots on wires" in the 2D game:
- An eBPF Agent (running as a DaemonSet on the host nodes) captures `tcp_connect` and `http_request` events across user namespaces.
- Events are tagged with `user_id` and pushed to **NATS JetStream** under the subject `traffic.user.<id>`.

### 4.2 Traffic Rendering
- The Node.js Gateway subscribes to the NATS subject.
- It transforms raw IP-to-IP traffic into `SourceNodeID -> TargetNodeID` events.
- The 2D PixiJS canvas receives these events and spawns "Packet" sprites that travel along the calculated A* paths between nodes.

---

## 5. The Validation Engine ("The Judge")

Quizzes are graded based on system state, not just console output.

- **State Check:** Query the vCluster API to ensure the requested architecture is present (e.g., "Are there exactly 3 replicas of the Web pod?").
- **Liveness Check:** The Go service executes a `curl` or `ping` from an external "Tester Pod" into the user's vCluster to verify connectivity.
- **SLA Check:** For high-level quizzes, the "Judge" uses OpenTelemetry data to verify if the 95th percentile latency is below the target threshold.

---

## 6. Implementation Phases

### Phase 1: The "Steel Thread" (Weeks 1-4)
- Set up a single-node K8s host.
- Implement the Go service to manually trigger a vCluster via CLI.
- Connect Xterm.js to a pod via the Node.js bridge.

### Phase 2: Orchestration & Reliability (Weeks 5-8)
- Integrate Temporal for provisioning.
- Set up PostgreSQL + Citus for user session management.
- Implement automated cleanup for expired labs.

### Phase 3: Visuals & Gaming (Weeks 9-12)
- Build the NATS-based traffic event pipeline.
- Implement the PixiJS canvas "Sync Loop."
- Add the "Judge" validation logic for the first 5 quizzes.

### Phase 4: Hardening & Scale (Weeks 13+)
- Implement gVisor or Kata Containers for the Pod runtime.
- Stress test the host cluster for multi-tenancy.
- Deploy Global Load Balancing for the API Gateway.

---

## 7. Security Best Practices
- **Namespace-level Isolation:** Enforce `ResourceQuotas` and `LimitRanges` on every user namespace.
- **Metadata Protection:** Block access to the cloud provider's metadata service (IMDS) using NetworkPolicies.
- **Image Scanning:** Only allow pods to be pulled from a trusted, internal container registry.
- **ReadOnly Filesystems:** Enforce read-only root filesystems for all user-created pods to prevent persistent malware.