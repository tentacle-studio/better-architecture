"use client"

import {
  MousePointer2,
  Hand,
  Square,
  Circle,
  Type,
  Minus,
  ArrowRight,
  Image,
  ZoomIn,
  ZoomOut,
  RotateCcw,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCanvasStore, type Tool } from "@/lib/canvas-store"
import { useWorkflowStore } from "@/lib/workflow-store"
import { cn } from "@/lib/utils"

const tools: { id: Tool; icon: React.ReactNode; label: string; shortcut: string }[] = [
  { id: "select", icon: <MousePointer2 className="h-4 w-4" />, label: "Select", shortcut: "V" },
  { id: "hand", icon: <Hand className="h-4 w-4" />, label: "Hand", shortcut: "H" },
  { id: "rectangle", icon: <Square className="h-4 w-4" />, label: "Rectangle", shortcut: "R" },
  { id: "ellipse", icon: <Circle className="h-4 w-4" />, label: "Ellipse", shortcut: "O" },
  { id: "text", icon: <Type className="h-4 w-4" />, label: "Text", shortcut: "T" },
  { id: "line", icon: <Minus className="h-4 w-4" />, label: "Line", shortcut: "L" },
  { id: "arrow", icon: <ArrowRight className="h-4 w-4" />, label: "Arrow", shortcut: "A" },
  { id: "image", icon: <Image className="h-4 w-4" />, label: "Image", shortcut: "I" },
]

export function Toolbar() {
  const { activeTool, setActiveTool } = useCanvasStore()
  const { zoom, panX, panY, setViewport } = useWorkflowStore()

  const handleZoomIn = () => setViewport(Math.min(zoom * 1.15, 4), panX, panY)
  const handleZoomOut = () => setViewport(Math.max(zoom * 0.85, 0.1), panX, panY)
  const handleResetView = () => setViewport(1, 0, 0)

  return (
    <TooltipProvider delayDuration={0}>
      <div className="absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-1 rounded-lg border border-border bg-card/95 p-1.5 shadow-lg backdrop-blur-sm">
        {tools.map((tool, index) => (
          <div key={tool.id} className="flex items-center">
            {index === 2 && <Separator orientation="vertical" className="mx-1 h-6" />}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant={activeTool === tool.id ? "secondary" : "ghost"}
                  size="icon"
                  className={cn(
                    "h-8 w-8",
                    activeTool === tool.id && "bg-primary text-primary-foreground hover:bg-primary/90"
                  )}
                  onClick={() => setActiveTool(tool.id)}
                >
                  {tool.icon}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="flex items-center gap-2">
                <span>{tool.label}</span>
                <kbd className="rounded bg-muted px-1.5 py-0.5 text-xs font-medium text-muted-foreground">
                  {tool.shortcut}
                </kbd>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}

        <Separator orientation="vertical" className="mx-1 h-6" />

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom Out</TooltipContent>
          </Tooltip>

          <span className="min-w-[48px] text-center text-xs font-medium text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Zoom In</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleResetView}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Reset View</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  )
}
