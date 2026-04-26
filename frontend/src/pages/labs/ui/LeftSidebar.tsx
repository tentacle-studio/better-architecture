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
  FileText,
  Lightbulb,
  History,
  Tag,
  Building2,
} from "lucide-react"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { Slider } from "@/shared/ui/slider"
import { Button } from "@/shared/ui/button"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { Badge } from "@/shared/ui/badge"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/ui/tooltip"
import { useWorkflowStore } from "../model/workflow"
import { cn } from "@shared/lib/utils"

export function LeftSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [width, setWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [activeTab, setActiveTab] = useState<"description" | "solutions" | "submissions">("description")
  const sidebarRef = useRef<HTMLDivElement>(null)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    const newWidth = e.clientX
    if (newWidth >= 200 && newWidth <= 600) {
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
    }
  }, [isResizing, handleMouseMove, handleMouseUp])

  if (isCollapsed) {
    return (
      <div className="relative flex h-full w-12 flex-col border-r border-gray-200 bg-white">
        <TooltipProvider delayDuration={0}>
          <div className="flex h-14 items-center justify-center border-b border-gray-100">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => {
                setIsCollapsed(false)
                setActiveTab("description")
              }}
            >
              <FileText className="h-4 w-4 text-gray-600" />
            </Button>
          </div>

          <div className="flex flex-1 flex-col items-center gap-1 py-3">
            <Button
              variant="ghost"
              size="icon"
              className={cn("h-9 w-9", activeTab === "description" && "bg-gray-100")}
              onClick={() => setIsCollapsed(false)}
            >
              <FileText className="h-4 w-4 text-primary" />
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
        className="relative flex h-full flex-col border-r border-gray-200 bg-white shadow-sm"
        style={{ width: `${width}px` }}
      >
        {/* Tabs */}
        <div className="flex items-center justify-between border-b border-gray-100 bg-gray-50/50 shrink-0">
          <button
            onClick={() => setActiveTab("description")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 border-b-2 text-[11px] font-bold transition-colors uppercase tracking-wider",
              activeTab === "description"
                ? "border-primary text-primary bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
            )}
          >
            <FileText className="h-3.5 w-3.5" />
            Description
          </button>
          <button
            onClick={() => setActiveTab("solutions")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 border-b-2 text-[11px] font-bold transition-colors uppercase tracking-wider",
              activeTab === "solutions"
                ? "border-primary text-primary bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
            )}
          >
            <Lightbulb className="h-3.5 w-3.5" />
            Solutions
          </button>
          <button
            onClick={() => setActiveTab("submissions")}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 border-b-2 text-[11px] font-bold transition-colors uppercase tracking-wider",
              activeTab === "submissions"
                ? "border-primary text-primary bg-white"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
            )}
          >
            <History className="h-3.5 w-3.5" />
            Submissions
          </button>
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            <h1 className="text-2xl font-bold mb-3 text-gray-900 tracking-tight">1. Deploy Nginx Pod</h1>

            <div className="flex gap-2 mb-8">
              <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-none font-bold px-2.5 py-0.5">
                Easy
              </Badge>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-semibold">
                <Tag className="h-3 w-3" />
                Topics
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-semibold">
                <Building2 className="h-3 w-3" />
                Companies
              </div>
            </div>

            <div className="prose prose-sm max-w-none text-gray-600 space-y-4 mb-10 leading-relaxed">
              <p>Create and deploy a Kubernetes Pod using the <code className="bg-gray-100 px-1 rounded text-primary font-medium">nginx:latest</code> image.</p>
              <p>Your task is to construct the appropriate YAML manifest or use imperative commands to instantiate this pod within the cluster.</p>
              <p>You must ensure that the container exposes port <strong className="text-gray-900 font-bold">80</strong> to accept incoming traffic.</p>
            </div>

            <div className="mb-8">
              <h3 className="font-bold mb-3 text-sm text-gray-900 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-primary/20 rounded-full" />
                Example 1:
              </h3>
              <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 text-[13px] text-gray-600 space-y-3 shadow-sm">
                <div>
                  <span className="font-bold text-gray-900 mr-2">Input:</span>
                  <code className="bg-white border border-gray-200 px-2 py-0.5 rounded font-mono">kubectl apply -f pod.yaml</code>
                </div>
                <div>
                  <span className="font-bold text-gray-900 mr-2">Output:</span>
                  <code className="font-mono text-emerald-600">pod/nginx-pod created</code>
                </div>
                <div className="pt-2 border-t border-gray-200/50">
                  <span className="font-bold text-gray-900 block mb-1 text-[11px] uppercase tracking-wider text-gray-400">Explanation:</span>
                  The cluster successfully accepts the configuration and schedules the Nginx container.
                </div>
              </div>
            </div>

            <div className="mb-10">
              <h3 className="font-bold mb-3 text-sm text-gray-900 flex items-center gap-2">
                <div className="w-1.5 h-4 bg-primary/20 rounded-full" />
                Constraints:
              </h3>
              <ul className="space-y-3">
                {[
                  "The pod name must be exactly nginx-pod.",
                  "The image must be nginx:latest.",
                  "The container port must be configured as 80.",
                  "Only one valid pod should be created."
                ].map((constraint, i) => (
                  <li key={i} className="flex gap-3 text-sm text-gray-600 items-start">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/40 mt-1.5 shrink-0" />
                    <span>{constraint}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </ScrollArea>

        {/* Resize Handle */}
        <div
          className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-primary/20 transition-colors z-20"
          onMouseDown={handleMouseDown}
        />

      </div>
    </TooltipProvider>
  )
}
