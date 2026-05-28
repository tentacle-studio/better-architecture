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
  ChevronRight,
} from "lucide-react"
import { Button } from "@shared/ui/button"
import { Input } from "@shared/ui/input"
import { Label } from "@shared/ui/label"
import { Slider } from "@shared/ui/slider"
import { ScrollArea } from "@shared/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/tooltip"
import { useCanvasStore, type ElementType } from "../model/canvas"
import { cn } from "@shared/lib/utils"
import { useWorkflowStore } from "../model/workflow"

const typeIcons: Record<ElementType, React.ReactNode> = {
  rectangle: <Square className="h-3.5 w-3.5" />,
  ellipse: <Circle className="h-3.5 w-3.5" />,
  text: <Type className="h-3.5 w-3.5" />,
  line: <Minus className="h-3.5 w-3.5" />,
  arrow: <ArrowRight className="h-3.5 w-3.5" />,
  image: <Image className="h-3.5 w-3.5" />,
}

export function PropertiesPanel() {
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
          <span className="text-sm font-medium text-gray-700">
            {nodes.length > 0 ? 'Infrastructure' : 'Layers'}
          </span>
          <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
            {nodes.length > 0 ? nodes.length : elements.length}
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
        </div>
      </div>

      {/* Layers & Properties Section */}
      <ScrollArea className="flex-1 px-2">
        {/* Infrastructure Nodes or Layers Section */}
        <div className="border-t border-gray-100 py-3">
          <div className="space-y-0.5 px-1">
            {/* Show infrastructure nodes if available */}
            {nodes.length > 0 ? (
              nodes.map((node) => {
                const isSelected = selectedNodeId === node.id
                return (
                  <div
                    key={node.id}
                    className={cn(
                      "group flex items-center gap-2 rounded-md px-2 py-2 transition-all cursor-pointer",
                      isSelected
                        ? "bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 shadow-sm"
                        : "hover:bg-gray-50 text-gray-600 hover:text-gray-900 border border-transparent"
                    )}
                    onClick={() => useWorkflowStore.getState().selectNode(node.id)}
                  >
                    <div className="flex h-7 w-7 items-center justify-center rounded-md"
                      style={{
                        backgroundColor: isSelected
                          ? `#${node.accentColor.toString(16).padStart(6, "0")}15`
                          : `#${node.accentColor.toString(16).padStart(6, "0")}08`
                      }}
                    >
                      <span className="text-sm">{node.icon}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "truncate text-xs font-medium",
                        isSelected ? "text-gray-900" : "text-gray-700"
                      )}>
                        {node.label}
                      </p>
                      {node.sublabel && (
                        <p className="truncate text-[10px] text-gray-400">
                          {node.sublabel}
                        </p>
                      )}
                    </div>

                    <div
                      className="h-2 w-2 flex-shrink-0 rounded-full"
                      style={{ backgroundColor: `#${node.accentColor.toString(16).padStart(6, "0")}` }}
                    />
                  </div>
                )
              })
            ) : (
              /* Fallback to regular elements */
              reversedElements.map((element) => {
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
              })
            )}
          </div>

          {/* Layer Actions - only show for canvas elements */}
          {nodes.length === 0 && selectedIds.length > 0 && (
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
              {/* Infrastructure Service Header */}
              <div className="px-2">
                <div className="flex items-center gap-3 rounded-lg border-2 px-4 py-3"
                  style={{
                    borderColor: `#${selectedNode.accentColor.toString(16).padStart(6, "0")}30`,
                    backgroundColor: `#${selectedNode.accentColor.toString(16).padStart(6, "0")}08`
                  }}
                >
                  <span className="text-2xl">{selectedNode.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm font-bold text-gray-900">{selectedNode.label}</p>
                    {selectedNode.sublabel && (
                      <p className="truncate text-xs text-gray-500 mt-0.5">{selectedNode.sublabel}</p>
                    )}
                  </div>
                  <div
                    className="h-3 w-3 flex-shrink-0 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: `#${selectedNode.accentColor.toString(16).padStart(6, "0")}` }}
                  />
                </div>
              </div>

              {/* Service Type */}
              <div className="space-y-1.5 px-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Service Type</Label>
                <div className="rounded-md bg-gradient-to-r from-gray-50 to-gray-100 px-3 py-2 border border-gray-200">
                  <p className="text-xs font-medium capitalize text-gray-700">
                    {selectedNode.type === 'tool' ? 'Infrastructure Service' : selectedNode.type}
                  </p>
                </div>
              </div>

              {/* Service Endpoint (from output port) */}
              {selectedNode.outputs.length > 0 && (
                <div className="space-y-1.5 px-2">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Service Endpoint
                  </Label>
                  <div className="rounded-md bg-blue-50 border border-blue-200 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <code className="text-xs font-mono text-blue-900">
                        {selectedNode.id.replace('infra-', '')}:{selectedNode.outputs[0].label.replace('Port ', '')}
                      </code>
                    </div>
                    <p className="text-[10px] text-blue-600 mt-1">Ready for connections</p>
                  </div>
                </div>
              )}

              {/* Connection Details */}
              <div className="space-y-1.5 px-2">
                <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                  How to Connect
                </Label>
                <div className="rounded-md bg-gray-50 border border-gray-200 px-3 py-2 space-y-2">
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 mt-0.5">•</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">
                        Host: <code className="font-mono text-gray-900 bg-white px-1 py-0.5 rounded border">{selectedNode.id.replace('infra-', '')}</code>
                      </p>
                    </div>
                  </div>
                  {selectedNode.outputs.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-400 mt-0.5">•</span>
                      <div className="flex-1">
                        <p className="text-xs text-gray-600">
                          Port: <code className="font-mono text-gray-900 bg-white px-1 py-0.5 rounded border">
                            {selectedNode.outputs[0].label.replace('Port ', '')}
                          </code>
                        </p>
                      </div>
                    </div>
                  )}
                  <div className="flex items-start gap-2">
                    <span className="text-xs text-gray-400 mt-0.5">•</span>
                    <div className="flex-1">
                      <p className="text-xs text-gray-600">
                        Access from shell pod
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Input Connections */}
              {selectedNode.inputs.length > 0 && (
                <div className="space-y-1.5 px-2">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Incoming Connections ({selectedNode.inputs.length})
                  </Label>
                  <div className="space-y-1.5">
                    {selectedNode.inputs.map((port) => (
                      <div key={port.id} className="flex items-center gap-2 rounded-md bg-purple-50 border border-purple-200 px-3 py-2">
                        <div className="h-2.5 w-2.5 rounded-full border-2 border-purple-400 bg-white" />
                        <span className="text-xs font-medium text-purple-900">{port.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Output Connections */}
              {selectedNode.outputs.length > 0 && (
                <div className="space-y-1.5 px-2">
                  <Label className="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">
                    Outgoing Connections ({selectedNode.outputs.length})
                  </Label>
                  <div className="space-y-1.5">
                    {selectedNode.outputs.map((port) => (
                      <div key={port.id} className="flex items-center gap-2 rounded-md bg-emerald-50 border border-emerald-200 px-3 py-2">
                        <span className="text-xs font-medium text-emerald-900">{port.label}</span>
                        <div className="ml-auto h-2.5 w-2.5 rounded-full border-2 border-emerald-400 bg-white" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Position (Advanced) */}
              <details className="px-2">
                <summary className="cursor-pointer text-[10px] uppercase tracking-wider text-gray-400 font-semibold mb-2">
                  Advanced Settings
                </summary>
                <div className="space-y-2 mt-2">
                  <Label className="text-[10px] text-gray-400">Canvas Position</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <Label className="text-[10px] text-gray-400">X</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedNode.x)}
                        onChange={(e) => moveNode(selectedNode.id, Number(e.target.value), selectedNode.y)}
                        className="h-7 border-gray-200 bg-gray-50 text-xs"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] text-gray-400">Y</Label>
                      <Input
                        type="number"
                        value={Math.round(selectedNode.y)}
                        onChange={(e) => moveNode(selectedNode.id, selectedNode.x, Number(e.target.value))}
                        className="h-7 border-gray-200 bg-gray-50 text-xs"
                      />
                    </div>
                  </div>
                </div>
              </details>
            </div>
          ) : !selectedElement ? (
            <div className="flex h-24 items-center justify-center px-3">
              <p className="text-center text-xs text-gray-400">
                Select an infrastructure node to view details
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
