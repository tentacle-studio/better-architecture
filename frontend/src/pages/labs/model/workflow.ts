import { create } from "zustand"

export type PortType = "input" | "output"

export interface Port {
  id: string
  nodeId: string
  type: PortType
  label: string
  index: number // 0-based position among ports of same type
  totalOfType: number // total ports of same type on this node
}

export interface WorkflowNode {
  id: string
  type: "trigger" | "agent" | "condition" | "action" | "memory" | "tool" | "output"
  label: string
  sublabel?: string
  x: number
  y: number
  color: number   // pixi hex color
  accentColor: number
  icon: string    // emoji icon
  inputs: { id: string; label: string }[]
  outputs: { id: string; label: string }[]
  selected: boolean
}

export interface WorkflowEdge {
  id: string
  sourceNodeId: string
  sourcePortId: string
  targetNodeId: string
  targetPortId: string
}

export interface PendingConnection {
  sourceNodeId: string
  sourcePortId: string
  sourceType: PortType
  currentX: number
  currentY: number
}

interface WorkflowState {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
  selectedNodeId: string | null
  pendingConnection: PendingConnection | null
  zoom: number
  panX: number
  panY: number

  // actions
  selectNode: (id: string | null) => void
  moveNode: (id: string, x: number, y: number) => void
  addNode: (node: WorkflowNode) => void
  removeNode: (id: string) => void
  updateNodeStatus: (id: string, status: string) => void
  addEdge: (edge: WorkflowEdge) => void
  removeEdge: (id: string) => void
  setPendingConnection: (conn: PendingConnection | null) => void
  setViewport: (zoom: number, panX: number, panY: number) => void
}

let edgeCounter = 0

const INITIAL_NODES: WorkflowNode[] = [
  {
    id: "trigger-1",
    type: "trigger",
    label: "Chat Trigger",
    sublabel: "When message received",
    x: 80,
    y: 300,
    color: 0x1e293b,
    accentColor: 0x6366f1,
    icon: "💬",
    inputs: [],
    outputs: [{ id: "out-0", label: "Message" }],
    selected: false,
  },
  {
    id: "agent-1",
    type: "agent",
    label: "AI Agent",
    sublabel: "Tools Agent",
    x: 340,
    y: 240,
    color: 0x1e293b,
    accentColor: 0x3b82f6,
    icon: "🤖",
    inputs: [{ id: "in-0", label: "Input" }],
    outputs: [
      { id: "out-0", label: "Response" },
      { id: "out-1", label: "Chat Model" },
      { id: "out-2", label: "Memory" },
      { id: "out-3", label: "Tool" },
    ],
    selected: false,
  },
  {
    id: "condition-1",
    type: "condition",
    label: "If",
    sublabel: "Route condition",
    x: 640,
    y: 240,
    color: 0x1e293b,
    accentColor: 0x10b981,
    icon: "⚡",
    inputs: [{ id: "in-0", label: "Value" }],
    outputs: [
      { id: "out-0", label: "true" },
      { id: "out-1", label: "false" },
    ],
    selected: false,
  },
  {
    id: "memory-1",
    type: "memory",
    label: "Window Buffer",
    sublabel: "Memory",
    x: 400,
    y: 500,
    color: 0x1e293b,
    accentColor: 0x8b5cf6,
    icon: "🗄️",
    inputs: [{ id: "in-0", label: "Input" }],
    outputs: [{ id: "out-0", label: "Output" }],
    selected: false,
  },
  {
    id: "tool-1",
    type: "tool",
    label: "OpenAI Chat",
    sublabel: "Chat Model",
    x: 200,
    y: 500,
    color: 0x1e293b,
    accentColor: 0x06b6d4,
    icon: "🧠",
    inputs: [{ id: "in-0", label: "Input" }],
    outputs: [{ id: "out-0", label: "Output" }],
    selected: false,
  },
  {
    id: "tool-2",
    type: "tool",
    label: "SerpAPI",
    sublabel: "Search Tool",
    x: 580,
    y: 500,
    color: 0x1e293b,
    accentColor: 0xf59e0b,
    icon: "🔍",
    inputs: [{ id: "in-0", label: "Input" }],
    outputs: [{ id: "out-0", label: "Results" }],
    selected: false,
  },
  {
    id: "output-1",
    type: "output",
    label: "Success",
    sublabel: "Send message",
    x: 900,
    y: 160,
    color: 0x1e293b,
    accentColor: 0x22c55e,
    icon: "✅",
    inputs: [{ id: "in-0", label: "Input" }],
    outputs: [],
    selected: false,
  },
  {
    id: "output-2",
    type: "output",
    label: "Failure",
    sublabel: "Send message",
    x: 900,
    y: 360,
    color: 0x1e293b,
    accentColor: 0xef4444,
    icon: "❌",
    inputs: [{ id: "in-0", label: "Input" }],
    outputs: [],
    selected: false,
  },
]

const INITIAL_EDGES: WorkflowEdge[] = [
  { id: "e1", sourceNodeId: "trigger-1", sourcePortId: "out-0", targetNodeId: "agent-1", targetPortId: "in-0" },
  { id: "e2", sourceNodeId: "agent-1", sourcePortId: "out-0", targetNodeId: "condition-1", targetPortId: "in-0" },
  { id: "e3", sourceNodeId: "agent-1", sourcePortId: "out-1", targetNodeId: "tool-1", targetPortId: "in-0" },
  { id: "e4", sourceNodeId: "agent-1", sourcePortId: "out-2", targetNodeId: "memory-1", targetPortId: "in-0" },
  { id: "e5", sourceNodeId: "agent-1", sourcePortId: "out-3", targetNodeId: "tool-2", targetPortId: "in-0" },
  { id: "e6", sourceNodeId: "condition-1", sourcePortId: "out-0", targetNodeId: "output-1", targetPortId: "in-0" },
  { id: "e7", sourceNodeId: "condition-1", sourcePortId: "out-1", targetNodeId: "output-2", targetPortId: "in-0" },
]

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: INITIAL_NODES,
  edges: INITIAL_EDGES,
  selectedNodeId: null,
  pendingConnection: null,
  zoom: 1,
  panX: 0,
  panY: 0,

  selectNode: (id) => set((s) => ({
    selectedNodeId: id,
    nodes: s.nodes.map((n) => ({ ...n, selected: n.id === id })),
  })),

  moveNode: (id, x, y) => set((s) => ({
    nodes: s.nodes.map((n) => n.id === id ? { ...n, x, y } : n),
  })),

  addNode: (node) => set((s) => (
    s.nodes.find((n) => n.id === node.id) ? s : { nodes: [...s.nodes, node] }
  )),

  removeNode: (id) => set((s) => ({
    nodes: s.nodes.filter((n) => n.id !== id),
    edges: s.edges.filter((e) => e.sourceNodeId !== id && e.targetNodeId !== id),
  })),

  updateNodeStatus: (id, status) => set((s) => ({
    nodes: s.nodes.map((n) => n.id === id ? { ...n, sublabel: status } : n),
  })),

  addEdge: (edge) => set((s) => ({ edges: [...s.edges, edge] })),

  removeEdge: (id) => set((s) => ({ edges: s.edges.filter((e) => e.id !== id) })),

  setPendingConnection: (conn) => set({ pendingConnection: conn }),

  setViewport: (zoom, panX, panY) => set({ zoom, panX, panY }),
}))

export function generateEdgeId(): string {
  return `edge-${Date.now()}-${++edgeCounter}`
}
