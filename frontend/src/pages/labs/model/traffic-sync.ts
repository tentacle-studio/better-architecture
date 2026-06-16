import { useWorkflowStore, type WorkflowNode, type WorkflowEdge } from "./workflow"

export type NodeKind = "Pod" | "Service" | "Deployment" | "ConfigMap" | "Secret"
export type PodPhase = "Running" | "Pending" | "Failed" | "CrashLoopBackOff" | "Deleted" | string

export interface TrafficEvent {
  src: string
  dst: string
  protocol: string
  latency_ms: number
  bytes?: number
}

export interface TrafficMessage {
  type: "traffic"
  events: TrafficEvent[]
}

export interface ResourceEventData {
  kind: string
  name: string
  status: PodPhase
  connections?: Array<{ from: string; to: string; port: number }>
}

export interface ResourceMessage {
  type: "resource_event" | "batch"
  data?: ResourceEventData
  events?: Array<{ type: "resource_event"; data: ResourceEventData }>
}

// ─── Accent colour map (matches workflow.ts palette) ──────────────────────────

const KIND_ACCENT: Record<string, number> = {
  "Pod/Running":       0x22c55e,
  "Pod/Pending":       0xf59e0b,
  "Pod/Failed":        0xef4444,
  "Pod/CrashLoopBackOff": 0xef4444,
  "Service/ClusterIP":    0x06b6d4,
  "Service/LoadBalancer": 0x6366f1,
  "Service":           0x06b6d4,
  "Deployment":        0x10b981,
  "ConfigMap":         0x8b5cf6,
  "Secret":            0x8b5cf6,
}

const KIND_TYPE: Record<string, WorkflowNode["type"]> = {
  Pod:        "agent",
  Service:    "tool",
  Deployment: "condition",
  ConfigMap:  "memory",
  Secret:     "memory",
}

const KIND_ICON: Record<string, string> = {
  Pod:        "📦",
  Service:    "🔗",
  Deployment: "🚀",
  ConfigMap:  "⚙️",
  Secret:     "🔒",
}

let nodeCounter = 0

function accentForResource(kind: string, status: string): number {
  return (
    KIND_ACCENT[`${kind}/${status}`] ??
    KIND_ACCENT[kind] ??
    0x64748b
  )
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function applyTrafficMessage(msg: TrafficMessage) {
  const { nodes, edges, addEdge } = useWorkflowStore.getState()

  for (const ev of msg.events) {
    const src = nodes.find((n) => n.label === ev.src)
    const dst = nodes.find((n) => n.label === ev.dst)
    if (!src || !dst) continue

    const alreadyConnected = edges.some(
      (e) => e.sourceNodeId === src.id && e.targetNodeId === dst.id
    )
    if (alreadyConnected) continue

    const edge: WorkflowEdge = {
      id: `live-${src.id}-${dst.id}`,
      sourceNodeId: src.id,
      sourcePortId: src.outputs[0]?.id ?? "out-0",
      targetNodeId: dst.id,
      targetPortId: dst.inputs[0]?.id  ?? "in-0",
    }
    addEdge(edge)
  }
}

export function applyResourceEvent(data: ResourceEventData) {
  const { nodes, addNode, removeNode, updateNodeStatus } = useWorkflowStore.getState()

  if (data.status === "Deleted") {
    const node = nodes.find((n) => n.label === data.name)
    if (node) removeNode(node.id)
    return
  }

  const existing = nodes.find((n) => n.label === data.name)

  if (existing) {
    const accent = accentForResource(data.kind, data.status)
    updateNodeStatus(existing.id, data.status)
    if (existing.accentColor !== accent) {
      useWorkflowStore.setState((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === existing.id ? { ...n, accentColor: accent } : n
        ),
      }))
    }
    return
  }

  nodeCounter++
  const existingCount = useWorkflowStore.getState().nodes.length
  const node: WorkflowNode = {
    id:          `live-${data.kind.toLowerCase()}-${data.name}-${nodeCounter}`,
    type:        KIND_TYPE[data.kind]   ?? "tool",
    label:       data.name,
    sublabel:    data.status,
    x:           existingCount * 260 + 80,
    y:           300,
    color:       0x1e293b,
    accentColor: accentForResource(data.kind, data.status),
    icon:        KIND_ICON[data.kind] ?? "📦",
    inputs:      [{ id: "in-0", label: "in" }],
    outputs:     [{ id: "out-0", label: "out" }],
    selected:    false,
  }
  addNode(node)
}

export function applyResourceMessage(msg: ResourceMessage) {
  if (msg.type === "resource_event" && msg.data) {
    applyResourceEvent(msg.data)
  } else if (msg.type === "batch" && msg.events) {
    for (const ev of msg.events) {
      if (ev.type === "resource_event") applyResourceEvent(ev.data)
    }
  }
}
