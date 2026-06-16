import { create } from "zustand"

export type ElementType = "rectangle" | "ellipse" | "text" | "image" | "line" | "arrow"

export interface CanvasElement {
  id: string
  type: ElementType
  x: number
  y: number
  width: number
  height: number
  rotation: number
  fill: string
  stroke: string
  strokeWidth: number
  text?: string
  fontSize?: number
  locked: boolean
  visible: boolean
  name: string
}

export type Tool = "select" | "hand" | "rectangle" | "ellipse" | "text" | "line" | "arrow" | "image"

interface CanvasState {
  elements: CanvasElement[]
  selectedIds: string[]
  activeTool: Tool
  zoom: number
  panOffset: { x: number; y: number }
  isPanning: boolean
  
  // Actions
  addElement: (element: CanvasElement) => void
  updateElement: (id: string, updates: Partial<CanvasElement>) => void
  deleteElement: (id: string) => void
  selectElement: (id: string, multi?: boolean) => void
  clearSelection: () => void
  setActiveTool: (tool: Tool) => void
  setZoom: (zoom: number) => void
  setPanOffset: (offset: { x: number; y: number }) => void
  setIsPanning: (isPanning: boolean) => void
  moveElement: (id: string, dx: number, dy: number) => void
  reorderElement: (id: string, direction: "up" | "down") => void
  duplicateElement: (id: string) => void
  toggleLock: (id: string) => void
  toggleVisibility: (id: string) => void
}

let elementCounter = 0

export const useCanvasStore = create<CanvasState>((set) => ({
  elements: [
    {
      id: "welcome-text",
      type: "text",
      x: 300,
      y: 200,
      width: 400,
      height: 60,
      rotation: 0,
      fill: "#ffffff",
      stroke: "transparent",
      strokeWidth: 0,
      text: "Welcome to Training Lab",
      fontSize: 32,
      locked: false,
      visible: true,
      name: "Welcome Text",
    },
    {
      id: "module-1",
      type: "rectangle",
      x: 150,
      y: 350,
      width: 200,
      height: 120,
      rotation: 0,
      fill: "#3b82f6",
      stroke: "#60a5fa",
      strokeWidth: 2,
      locked: false,
      visible: true,
      name: "Module 1",
    },
    {
      id: "module-2",
      type: "rectangle",
      x: 400,
      y: 350,
      width: 200,
      height: 120,
      rotation: 0,
      fill: "#10b981",
      stroke: "#34d399",
      strokeWidth: 2,
      locked: false,
      visible: true,
      name: "Module 2",
    },
    {
      id: "module-3",
      type: "ellipse",
      x: 650,
      y: 350,
      width: 180,
      height: 120,
      rotation: 0,
      fill: "#f59e0b",
      stroke: "#fbbf24",
      strokeWidth: 2,
      locked: false,
      visible: true,
      name: "Module 3",
    },
  ],
  selectedIds: [],
  activeTool: "select",
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  isPanning: false,

  addElement: (element) =>
    set((state) => ({
      elements: [...state.elements, element],
    })),

  updateElement: (id, updates) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, ...updates } : el
      ),
    })),

  deleteElement: (id) =>
    set((state) => ({
      elements: state.elements.filter((el) => el.id !== id),
      selectedIds: state.selectedIds.filter((sId) => sId !== id),
    })),

  selectElement: (id, multi = false) =>
    set((state) => ({
      selectedIds: multi
        ? state.selectedIds.includes(id)
          ? state.selectedIds.filter((sId) => sId !== id)
          : [...state.selectedIds, id]
        : [id],
    })),

  clearSelection: () => set({ selectedIds: [] }),

  setActiveTool: (tool) => set({ activeTool: tool }),

  setZoom: (zoom) => set({ zoom: Math.max(0.1, Math.min(5, zoom)) }),

  setPanOffset: (offset) => set({ panOffset: offset }),

  setIsPanning: (isPanning) => set({ isPanning }),

  moveElement: (id, dx, dy) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id && !el.locked
          ? { ...el, x: el.x + dx, y: el.y + dy }
          : el
      ),
    })),

  reorderElement: (id, direction) =>
    set((state) => {
      const index = state.elements.findIndex((el) => el.id === id)
      if (index === -1) return state
      
      const newIndex = direction === "up" ? index + 1 : index - 1
      if (newIndex < 0 || newIndex >= state.elements.length) return state
      
      const newElements = [...state.elements]
      const [element] = newElements.splice(index, 1)
      newElements.splice(newIndex, 0, element)
      
      return { elements: newElements }
    }),

  duplicateElement: (id) =>
    set((state) => {
      const element = state.elements.find((el) => el.id === id)
      if (!element) return state
      
      elementCounter++
      const newElement = {
        ...element,
        id: `${element.type}-${Date.now()}-${elementCounter}`,
        x: element.x + 20,
        y: element.y + 20,
        name: `${element.name} Copy`,
      }
      
      return {
        elements: [...state.elements, newElement],
        selectedIds: [newElement.id],
      }
    }),

  toggleLock: (id) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, locked: !el.locked } : el
      ),
    })),

  toggleVisibility: (id) =>
    set((state) => ({
      elements: state.elements.map((el) =>
        el.id === id ? { ...el, visible: !el.visible } : el
      ),
    })),
}))

export function generateElementId(type: ElementType): string {
  elementCounter++
  return `${type}-${Date.now()}-${elementCounter}`
}
