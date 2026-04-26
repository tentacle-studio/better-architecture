# 05 — Real-time Visualization Pipeline

End-to-end pipeline from eBPF kernel-level traffic capture through NATS JetStream to animated "packet dot" rendering on the frontend Canvas2D.

---

## 5.1 eBPF Traffic Capture Agent

**Deploys as:** DaemonSet on host K8s nodes  
**Language:** Go + libbpf/cilium-ebpf  
**Output:** NATS JetStream

### Captured Events

| Probe | Event | Data |
|-------|-------|------|
| `tcp_connect` | TCP connection established | src_ip, dst_ip, dst_port, namespace, pod_name |
| `kprobe/tcp_sendmsg` | TCP data sent | src_ip, dst_ip, bytes, timestamp |
| HTTP header parse (optional) | HTTP request | method, path, status_code, latency_ns |

### Event Tagging

- Agent reads pod labels via K8s downward API to tag events with `user_id` and `sandbox_id`
- Namespace naming convention (`sandbox-{userId}-*`) enables filtering at the eBPF level
- Events published to NATS subject: `traffic.user.{userId}.{sandboxId}`

### NATS Message Format

```json
{
  "ts": 1719000000000,
  "src_pod": "nginx-pod",
  "dst_pod": "redis-svc",
  "src_ip": "10.0.1.5",
  "dst_ip": "10.0.1.12",
  "dst_port": 6379,
  "protocol": "TCP",
  "bytes": 1024,
  "latency_ns": 3200000
}
```

---

## 5.2 NATS JetStream Configuration

```
Stream: TRAFFIC
  Subjects: traffic.user.>
  Retention: WorkQueue (consumed once)
  MaxAge: 5m
  MaxBytes: 1GB
  Storage: Memory (low latency)
  Replicas: 1 (dev) / 3 (prod)

Consumer: gateway-traffic-{instanceId}
  DeliverPolicy: New
  AckPolicy: Explicit
  MaxAckPending: 1000
  FilterSubject: traffic.user.{userId}.{sandboxId}
```

---

## 5.3 Gateway → Frontend Flow

1. Gateway's NATS consumer receives traffic events
2. Groups events by sandboxId
3. Maps raw IP addresses to pod/service names using cached resource state
4. Transforms to `{src: "pod-name", dst: "svc-name", protocol, latency_ms}` format
5. Batches events over 100ms window
6. Pushes to connected WebSocket clients on `ws://gateway/ws/traffic/:sandboxId`

---

## 5.4 Frontend Canvas Rendering

The existing `Canvas.tsx` workflow graph rendering extends to support live resource visualization:

- **Node creation:** When `resource_event` with `kind: "Pod"` arrives, add a new workflow node at auto-layout position
- **Edge creation:** When traffic events show `src → dst`, create animated edges with dot particles (already implemented in `Canvas.tsx`)
- **Status colors:** Map pod status to accent colors (Running → green, Pending → yellow, Failed → red)
- **Removal:** When a pod is deleted, animate node fadeout and remove edges
