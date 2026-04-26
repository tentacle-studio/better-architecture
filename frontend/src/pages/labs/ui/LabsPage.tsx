import { memo, useState } from "react"
import { Header } from "./CanvasHeader"
import { Toolbar } from "./CanvasToolbar"
import { LeftSidebar } from "./LeftSidebar"
import { PropertiesPanel } from "./PropertiesPanel"
import { Canvas } from "./Canvas"
import { BottomPanel } from "./BottomPanel"
import { TerminalSquare, Code2, Layers } from "lucide-react"
import { Button } from "@/shared/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/shared/ui/tooltip"
import { cn } from "@/shared/lib/utils"

// Memoize components to avoid unnecessary re-renders during resize
const MemoizedHeader = memo(Header)
const MemoizedToolbar = memo(Toolbar)
const MemoizedLeftSidebar = memo(LeftSidebar)
const MemoizedPropertiesPanel = memo(PropertiesPanel)
const MemoizedCanvas = memo(Canvas)

export default function LabsPage() {
    const [showLayers, setShowLayers] = useState(true)
    const [showBottomPanel, setShowBottomPanel] = useState(false)
    const [bottomPanelHeight, setBottomPanelHeight] = useState(260)

    return (
        <div className="flex h-screen flex-col bg-background">
            <MemoizedHeader />
            <main className="relative flex min-h-0 flex-1 overflow-hidden">
                <MemoizedLeftSidebar />

                {/* Canvas column — flex-col so bottom panel stacks below canvas */}
                <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
                    <MemoizedToolbar />

                    {/* Canvas + floating layers */}
                    <div className="relative min-h-0 flex-1 overflow-hidden">
                        {showLayers && (
                            <MemoizedPropertiesPanel onClose={() => setShowLayers(false)} />
                        )}
                        <MemoizedCanvas />
                    </div>

                    {/* Bottom panel (Terminal / Editor) */}
                    {showBottomPanel && (
                        <BottomPanel
                            height={bottomPanelHeight}
                            onHeightChange={setBottomPanelHeight}
                            onClose={() => setShowBottomPanel(false)}
                        />
                    )}
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
                                        showBottomPanel && "bg-white/10 text-slate-200"
                                    )}
                                    onClick={() => setShowBottomPanel((v) => !v)}
                                >
                                    <TerminalSquare className="h-3.5 w-3.5" />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                                {showBottomPanel ? "Hide Terminal / Editor" : "Show Terminal / Editor"}
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
                                {showBottomPanel ? "Hide Terminal / Editor" : "Show Editor"}
                            </TooltipContent>
                        </Tooltip>
                    </div>
                </div>
            </main>
        </div>
    )
}