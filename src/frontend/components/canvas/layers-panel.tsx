"use client"

import { useState } from "react"
import {
  Square,
  Settings2,
  Circle,
  Type,
  Minus,
  ArrowRight,
  Image,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ChevronUp,
  ChevronDown,
  Layers,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCanvasStore, type ElementType } from "@/lib/canvas-store"
import { cn } from "@/lib/utils"
import { useWorkflowStore } from "@/lib/workflow-store"

const typeIcons: Record<ElementType, React.ReactNode> = {
  rectangle: <Square className="h-3.5 w-3.5" />,
  ellipse: <Circle className="h-3.5 w-3.5" />,
  text: <Type className="h-3.5 w-3.5" />,
  line: <Minus className="h-3.5 w-3.5" />,
  arrow: <ArrowRight className="h-3.5 w-3.5" />,
  image: <Image className="h-3.5 w-3.5" />,
}

interface LayersPanelProps {
  onClose?: () => void
}

export function LayersPanel({ onClose }: LayersPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [width, setWidth] = useState(240)
  const [isResizing, setIsResizing] = useState(false)

  const {
    elements,
    selectedIds,
    updateElement,
    selectElement,
    deleteElement,
    duplicateElement,
    toggleLock,
    toggleVisibility,
    reorderElement,
  } = useCanvasStore()

  const { nodes, selectedNodeId, moveNode } = useWorkflowStore()
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) ?? null : null
  const reversedElements = [...elements].reverse()

  const selectedElement = selectedIds.length === 1
    ? elements.find((el) => el.id === selectedIds[0])
    : null

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)

    const startX = e.clientX
    const startWidth = width

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX
      const newWidth = Math.min(Math.max(startWidth + delta, 200), 400)
      setWidth(newWidth)
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
  }

  if (isCollapsed) {
    return (
      <div className="absolute right-4 top-20 z-10">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10 bg-white shadow-lg border-gray-200"
          onClick={() => setIsCollapsed(false)}
        >
          <Layers className="h-4 w-4" />
        </Button>
      </div>
    )
  }

  return (
    <div
      className="absolute right-4 top-20 z-10 flex h-[calc(100%-6rem)] flex-col rounded-lg border border-gray-200 bg-white shadow-lg"
      style={{ width }}
    >
      {/* Resize Handle */}
      <div
        className={cn(
          "absolute left-0 top-0 h-full w-1 cursor-ew-resize hover:bg-primary/20 transition-colors",
          isResizing && "bg-primary/30"
        )}
        onMouseDown={handleMouseDown}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-100 px-3 py-2">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Layers</span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
            {elements.length}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setIsCollapsed(true)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left">Collapse</TooltipContent>
          </Tooltip>
          {onClose && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-gray-400 hover:text-red-500 hover:bg-red-50"
                  onClick={onClose}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Remove panel</TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Layers & Properties Section */}
      <ScrollArea className="flex-1 px-2">
        {/* Layers Section */}
        <div className="border-t border-gray-100 py-3">
          {/* <div className="mb-2 flex items-center gap-2 px-3">
            <Layers className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Layers</span>
            <span className="ml-auto rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
              {elements.length}
            </span>
          </div> */}

          <div className="space-y-0.5 px-1">
            {reversedElements.map((element) => {
              const isSelected = selectedIds.includes(element.id)

              return (
                <div
                  key={element.id}
                  className={cn(
                    "group flex items-center gap-2 rounded-md px-2 py-1.5 transition-colors cursor-pointer",
                    isSelected
                      ? "bg-primary/15 text-gray-900"
                      : "hover:bg-gray-50 text-gray-600 hover:text-gray-900"
                  )}
                  onClick={() => selectElement(element.id)}
                >
                  <div
                    className={cn(
                      "flex h-5 w-5 items-center justify-center rounded",
                      isSelected ? "text-primary" : "text-gray-400"
                    )}
                  >
                    {typeIcons[element.type]}
                  </div>

                  <span
                    className={cn(
                      "flex-1 truncate text-xs",
                      !element.visible && "opacity-50"
                    )}
                  >
                    {element.name}
                  </span>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleVisibility(element.id)
                          }}
                        >
                          {element.visible ? (
                            <Eye className="h-3 w-3" />
                          ) : (
                            <EyeOff className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {element.visible ? "Hide" : "Show"}
                      </TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleLock(element.id)
                          }}
                        >
                          {element.locked ? (
                            <Lock className="h-3 w-3 text-amber-500" />
                          ) : (
                            <Unlock className="h-3 w-3" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        {element.locked ? "Unlock" : "Lock"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Layer Actions */}
          {selectedIds.length > 0 && (
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 px-1 pt-2">
              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => reorderElement(selectedIds[0], "up")}
                    >
                      <ChevronUp className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move Up</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => reorderElement(selectedIds[0], "down")}
                    >
                      <ChevronDown className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Move Down</TooltipContent>
                </Tooltip>
              </div>

              <div className="flex items-center gap-0.5">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => duplicateElement(selectedIds[0])}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Duplicate</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-red-500 hover:text-red-600"
                      onClick={() => deleteElement(selectedIds[0])}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Delete</TooltipContent>
                </Tooltip>
              </div>
            </div>
          )}
        </div>

        {/* Properties Section */}
        <div className="border-t border-gray-100 py-3">
          <div className="mb-2 flex items-center gap-2 px-3">
            <Settings2 className="h-4 w-4 text-gray-500" />
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">Properties</span>
          </div>

          {/* Workflow node properties */}
          {selectedNode ? (
            <div className="space-y-4 px-1">
              {/* Node type badge */}
              <div className="px-2">
                <div className="flex items-center gap-2 rounded-md border border-gray-100 bg-gray-50 px-3 py-2">
                  <span className="text-base">{selectedNode.icon}</span>
                  <div className="min-w-0">
                    <p className="truncate text-xs font-semibold text-gray-900">{selectedNode.label}</p>
                    {selectedNode.sublabel && (
                      <p className="truncate text-[10px] text-gray-400">{selectedNode.sublabel}</p>
                    )}
                  </div>
                  <div
                    className="ml-auto h-2.5 w-2.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: `#${selectedNode.accentColor.toString(16).padStart(6, "0")}` }}
                  />
                </div>
              </div>

              {/* Node type */}
              <div className="space-y-1 px-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-400">Type</Label>
                <p className="rounded bg-gray-50 px-2 py-1.5 text-xs font-medium capitalize text-gray-700 border border-gray-100">
                  {selectedNode.type}
                </p>
              </div>

              {/* Position */}
              <div className="space-y-2 px-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-400">Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-400">X</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedNode.x)}
                      onChange={(e) => moveNode(selectedNode.id, Number(e.target.value), selectedNode.y)}
                      className="h-8 border-gray-200 bg-gray-50 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Y</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedNode.y)}
                      onChange={(e) => moveNode(selectedNode.id, selectedNode.x, Number(e.target.value))}
                      className="h-8 border-gray-200 bg-gray-50 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Accent color */}
              <div className="space-y-2 px-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-400">Accent Color</Label>
                <div className="flex items-center gap-2">
                  <div
                    className="h-8 w-8 flex-shrink-0 rounded border border-gray-200"
                    style={{ backgroundColor: `#${selectedNode.accentColor.toString(16).padStart(6, "0")}` }}
                  />
                  <Input
                    value={`#${selectedNode.accentColor.toString(16).padStart(6, "0")}`}
                    readOnly
                    className="h-8 flex-1 border-gray-200 bg-gray-50 text-xs font-mono text-gray-500"
                  />
                </div>
              </div>

              {/* Inputs */}
              {selectedNode.inputs.length > 0 && (
                <div className="space-y-1.5 px-2">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-400">
                    Inputs ({selectedNode.inputs.length})
                  </Label>
                  <div className="space-y-1">
                    {selectedNode.inputs.map((port) => (
                      <div key={port.id} className="flex items-center gap-2 rounded bg-gray-50 border border-gray-100 px-2 py-1.5">
                        <div className="h-2 w-2 rounded-full border-2 border-gray-400 bg-white" />
                        <span className="text-xs text-gray-600">{port.label}</span>
                        <span className="ml-auto text-[10px] text-gray-400 font-mono">{port.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outputs */}
              {selectedNode.outputs.length > 0 && (
                <div className="space-y-1.5 px-2">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-400">
                    Outputs ({selectedNode.outputs.length})
                  </Label>
                  <div className="space-y-1">
                    {selectedNode.outputs.map((port) => (
                      <div key={port.id} className="flex items-center gap-2 rounded bg-gray-50 border border-gray-100 px-2 py-1.5">
                        <span className="text-xs text-gray-600">{port.label}</span>
                        <div className="ml-auto h-2 w-2 rounded-full border-2 border-gray-400 bg-white" />
                        <span className="text-[10px] text-gray-400 font-mono">{port.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : !selectedElement ? (
            <div className="flex h-24 items-center justify-center px-3">
              <p className="text-center text-xs text-gray-400">
                Click a node to view its properties
              </p>
            </div>
          ) : (
            <div className="space-y-4 px-1">
              {/* Position */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Position</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-400">X</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedElement.x)}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { x: Number(e.target.value) })
                      }
                      className="h-8 border-gray-200 bg-gray-50 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">Y</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedElement.y)}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { y: Number(e.target.value) })
                      }
                      className="h-8 border-gray-200 bg-gray-50 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Size */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Size</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[10px] text-gray-400">W</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedElement.width)}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { width: Number(e.target.value) })
                      }
                      className="h-8 border-gray-200 bg-gray-50 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] text-gray-400">H</Label>
                    <Input
                      type="number"
                      value={Math.round(selectedElement.height)}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { height: Number(e.target.value) })
                      }
                      className="h-8 border-gray-200 bg-gray-50 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Fill Color */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Fill</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedElement.fill}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { fill: e.target.value })
                    }
                    className="h-8 w-8 cursor-pointer rounded border border-gray-200 bg-transparent"
                  />
                  <Input
                    value={selectedElement.fill}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { fill: e.target.value })
                    }
                    className="h-8 flex-1 border-gray-200 bg-gray-50 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Stroke */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">Stroke</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={selectedElement.stroke === "transparent" ? "#000000" : selectedElement.stroke}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { stroke: e.target.value })
                    }
                    className="h-8 w-8 cursor-pointer rounded border border-gray-200 bg-transparent"
                  />
                  <Input
                    value={selectedElement.stroke}
                    onChange={(e) =>
                      updateElement(selectedElement.id, { stroke: e.target.value })
                    }
                    className="h-8 flex-1 border-gray-200 bg-gray-50 text-xs font-mono"
                  />
                </div>
              </div>

              {/* Stroke Width */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">
                  Stroke Width: {selectedElement.strokeWidth}px
                </Label>
                <Slider
                  value={[selectedElement.strokeWidth]}
                  onValueChange={([value]) =>
                    updateElement(selectedElement.id, { strokeWidth: value })
                  }
                  min={0}
                  max={20}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Rotation */}
              <div className="space-y-2">
                <Label className="text-xs text-gray-500">
                  Rotation: {Math.round(selectedElement.rotation)}°
                </Label>
                <Slider
                  value={[selectedElement.rotation]}
                  onValueChange={([value]) =>
                    updateElement(selectedElement.id, { rotation: value })
                  }
                  min={0}
                  max={360}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Text properties */}
              {selectedElement.type === "text" && (
                <>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">Text</Label>
                    <Input
                      value={selectedElement.text || ""}
                      onChange={(e) =>
                        updateElement(selectedElement.id, { text: e.target.value })
                      }
                      className="h-8 border-gray-200 bg-gray-50 text-xs"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500">
                      Font Size: {selectedElement.fontSize}px
                    </Label>
                    <Slider
                      value={[selectedElement.fontSize || 16]}
                      onValueChange={([value]) =>
                        updateElement(selectedElement.id, { fontSize: value })
                      }
                      min={8}
                      max={128}
                      step={1}
                      className="w-full"
                    />
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
