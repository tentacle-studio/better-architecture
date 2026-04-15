"use client"

import { useState, useRef, useCallback, useEffect } from "react"
import {
  Settings2,
  Home,
  BookOpen,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Variable,
  User,
  MoreHorizontal,
  Layers,
  Square,
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
} from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { useCanvasStore, type ElementType } from "@/lib/canvas-store"
import { useWorkflowStore } from "@/lib/workflow-store"

const typeIcons: Record<ElementType, React.ReactNode> = {
  rectangle: <Square className="h-3.5 w-3.5" />,
  ellipse: <Circle className="h-3.5 w-3.5" />,
  text: <Type className="h-3.5 w-3.5" />,
  line: <Minus className="h-3.5 w-3.5" />,
  arrow: <ArrowRight className="h-3.5 w-3.5" />,
  image: <Image className="h-3.5 w-3.5" />,
}
import { cn } from "@/lib/utils"

export function LeftSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [width, setWidth] = useState(260)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

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

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    const newWidth = e.clientX
    if (newWidth >= 200 && newWidth <= 400) {
      setWidth(newWidth)
    }
  }, [isResizing])

  const handleMouseUp = useCallback(() => {
    setIsResizing(false)
  }, [])

  useEffect(() => {
    if (isResizing) {
      document.addEventListener("mousemove", handleMouseMove)
      document.addEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = "col-resize"
      document.body.style.userSelect = "none"
    } else {
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }

    return () => {
      document.removeEventListener("mousemove", handleMouseMove)
      document.removeEventListener("mouseup", handleMouseUp)
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  const navItems = [
    { icon: Home, label: "Overview", active: true },
    { icon: BookOpen, label: "Courses", active: false },
  ]

  const bottomNavItems = [
    { icon: FolderOpen, label: "Templates" },
    { icon: Variable, label: "Variables" },
    { icon: HelpCircle, label: "Help" },
  ]

  if (isCollapsed) {
    return (
      <div className="relative flex h-full w-12 flex-col border-r border-gray-200 bg-white">
        <TooltipProvider delayDuration={0}>
          <div className="flex h-14 items-center justify-center border-b border-gray-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
          </div>

          <div className="flex flex-1 flex-col items-center gap-1 py-3">
            {navItems.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-9 w-9",
                      item.active && "bg-gray-100"
                    )}
                  >
                    <item.icon className="h-4 w-4 text-gray-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="flex flex-col items-center gap-1 border-t border-gray-100 py-3">
            {bottomNavItems.map((item) => (
              <Tooltip key={item.label}>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <item.icon className="h-4 w-4 text-gray-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ))}
          </div>

          <div className="flex flex-col items-center border-t border-gray-100 py-3">
            <Button variant="ghost" size="icon" className="h-9 w-9">
              <User className="h-4 w-4 text-gray-600" />
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="absolute -right-3 top-1/2 z-10 h-6 w-6 -translate-y-1/2 rounded-full border border-gray-200 bg-white shadow-sm hover:bg-gray-50"
            onClick={() => setIsCollapsed(false)}
          >
            <ChevronRight className="h-3 w-3 text-gray-600" />
          </Button>
        </TooltipProvider>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div
        ref={sidebarRef}
        className="relative flex h-full flex-col border-r border-gray-200 bg-white"
        style={{ width: `${width}px` }}
      >
        {/* Header */}
        <div className="flex h-14 items-center gap-3 border-b border-gray-100 px-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
            <BookOpen className="h-4 w-4 text-primary" />
          </div>
          <span className="font-semibold text-gray-900">Training Lab</span>
          <Button variant="ghost" size="icon" className="ml-auto h-8 w-8 rounded-md border border-gray-200">
            <span className="text-lg text-gray-500">+</span>
          </Button>
        </div>

        {/* Navigation */}
        <div className="flex flex-col gap-0.5 px-2 py-2">
          {navItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              className={cn(
                "h-9 w-full justify-start gap-3 px-3 text-sm font-normal",
                item.active
                  ? "bg-gray-100 text-gray-900"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </div>

        {/* Bottom Navigation */}
        <div className="flex flex-col gap-0.5 border-t border-gray-100 px-2 py-2">
          {bottomNavItems.map((item) => (
            <Button
              key={item.label}
              variant="ghost"
              className="h-9 w-full justify-start gap-3 px-3 text-sm font-normal text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Button>
          ))}
        </div>

        {/* User Section */}
        <div className="flex items-center gap-3 border-t border-gray-100 px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-teal-600 text-xs font-medium text-white">
            JD
          </div>
          <span className="flex-1 truncate text-sm text-gray-700">John Doe</span>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <MoreHorizontal className="h-4 w-4 text-gray-500" />
          </Button>
        </div>

        {/* Resize Handle */}
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 transition-colors"
          onMouseDown={handleMouseDown}
        />
      </div>
    </TooltipProvider>
  )
}
