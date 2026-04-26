import { useEffect, useRef, useCallback } from "react"
import { Terminal } from "@xterm/xterm"
import { FitAddon } from "@xterm/addon-fit"
import { WebLinksAddon } from "@xterm/addon-web-links"
import { Sandbox } from "e2b"
import "@xterm/xterm/css/xterm.css"

export function TerminalPane({ isActive }: { isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<Terminal | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const sandboxRef = useRef<any>(null)
  const terminalRef = useRef<any>(null)
  const initializedRef = useRef(false)

  const initTerminal = useCallback(async () => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true

    const term = new Terminal({
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
    const webLinksAddon = new WebLinksAddon()

    term.loadAddon(fitAddon)
    term.loadAddon(webLinksAddon)
    term.open(containerRef.current)

    termRef.current = term
    fitAddonRef.current = fitAddon

    setTimeout(() => {
      try { fitAddon.fit() } catch { }
    }, 50)

    term.writeln("\x1b[1;36m  Connecting to E2B Sandbox...\x1b[0m")

    try {
      const apiKey = import.meta.env.VITE_E2B_KEY
      if (!apiKey) {
        throw new Error("E2B API key not found. Please ensure VITE_E2B_KEY is set in your .env file.")
      }

      const sandbox = await Sandbox.create({
        apiKey,
      })
      sandboxRef.current = sandbox

      const pty = await sandbox.pty.create({
        cols: term.cols,
        rows: term.rows,
        onData: (data: Uint8Array) => term.write(data),
      })
      terminalRef.current = pty

      const encoder = new TextEncoder()
      term.onData((data: string) => {
        sandbox.pty.sendInput(pty.pid, encoder.encode(data))
      })

      term.onResize(({ cols, rows }: { cols: number, rows: number }) => {
        sandbox.pty.resize(pty.pid, { cols, rows })
      })

      term.writeln("\x1b[1;32m  Connected!\x1b[0m")
    } catch (error: any) {
      term.writeln(`\x1b[1;31m  Connection failed: ${error.message}\x1b[0m`)
      console.error("E2B Connection Error:", error)
    }
  }, [])

  useEffect(() => {
    initTerminal()

    const handleBeforeUnload = () => {
      if (sandboxRef.current) {
        // Use a synchronous-ish attempt or just fire and forget
        // for beforeunload, we can't await
        sandboxRef.current.kill()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload)
      if (sandboxRef.current) {
        sandboxRef.current.kill()
      }
    }
  }, [initTerminal])

  // Fit on resize
  useEffect(() => {
    if (!isActive || !fitAddonRef.current) return
    const timeout = setTimeout(() => {
      try { fitAddonRef.current?.fit() } catch { }
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
    <div className="h-full w-full overflow-hidden" style={{ background: "#0f1117" }}>
      <div ref={containerRef} className="h-full w-full p-2" />
    </div>
  )
}
