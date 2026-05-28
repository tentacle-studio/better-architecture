import { memo, useState, useCallback, useEffect } from "react"
import { useParams } from "react-router-dom"
import { TerminalSquare, Code2, Layers, CheckCircle, XCircle, Send, Activity } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { cn } from "@/shared/lib/utils"
import { useCanvasSync } from "@features/sandbox"
import type { CanvasMessage } from "@features/sandbox"
import { getLatencySnapshot, LatencyDashboard, submitLab } from "@entities/lab"
import type { LatencySnapshot, QuizCheck } from "@entities/lab"
import { ResourceList, useResourceStream } from "@entities/resource"
import { BottomPanel } from "./BottomPanel"
import { Canvas } from "./Canvas"
import { Header } from "./CanvasHeader"
import { LeftSidebar } from "./LeftSidebar"
import { PropertiesPanel } from "./PropertiesPanel"
import { Toolbar } from "./CanvasToolbar"
import { applyResourceMessage, applyTrafficMessage } from "../model/traffic-sync"
import type { ResourceMessage, TrafficMessage } from "../model/traffic-sync"

// Memoize components to avoid unnecessary re-renders during resize
const MemoizedHeader = memo(Header)
const MemoizedToolbar = memo(Toolbar)
const MemoizedLeftSidebar = memo(LeftSidebar)
const MemoizedPropertiesPanel = memo(PropertiesPanel)

export default function LabsPage() {
    const { labId, sandboxId } = useParams<{ labId?: string; sandboxId?: string }>()

    const [showLayers, setShowLayers] = useState(true)
    const [showBottomPanel, setShowBottomPanel] = useState(false)
    const [bottomPanelHeight, setBottomPanelHeight] = useState(260)
    const [submitResult, setSubmitResult] = useState<QuizCheck | null>(null)
    const [submitting, setSubmitting] = useState(false)
    const [showResourceList, setShowResourceList] = useState(false)
    const [showLatencyPanel, setShowLatencyPanel] = useState(true)
    const [latencySnapshot, setLatencySnapshot] = useState<LatencySnapshot | null>(null)
    const [latencyLoading, setLatencyLoading] = useState(false)

    // Resource streaming
    const wsUrl = `ws://${window.location.host}`
    const { resources, isLoading, error } = useResourceStream({
        sandboxId: sandboxId ?? null,
        wsUrl,
    })

    const handleCanvasMsg = useCallback((msg: CanvasMessage) => {
        if (msg.type === "resource_event" || msg.type === "batch") {
            applyResourceMessage(msg as ResourceMessage)
        } else if (msg.type === "traffic") {
            applyTrafficMessage(msg as TrafficMessage)
        }
    }, [])

    useCanvasSync(sandboxId ?? null, handleCanvasMsg)

    useEffect(() => {
        if (!labId || !sandboxId) {
            setLatencySnapshot(null)
            return
        }

        let cancelled = false

        const load = async () => {
            setLatencyLoading(true)
            const snapshot = await getLatencySnapshot(labId, sandboxId)
            if (!cancelled) {
                setLatencySnapshot(snapshot)
                setLatencyLoading(false)
            }
        }

        void load()
        const interval = window.setInterval(() => {
            void load()
        }, 5000)

        return () => {
            cancelled = true
            window.clearInterval(interval)
        }
    }, [labId, sandboxId])

    const handleSubmit = async () => {
        if (!labId || !sandboxId) return
        setSubmitting(true)
        const result = await submitLab(labId, sandboxId)
        setSubmitResult(result)
        setSubmitting(false)
    }

    return (
        <div className="flex h-screen flex-col bg-background">
            <MemoizedHeader />
            <main className="relative flex min-h-0 flex-1 overflow-hidden">
                <MemoizedLeftSidebar labId={labId} />

                {/* Canvas column — flex-col so bottom panel stacks below canvas */}
                <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                    <MemoizedToolbar />

                    {/* Canvas + floating layers + resource list */}
                    <div className="relative min-h-0 flex-1 overflow-hidden">
                        {showLayers && (
                            <MemoizedPropertiesPanel />
                        )}
                        {/* Resource list overlay */}
                        {showResourceList && (
                            <div className="absolute top-4 right-4 z-20 w-80 max-h-[400px] overflow-auto rounded-lg border bg-white shadow-xl">
                                <div className="flex items-center justify-between border-b px-4 py-2">
                                    <h3 className="text-sm font-semibold">Resources</h3>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => setShowResourceList(false)}
                                    >
                                        <XCircle className="h-3 w-3" />
                                    </Button>
                                </div>
                                <div className="p-4">
                                    <ResourceList resources={resources} isLoading={isLoading} error={error} />
                                </div>
                            </div>
                        )}
                        {showLatencyPanel && sandboxId && (
                            <LatencyDashboard
                                snapshot={latencySnapshot}
                                isLoading={latencyLoading}
                                className="absolute top-4 left-4 z-20"
                            />
                        )}
                        <Canvas labId={labId} />
                    </div>

                    {/* Bottom panel (Terminal / Editor) — always mounted to preserve terminal session */}
                    <div className={showBottomPanel ? undefined : "hidden"}>
                        <BottomPanel
                            height={bottomPanelHeight}
                            onHeightChange={setBottomPanelHeight}
                            onClose={() => setShowBottomPanel(false)}
                            sandboxId={sandboxId}
                        />
                    </div>
                </div>

                {/* Status bar panel toggles */}
                <div className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2">
                    <div className="flex items-center gap-1 rounded-lg border border-white/10 bg-[#0a0d14]/90 px-1.5 py-1 shadow-xl backdrop-blur-sm">
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-white/8",
                                        showLayers && "bg-white/10 text-slate-200"
                                    )}
                                    onClick={() => setShowLayers((v) => !v)}
                                >
                                    <Layers className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {showLayers ? "Hide Layers" : "Show Layers"}
                            </TooltipContent>
                        </Tooltip>

                        <div className="h-4 w-px bg-white/10" />

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-white/8",
                                        showResourceList && "bg-white/10 text-slate-200"
                                    )}
                                    onClick={() => setShowResourceList((v) => !v)}
                                >
                                    <TerminalSquare className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {showResourceList ? "Hide Resources" : "Show Resources"}
                            </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className={cn(
                                        "h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-white/8",
                                        showBottomPanel && "bg-white/10 text-slate-200"
                                    )}
                                    onClick={() => setShowBottomPanel((v) => !v)}
                                >
                                    <Code2 className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {showBottomPanel ? "Hide Terminal / Editor" : "Show Terminal / Editor"}
                            </TooltipContent>
                        </Tooltip>

                        {sandboxId && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className={cn(
                                            "h-7 w-7 text-slate-400 hover:text-slate-200 hover:bg-white/8",
                                            showLatencyPanel && "bg-white/10 text-slate-200"
                                        )}
                                        onClick={() => setShowLatencyPanel((v) => !v)}
                                    >
                                        <Activity className="h-3.5 w-3.5" />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                    {showLatencyPanel ? "Hide Latency Dashboard" : "Show Latency Dashboard"}
                                </TooltipContent>
                            </Tooltip>
                        )}

                        {sandboxId && (
                            <>
                                <div className="h-4 w-px bg-white/10" />
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            size="sm"
                                            disabled={submitting}
                                            className="h-7 gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3"
                                            onClick={() => { void handleSubmit() }}
                                        >
                                            <Send className="h-3 w-3" />
                                            {submitting ? "Checking…" : "Submit"}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="top">Submit your solution</TooltipContent>
                                </Tooltip>
                            </>
                        )}
                    </div>
                </div>
            </main>

            {/* Submit results overlay */}
            {submitResult !== null && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setSubmitResult(null)}
                >
                    <div
                        className="relative w-full max-w-md rounded-2xl border border-gray-100 bg-white p-8 shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
                            onClick={() => setSubmitResult(null)}
                        >
                            <XCircle className="h-5 w-5" />
                        </button>

                        <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900 mb-4">
                            {submitResult.passed
                                ? <><CheckCircle className="h-5 w-5 text-emerald-500" /> Passed!</>
                                : <><XCircle className="h-5 w-5 text-red-500" /> Not quite</>
                            }
                        </h2>

                        <p className="text-sm text-gray-600 mb-3">
                            Score:{" "}
                            <strong className="text-gray-900">
                                {submitResult.score}/{submitResult.maxScore}
                            </strong>
                        </p>

                        {submitResult.feedback && (
                            <p className="text-sm text-gray-500 mb-4">{submitResult.feedback}</p>
                        )}

                        <ul className="space-y-2">
                            {submitResult.checks.map((c, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm">
                                    {c.passed
                                        ? <CheckCircle className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                                        : <XCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                                    }
                                    <span className="text-gray-600">
                                        <strong className="text-gray-800">{c.name}:</strong> {c.message}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            )}
        </div>
    )
}
