import { useEffect, useRef, useState } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import "@xterm/xterm/css/xterm.css"
import { useSandboxTerminal } from "@features/sandbox"

export function TerminalPane({
  sandboxId,
  isActive,
}: {
  sandboxId?: string
  isActive: boolean
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [term, setTerm] = useState<Terminal | null>(null)

  // Initialize terminal once — deferred until pane is first active so dimensions are valid
  useEffect(() => {
    if (!isActive || !containerRef.current || termRef.current) return

    const t = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: '"Geist Mono", "Fira Code", "Cascadia Code", monospace',
      theme: {
        background: "#0f1117",
        foreground: "#e2e8f0",
        cursor: "#38bdf8",
        cursorAccent: "#0f1117",
        selectionBackground: "#38bdf840",
        black: "#1e293b",
        brightBlack: "#475569",
        red: "#f87171",
        brightRed: "#fca5a5",
        green: "#4ade80",
        brightGreen: "#86efac",
        yellow: "#facc15",
        brightYellow: "#fde68a",
        blue: "#60a5fa",
        brightBlue: "#93c5fd",
        magenta: "#c084fc",
        brightMagenta: "#d8b4fe",
        cyan: "#22d3ee",
        brightCyan: "#67e8f9",
        white: "#e2e8f0",
        brightWhite: "#f8fafc",
      },
      allowTransparency: true,
      scrollback: 1000,
      tabStopWidth: 2,
    })

    const fitAddon = new FitAddon()
    t.loadAddon(fitAddon)
    t.loadAddon(new WebLinksAddon())
    t.open(containerRef.current)
    fitAddonRef.current = fitAddon
    termRef.current = t
    setTimeout(() => {
      try { fitAddon.fit(); t.focus() } catch { }
    }, 50)
    setTerm(t)

  }, [isActive])

  // Dispose terminal only on component unmount
  useEffect(() => {
    return () => {
      termRef.current?.dispose()
      termRef.current = null
    }
  }, [])

  useSandboxTerminal(sandboxId ?? null, term)

  useEffect(() => {
    if (!isActive || !fitAddonRef.current) return
    const timeout = setTimeout(() => {
      try { fitAddonRef.current?.fit(); termRef.current?.focus() } catch { }
    }, 100)
    return () => clearTimeout(timeout)
  }, [isActive])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      try { fitAddonRef.current?.fit() } catch { }
    })
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{ background: "#0f1117" }}
      onClick={() => termRef.current?.focus()}
    >
      <div ref={containerRef} className="h-full w-full p-2" />
    </div>
  )
}
