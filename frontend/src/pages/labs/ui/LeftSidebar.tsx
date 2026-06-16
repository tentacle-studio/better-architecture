import { useState, useRef, useCallback, useEffect } from "react"
import {
  ChevronRight,
  FileText,
  Lightbulb,
  History,
  Tag,
  Lock,
  Clock,
  Loader2,
} from "lucide-react"
import { Button } from "@/shared/ui/button"
import { ScrollArea } from "@/shared/ui/scroll-area"
import { Badge } from "@/shared/ui/badge"
import { TooltipProvider } from "@/shared/ui/tooltip"
import { cn } from "@shared/lib/utils"
import { getLab, getLabSolutions } from "@entities/lab"
import type { Lab } from "@entities/lab"
import { SubmissionCard } from "@entities/submission"
import type { Submission } from "@entities/submission"
import { httpClient } from "@shared/api"

const DIFFICULTY_STYLES: Record<string, string> = {
  Easy:   "bg-emerald-50 text-emerald-700",
  Medium: "bg-amber-50 text-amber-700",
  Hard:   "bg-red-50 text-red-700",
}

export function LeftSidebar({ labId }: { labId?: string }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [width, setWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const [activeTab, setActiveTab] = useState<"description" | "solutions" | "submissions">("description")
  const sidebarRef = useRef<HTMLDivElement>(null)

  const [lab, setLab] = useState<Lab | null>(null)
  const [solutions, setSolutions] = useState<string[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [solutionsLocked, setSolutionsLocked] = useState(true)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!labId) return
    setLoading(true)
    Promise.all([
      getLab(labId),
      httpClient.get<Submission[]>(`/submissions?labId=${labId}`),
    ]).then(([labData, subsRes]) => {
      setLab(labData)
      if (!subsRes.error) {
        setSubmissions(subsRes.data)
        setSolutionsLocked(subsRes.data.length === 0)
      }
      setLoading(false)
    })
  }, [labId])

  useEffect(() => {
    if (activeTab !== "solutions" || solutionsLocked || !labId || solutions.length > 0) return
    getLabSolutions(labId).then(setSolutions)
  }, [activeTab, labId, solutions.length, solutionsLocked])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing) return
    const newWidth = e.clientX
    if (newWidth >= 200 && newWidth <= 600) setWidth(newWidth)
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
              onClick={() => { setIsCollapsed(false); setActiveTab("description") }}
            >
              <FileText className="h-4 w-4 text-gray-600" />
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

  const descriptionContent = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )
    }
    if (!lab) {
      return <p className="text-sm text-gray-400">No lab selected.</p>
    }
    return (
      <>
        <h1 className="text-2xl font-bold mb-3 text-gray-900 tracking-tight">{lab.title}</h1>
        <div className="flex flex-wrap gap-2 mb-8">
          <Badge
            variant="secondary"
            className={cn("border-none font-bold px-2.5 py-0.5", DIFFICULTY_STYLES[lab.difficulty])}
          >
            {lab.difficulty}
          </Badge>
          <div className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-semibold">
            <Clock className="h-3 w-3" />
            {lab.estimatedMin} min
          </div>
          {lab.tags.map((tag) => (
            <div key={tag} className="flex items-center gap-1.5 px-2.5 py-0.5 bg-gray-100 text-gray-600 rounded-full text-[11px] font-semibold">
              <Tag className="h-3 w-3" />
              {tag}
            </div>
          ))}
        </div>
        {/* react-markdown can replace this whitespace renderer once installed */}
        <div className="prose prose-sm max-w-none text-gray-600 leading-relaxed whitespace-pre-wrap mb-10">
          {lab.description}
        </div>
      </>
    )
  }

  const solutionsContent = () => {
    if (solutionsLocked) {
      return (
        <div className="flex flex-col items-center gap-3 py-12 text-center">
          <Lock className="h-8 w-8 text-gray-300" />
          <p className="text-sm text-gray-400">Complete a submission to unlock solutions.</p>
        </div>
      )
    }
    if (solutions.length === 0) {
      return (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
        </div>
      )
    }
    return (
      <div className="space-y-4">
        {solutions.map((sol, i) => (
          <div key={i} className="rounded-lg border border-gray-100 bg-gray-50 p-4">
            <pre className="text-xs text-gray-700 font-mono whitespace-pre-wrap">{sol}</pre>
          </div>
        ))}
      </div>
    )
  }

  const submissionsContent = () => {
    if (submissions.length === 0) {
      return <p className="text-sm text-gray-400">No submissions yet.</p>
    }
    return (
      <div className="space-y-3">
        {submissions.map((s) => (
          <SubmissionCard key={s.id} submission={s} />
        ))}
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
          {(["description", "solutions", "submissions"] as const).map((tab) => {
            const icons = { description: <FileText className="h-3.5 w-3.5" />, solutions: <Lightbulb className="h-3.5 w-3.5" />, submissions: <History className="h-3.5 w-3.5" /> }
            const labels = { description: "Description", solutions: "Solutions", submissions: "Submissions" }
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-3 border-b-2 text-[11px] font-bold transition-colors uppercase tracking-wider",
                  activeTab === tab
                    ? "border-primary text-primary bg-white"
                    : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-100/50"
                )}
              >
                {icons[tab]}
                {labels[tab]}
              </button>
            )
          })}
        </div>

        {/* Content */}
        <ScrollArea className="flex-1">
          <div className="p-6">
            {activeTab === "description"  && descriptionContent()}
            {activeTab === "solutions"    && solutionsContent()}
            {activeTab === "submissions"  && submissionsContent()}
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
