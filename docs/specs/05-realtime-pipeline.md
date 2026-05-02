# 05 — Real-time Visualization Pipeline

End-to-end pipeline from eBPF kernel-level traffic capture through NATS JetStream to animated "packet dot" rendering on the frontend Canvas2D.

---

## Pipeline Overview

```
┌──────────────────────────────────────────────────────────────────────────┐
│  K8s Host Node                                                           │
│  ┌─────────────────────────────────┐                                     │
│  │ eBPF DaemonSet (Go + cilium-ebpf)│                                    │
│  │  kprobe/tcp_connect              │                                    │
│  │  kprobe/tcp_sendmsg              │──── perf ring buffer ──►           │
│  │  ip → pod-name resolution        │                                    │
│  └─────────────────────────────────┘                                     │
└───────────────────────────────┬─────────────────────────────────────────┘
                                │  NATS publish
                                ▼  traffic.user.{userId}.{sandboxId}
                    ┌─────────────────────┐
                    │  NATS JetStream      │
                    │  Stream: TRAFFIC     │
                    │  Retention: WorkQueue│
                    └──────────┬──────────┘
                               │  JetStream consume
                               ▼
                    ┌─────────────────────┐
                    │  Fastify Gateway     │
                    │  ws/traffic.ts       │
                    │  100ms batch window  │
                    │  IP→pod resolution   │
                    └──────────┬──────────┘
                               │  WebSocket JSON frames
                               ▼  ws://gateway/ws/traffic/:sandboxId
                    ┌─────────────────────┐
                    │  React Frontend      │
                    │  Canvas.tsx (2D RAF) │
                    │  WorkflowStore edges │
                    │  dot-particle anim   │
                    └─────────────────────┘
```

---

## 5.1 eBPF Traffic Capture Agent

**Deploys as:** DaemonSet on host K8s nodes  
**Language:** Go + `cilium/ebpf` (no CGO required)  
**Output:** NATS JetStream subject `traffic.user.{userId}.{sandboxId}`

### Project Structure

```
ebpf-agent/
├── bpf/
│   ├── tcp_probe.c         # BPF C program — kprobe definitions
│   └── vmlinux.h           # Auto-generated BTF header (bpftool btf dump)
├── internal/
│   ├── agent/
│   │   ├── agent.go        # Main loop: load BPF, attach probes, drain ring buffer
│   │   └── publisher.go    # NATS publish with batching
│   ├── resolver/
│   │   └── pod_resolver.go # IP → (pod-name, namespace, userId, sandboxId) via K8s API
│   └── config/
│       └── config.go
├── Dockerfile
├── go.mod
└── k8s/
    └── daemonset.yaml
```

### BPF Program (bpf/tcp_probe.c)

```c
// SPDX-License-Identifier: GPL-2.0
#include "vmlinux.h"
#include <bpf/bpf_helpers.h>
#include <bpf/bpf_tracing.h>

struct event {
    __u64 ts_ns;
    __u32 src_ip;
    __u32 dst_ip;
    __u16 dst_port;
    __u32 bytes;
    __u8  proto;   // 6=TCP, 17=UDP
};

struct {
    __uint(type, BPF_MAP_TYPE_RINGBUF);
    __uint(max_entries, 1 << 20); // 1 MiB
} events SEC(".maps");

SEC("kprobe/tcp_sendmsg")
int BPF_KPROBE(kprobe_tcp_sendmsg, struct sock *sk, struct msghdr *msg, size_t size) {
    struct event *e = bpf_ringbuf_reserve(&events, sizeof(*e), 0);
    if (!e) return 0;

    e->ts_ns   = bpf_ktime_get_ns();
    e->src_ip  = BPF_CORE_READ(sk, __sk_common.skc_rcv_saddr);
    e->dst_ip  = BPF_CORE_READ(sk, __sk_common.skc_daddr);
    e->dst_port = bpf_ntohs(BPF_CORE_READ(sk, __sk_common.skc_dport));
    e->bytes   = (__u32)size;
    e->proto   = 6;

    bpf_ringbuf_submit(e, 0);
    return 0;
}
```

### Go Userspace: Ring Buffer Drain + Resolution

```go
// internal/agent/agent.go (outline)
func (a *Agent) Run(ctx context.Context) error {
    objs := bpfObjects{}
    if err := loadBpfObjects(&objs, nil); err != nil {
        return fmt.Errorf("load BPF: %w", err)
    }
    defer objs.Close()

    kp, err := link.Kprobe("tcp_sendmsg", objs.KprobeTcpSendmsg, nil)
    if err != nil {
        return fmt.Errorf("kprobe attach: %w", err)
    }
    defer kp.Close()

    rd, err := ringbuf.NewReader(objs.Events)
    if err != nil {
        return fmt.Errorf("ring buffer reader: %w", err)
    }
    defer rd.Close()

    for {
        rec, err := rd.Read()
        if err != nil { return err }

        var ev bpfEvent
        binary.Read(bytes.NewReader(rec.RawSample), binary.LittleEndian, &ev)

        podInfo, ok := a.resolver.LookupIP(ev.SrcIp)
        if !ok { continue } // skip non-sandbox traffic

        a.publisher.Enqueue(podInfo, ev)
    }
}
```

### Pod IP Resolution

`resolver/pod_resolver.go` maintains an in-memory map `ip → PodInfo` rebuilt every 5s via the K8s watch API (`client-go` informer on the host cluster scoped to namespaces matching `sandbox-*`):

```go
type PodInfo struct {
    PodName   string
    Namespace string
    UserID    string
    SandboxID string
}
```

- **Namespace format:** `sandbox-{userId}-{sandboxId}` — both fields are extractable by splitting on `-` at known positions
- **Cache TTL:** evict entries 30s after pod deletion event to drain in-flight events
- Events for IPs not in the cache are silently dropped (non-sandbox traffic)

### NATS Message Format (Raw Kernel Event)

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

### DaemonSet Privileges

```yaml
# k8s/daemonset.yaml (excerpt)
securityContext:
  capabilities:
    add:
      - BPF
      - NET_ADMIN
      - SYS_PTRACE   # CO-RE BTF type resolution
  privileged: false   # avoid over-privileging; explicit caps are sufficient
hostPID: true         # required to read host cgroup/PID namespaces
```

**Kernel requirement:** ≥ 5.8 (BPF ring buffer), BTF enabled (`CONFIG_DEBUG_INFO_BTF=y`).  
Verified on Ubuntu 22.04 / Amazon Linux 2023 kernels shipping on EKS node pools.

---

## 5.2 NATS JetStream Configuration

### Stream

```
Stream: TRAFFIC
  Subjects:   traffic.user.>
  Retention:  WorkQueue       # each message ACK'd by exactly one consumer, then deleted
  MaxAge:     5m              # auto-purge stale events if no consumer is active
  MaxBytes:   1GB
  Storage:    Memory          # sub-millisecond publish latency
  Replicas:   1 (dev) / 3 (prod)
  Discard:    Old             # drop oldest on full, never block the producer
```

**WorkQueue vs Interest retention:** WorkQueue is chosen here because each traffic event has a single consumer (the gateway instance for that sandbox). Interest retention would require all registered consumers to ACK, which is unsuitable for ephemeral per-sandbox subscriptions.

### Consumer (per active sandbox session)

```
Consumer: gateway-traffic-{instanceId}-{sandboxId}
  DurableName:   traffic-{userId}-{sandboxId}     # matches nats-client.ts
  DeliverPolicy: New                              # ignore events before WS connected
  AckPolicy:     Explicit
  MaxAckPending: 1000                             # backpressure ceiling
  FilterSubject: traffic.user.{userId}.{sandboxId}
  InactiveThreshold: 2m                           # auto-delete consumer if no pull activity
```

### Subject Hierarchy

```
traffic.user.{userId}.{sandboxId}       # per-sandbox firehose
traffic.user.{userId}.>                 # all sandboxes for a user (monitoring only)
traffic.user.>                          # global (admin tooling only)
```

### Reconnection

`nats-client.ts` uses the `nats` npm package default reconnect policy (10 attempts, exponential backoff). On reconnect, the durable consumer resumes from the last un-ACK'd sequence — no events are lost as long as the stream `MaxAge` has not elapsed.

---

## 5.3 Gateway Traffic Handler

Located at `gateway/src/ws/traffic.ts` and `gateway/src/services/nats-client.ts`.

### Current Implementation

```typescript
// gateway/src/ws/traffic.ts — existing skeleton
fastify.get('/ws/traffic/:sandboxId', { websocket: true }, async (connection, request) => {
  const { sandboxId } = request.params;
  const userId = request.user?.sub;

  const session = await opts.sessionService.getSession(sandboxId);
  if (!session || session.userId !== userId) {
    connection.socket.close(1008, 'Invalid session');
    return;
  }

  opts.natsClient.subscribeTraffic(userId, sandboxId, (data) => {
    if (connection.socket.readyState === 1) {
      connection.socket.send(JSON.stringify({ type: 'traffic', events: data.events || [] }));
    }
  });

  const pingInterval = setInterval(() => connection.socket.ping(), 30_000);
  connection.socket.on('close', () => clearInterval(pingInterval));
});
```

### Missing: 100ms Batching Window

Raw NATS events arrive individually (one per kernel event). Without batching, the WS send rate at high-traffic sandboxes can saturate the serialization budget. Add an accumulator flush before `send()`:

```typescript
let batch: TrafficEvent[] = [];
let flushTimer: NodeJS.Timeout | null = null;

const flush = () => {
  if (batch.length === 0) return;
  connection.socket.send(JSON.stringify({ type: 'traffic', events: batch }));
  batch = [];
  flushTimer = null;
};

opts.natsClient.subscribeTraffic(userId, sandboxId, (raw: RawTrafficEvent) => {
  batch.push(transformEvent(raw));           // IP → pod-name + ms conversion
  if (!flushTimer) flushTimer = setTimeout(flush, 100);
});
```

### Missing: IP → Pod-Name Resolution

`gateway/src/ws/canvas-sync.ts` already maintains a `ResourceEvent` cache from the `WatchResources` gRPC stream. The traffic handler should read that cache to resolve `src_ip`/`dst_ip` → pod names:

```typescript
const transformEvent = (raw: RawTrafficEvent): TrafficEvent => ({
  src: resourceCache.resolveIp(raw.src_ip) ?? raw.src_ip,
  dst: resourceCache.resolveIp(raw.dst_ip) ?? raw.dst_ip,
  protocol: raw.protocol,
  latency_ms: raw.latency_ns / 1_000_000,
});
```

If resolution fails (IP not in cache), pass the raw IP as a fallback — the frontend treats it as an unknown node.

### Fanout (Multiple Browser Tabs)

The current implementation creates one NATS consumer per WS connection. If the same sandbox is viewed in multiple tabs, create **one** shared consumer per `sandboxId` and fan out to all connected sockets via a `Map<sandboxId, Set<WebSocket>>` in `SessionService`.

---

## 5.4 Frontend Canvas Rendering

`Canvas.tsx` uses a Canvas2D `requestAnimationFrame` loop. The animation is already fully implemented for static workflow edges — wiring live traffic data requires calling into `useWorkflowStore`.

### Animation Constants (Canvas.tsx)

```typescript
const DOT_ANIM_SPEED = 0.00055   // fraction of path per ms  → full traversal ≈ 1.8 s
const DOT_COUNT      = 4         // animated dots per edge
```

Each edge maintains `DOT_COUNT` offset values in `dotOffsets` (a `Map<edgeId, number[]>`). Per frame:
```typescript
offsets[i] = (offsets[i] + DOT_ANIM_SPEED * dt) % 1
```

Dot color is `lerpColor(srcNode.accentColor, tgtNode.accentColor, t)` with a `shadowBlur: 8` glow, giving a smooth chromatic gradient along the bezier path.

### Wiring Traffic Events → Store

On incoming `TrafficMessage` from the WebSocket:

1. **Lookup** source and destination nodes in `useWorkflowStore.getState().nodes` by `node.label === event.src` / `event.dst`
2. **Create nodes** if missing (see §5.5 below)
3. **Check for existing edge** between the two nodes; skip `addEdge` if one already exists to prevent duplicate animation tracks
4. **Call** `useWorkflowStore.getState().addEdge(edge)` — the RAF loop picks it up on the next frame via the `dotOffsets` `useEffect`

```typescript
// features/sandbox/lib/canvas-sync.ts (to be implemented)
import { useWorkflowStore, generateEdgeId } from '@/pages/labs/model/workflow';

export function applyTrafficMessage(msg: TrafficMessage) {
  const { nodes, edges, addEdge } = useWorkflowStore.getState();

  for (const ev of msg.events) {
    const src = nodes.find(n => n.label === ev.src);
    const dst = nodes.find(n => n.label === ev.dst);
    if (!src || !dst) continue;

    const alreadyConnected = edges.some(
      e => e.sourceNodeId === src.id && e.targetNodeId === dst.id
    );
    if (!alreadyConnected) {
      addEdge({
        id: generateEdgeId(),
        sourceNodeId: src.id, sourcePortId: src.outputs[0]?.id ?? 'out-0',
        targetNodeId: dst.id, targetPortId: dst.inputs[0]?.id  ?? 'in-0',
      });
    }
  }
}
```

---

## 5.5 Resource Event → Canvas Node Mapping

When a `resource_event` arrives on `ws://gateway/ws/canvas/:sandboxId`, map K8s resource kinds to `WorkflowNode` types and accent colors that match the existing palette in `workflow.ts`:

| K8s Kind | `WorkflowNode.type` | `accentColor` | Status modifier |
|----------|---------------------|---------------|-----------------|
| Pod (Running) | `"agent"` | `0x22c55e` (green) | — |
| Pod (Pending) | `"agent"` | `0xf59e0b` (yellow) | — |
| Pod (Failed / CrashLoopBackOff) | `"agent"` | `0xef4444` (red) | — |
| Service (ClusterIP) | `"tool"` | `0x06b6d4` (cyan) | — |
| Service (LoadBalancer) | `"trigger"` | `0x6366f1` (indigo) | — |
| Deployment | `"condition"` | `0x10b981` (emerald) | — |
| ConfigMap / Secret | `"memory"` | `0x8b5cf6` (violet) | — |

**Auto-layout:** new nodes are placed at `x = existingNodeCount * 260`, `y = 300` (single row). The user can reposition nodes manually — the canvas stores positions in `WorkflowNode.x/y` via `moveNode()`.

**Node removal:** on a `resource_event` with `status: "Deleted"`, call `useWorkflowStore.getState().removeNode(id)` (to be added alongside `removeEdge`) and remove all edges referencing that node's ID.

---

## 5.6 Shared TypeScript Types

Canonical types live in `gateway/src/types/shared.ts` (imported by both gateway and frontend via the shared package or copy-on-build):

```typescript
// Raw event published by eBPF agent → NATS
export interface RawTrafficEvent {
  ts: number;           // Unix ms
  src_pod: string;
  dst_pod: string;
  src_ip: string;
  dst_ip: string;
  dst_port: number;
  protocol: 'TCP' | 'UDP' | 'HTTP';
  bytes: number;
  latency_ns: number;
}

// Transformed event sent over WebSocket to frontend
export interface TrafficEvent {
  src: string;          // resolved pod/service name
  dst: string;
  protocol: string;
  latency_ms: number;
}

export interface TrafficMessage {
  type: 'traffic';
  events: TrafficEvent[];
}

// Already defined — included for reference
export interface ResourceEvent {
  type: 'resource_event';
  data: {
    kind: string;
    name: string;
    status: string;
    connections?: Connection[];
  };
}
```

---

## 5.7 Backpressure & Flow Control

| Layer | Mechanism | Limit |
|-------|-----------|-------|
| eBPF ring buffer | `BPF_MAP_TYPE_RINGBUF` 1 MiB; kernel drops events silently when full | 1 MiB |
| NATS producer | `Discard: Old` on stream full — oldest messages dropped, not blocked | 1 GB stream |
| NATS consumer | `MaxAckPending: 1000` — consumer stalls if gateway falls behind | 1000 msgs |
| Gateway WS send | 100ms batch window reduces frame count by ~10–50× at burst | configurable |
| Frontend RAF | Canvas re-draws at display refresh rate (≤ 120 fps). No queuing needed — dot offsets advance by wall-clock `dt`. | ≤ 120 fps |

**High-cardinality sandboxes:** if a sandbox produces > 500 traffic events/s, the agent should aggregate into 1s counters per `(src_pod, dst_pod)` pair and publish a `bytes_total` summary instead of per-packet events. A `mode: "aggregate"` flag on the NATS message triggers a thicker/pulsing edge style on the canvas rather than individual dots.

---

## 5.8 Connection Lifecycle & Reconnection

### WebSocket (Frontend)

```
connect → session validate → NATS consumer start → ping/pong every 30s
    │
    ├── normal close (sandbox destroyed) → gateway sends WS close 1000
    │
    ├── network drop → frontend detects close event → exponential backoff
    │   retry (1s, 2s, 4s … 30s cap) → re-authenticate if token expired
    │
    └── gateway restart → NATS consumer recreated (durable — resumes from last ACK)
```

### NATS Consumer Cleanup

When the WS connection closes (`connection.socket.on('close', ...)` in `traffic.ts`):
1. Call `messages.close()` on the `JetStreamPushConsumer` iterator to stop delivery
2. Optionally delete the durable consumer via `js.consumers.delete('TRAFFIC', durableName)` to free JetStream resources immediately (otherwise `InactiveThreshold: 2m` handles it)

The current `traffic.ts` skeleton has an empty `on('close')` handler — this cleanup belongs there.

---

## 5.9 Dev / Debug Tooling

Running the full pipeline locally requires a K8s cluster and kernel BPF support. Use a **traffic simulator** to develop against the gateway and canvas without the eBPF DaemonSet:

```typescript
// scripts/traffic-simulator.ts  (run with: npx ts-node scripts/traffic-simulator.ts)
import { connect } from 'nats';

const nc = await connect({ servers: 'nats://localhost:4222' });
const js = nc.jetstream();

const pods  = ['nginx-pod', 'redis-svc', 'postgres-svc', 'api-server'];
const userId    = 'dev-user';
const sandboxId = 'test-sandbox-01';
const subject   = `traffic.user.${userId}.${sandboxId}`;

setInterval(async () => {
  const src = pods[Math.floor(Math.random() * pods.length)];
  const dst = pods.filter(p => p !== src)[Math.floor(Math.random() * (pods.length - 1))];
  await js.publish(subject, JSON.stringify({
    ts: Date.now(), src_pod: src, dst_pod: dst,
    src_ip: '10.0.1.5', dst_ip: '10.0.1.12',
    dst_port: 80, protocol: 'TCP',
    bytes: Math.floor(Math.random() * 4096),
    latency_ns: Math.floor(Math.random() * 5_000_000),
  }));
}, 200);
```

Run alongside `docker-compose up nats` and connect a browser session to observe live dot animation on the canvas.
