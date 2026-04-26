import { useState, useRef, useEffect, useCallback } from "react"
import { TerminalSquare, Code2, X, GripHorizontal, Maximize2, Minimize2 } from "lucide-react"
import { cn } from "@shared/lib/utils"
import { Button } from "@shared/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@shared/ui/tooltip"
import { TerminalPane } from "./TerminalPane"
import { EditorPane } from "./EditorPane"

type Tab = "terminal" | "editor"

interface BottomPanelProps {
  height: number
  onHeightChange: (h: number) => void
  onClose: () => void
}

const MIN_HEIGHT = 120
const MAX_HEIGHT = 600

export function BottomPanel({ height, onHeightChange, onClose }: BottomPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("terminal")
  const [isMaximized, setIsMaximized] = useState(false)
  const isDragging = useRef(false)
  const startY = useRef(0)
  const startHeight = useRef(0)

  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      isDragging.current = true
      startY.current = e.clientY
      startHeight.current = height
      document.body.style.cursor = "row-resize"
      document.body.style.userSelect = "none"
    },
    [height]
  )

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return
      const delta = startY.current - e.clientY
      const newHeight = Math.min(Math.max(startHeight.current + delta, MIN_HEIGHT), MAX_HEIGHT)
      onHeightChange(newHeight)
    }

    const handleMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    document.addEventListener("mousemove", handleMouseMove)
    document.addEventListener("mouseup", handleMouseUp)
    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
    }
  }, [onHeightChange])

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "terminal", label: "Terminal", icon: <TerminalSquare className="h-3.5 w-3.5" /> },
    { id: "editor", label: "Editor", icon: <Code2 className="h-3.5 w-3.5" /> },
  ]

  const panelHeight = isMaximized ? MAX_HEIGHT : height

  return (
    <div
      className="flex flex-col border-t border-white/8 bg-[#0f1117]"
      style={{ height: panelHeight, flexShrink: 0 }}
    >
      {/* Drag handle */}
      <div
        className="group relative flex h-[5px] w-full cursor-row-resize items-center justify-center bg-transparent hover:bg-sky-400/20 transition-colors"
        onMouseDown={handleDragStart}
      >
        <div className="absolute inset-x-0 top-0 h-px bg-white/8" />
        <GripHorizontal className="h-3 w-3 text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>

      {/* Tab bar */}
      <div className="flex h-9 flex-shrink-0 items-center border-b border-white/6 bg-[#0a0d14] px-2">
        <div className="flex items-center gap-0.5">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 rounded px-3 py-1.5 text-xs font-medium transition-colors",
                activeTab === tab.id
                  ? "bg-white/8 text-slate-200"
                  : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
              )}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-sky-400" />
              )}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-500 hover:text-slate-300 hover:bg-white/5"
                onClick={() => setIsMaximized((v) => !v)}
              >
                {isMaximized ? (
                  <Minimize2 className="h-3.5 w-3.5" />
                ) : (
                  <Maximize2 className="h-3.5 w-3.5" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">{isMaximized ? "Restore" : "Maximize"}</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-slate-500 hover:text-red-400 hover:bg-red-400/10"
                onClick={onClose}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Close panel</TooltipContent>
          </Tooltip>
        </div>
      </div>

      {/* Pane content */}
      <div className="min-h-0 flex-1">
        <div className={cn("h-full", activeTab === "terminal" ? "block" : "hidden")}>
          <TerminalPane isActive={activeTab === "terminal"} />
        </div>
        <div className={cn("h-full", activeTab === "editor" ? "block" : "hidden")}>
          <EditorPane isActive={activeTab === "editor"} />
        </div>
      </div>
    </div>
  )
}
