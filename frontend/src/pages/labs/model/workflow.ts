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
  loadInfrastructure: (nodes: WorkflowNode[], edges: WorkflowEdge[]) => void
}

let edgeCounter = 0

export const useWorkflowStore = create<WorkflowState>((set) => ({
  nodes: [],
  edges: [],
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

  loadInfrastructure: (nodes, edges) => set({
    nodes,
    edges,
    selectedNodeId: null,
  }),
}))

export function generateEdgeId(): string {
  return `edge-${Date.now()}-${++edgeCounter}`
}
