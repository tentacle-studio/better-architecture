"use client"

import { useEffect, useRef, useCallback } from "react"

export function TerminalPane({ isActive }: { isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const termRef = useRef<any>(null)
  const fitAddonRef = useRef<any>(null)
  const initializedRef = useRef(false)

  const initTerminal = useCallback(async () => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true

    const { Terminal } = await import("@xterm/xterm")
    const { FitAddon } = await import("@xterm/addon-fit")
    const { WebLinksAddon } = await import("@xterm/addon-web-links")

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
      try { fitAddon.fit() } catch {}
    }, 50)

    // Welcome banner
    term.writeln("\x1b[1;36m  Training Lab Terminal\x1b[0m  \x1b[2mv1.0.0\x1b[0m")
    term.writeln("\x1b[2m  ─────────────────────────────────────\x1b[0m")
    term.writeln("  Type \x1b[1;33mhelp\x1b[0m for available commands.")
    term.writeln("")
    prompt(term)

    let currentLine = ""

    const commands: Record<string, () => void> = {
      help: () => {
        term.writeln("  \x1b[1mAvailable commands:\x1b[0m")
        term.writeln("  \x1b[33mhelp\x1b[0m       Show this help message")
        term.writeln("  \x1b[33mclear\x1b[0m      Clear the terminal")
        term.writeln("  \x1b[33mls\x1b[0m         List course files")
        term.writeln("  \x1b[33mpwd\x1b[0m        Print working directory")
        term.writeln("  \x1b[33mdate\x1b[0m       Show current date and time")
        term.writeln("  \x1b[33mecho\x1b[0m       Echo text")
        term.writeln("  \x1b[33mversion\x1b[0m    Show platform version")
      },
      clear: () => {
        term.clear()
        return
      },
      ls: () => {
        term.writeln("  \x1b[34mcourses/\x1b[0m")
        term.writeln("    \x1b[34massets/\x1b[0m")
        term.writeln("    \x1b[36mintroduction.md\x1b[0m")
        term.writeln("    \x1b[36mmodule-01.json\x1b[0m")
        term.writeln("    \x1b[36mmodule-02.json\x1b[0m")
        term.writeln("    \x1b[36mquiz.json\x1b[0m")
      },
      pwd: () => {
        term.writeln("  /workspace/training-lab/courses")
      },
      date: () => {
        term.writeln("  " + new Date().toLocaleString())
      },
      version: () => {
        term.writeln("  Training Lab v1.0.0")
        term.writeln("  Node.js v20.11.0")
        term.writeln("  Platform: linux/x64")
      },
    }

    term.onKey(({ key, domEvent }) => {
      const code = domEvent.keyCode

      if (code === 13) {
        // Enter
        term.writeln("")
        const trimmed = currentLine.trim()
        currentLine = ""

        if (trimmed === "") {
          prompt(term)
          return
        }

        const [cmd, ...args] = trimmed.split(" ")

        if (cmd === "echo") {
          term.writeln("  " + args.join(" "))
        } else if (commands[cmd]) {
          commands[cmd]()
        } else {
          term.writeln(`  \x1b[31mcommand not found:\x1b[0m ${cmd}`)
        }

        if (cmd !== "clear") prompt(term)
      } else if (code === 8) {
        // Backspace
        if (currentLine.length > 0) {
          currentLine = currentLine.slice(0, -1)
          term.write("\b \b")
        }
      } else if (code >= 32) {
        currentLine += key
        term.write(key)
      }
    })
  }, [])

  useEffect(() => {
    initTerminal()
  }, [initTerminal])

  // Fit on resize
  useEffect(() => {
    if (!isActive || !fitAddonRef.current) return
    const timeout = setTimeout(() => {
      try { fitAddonRef.current?.fit() } catch {}
    }, 100)
    return () => clearTimeout(timeout)
  }, [isActive])

  useEffect(() => {
    const observer = new ResizeObserver(() => {
      try { fitAddonRef.current?.fit() } catch {}
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

function prompt(term: any) {
  term.write("\x1b[1;32m❯\x1b[0m \x1b[1;34m~/lab\x1b[0m \x1b[0m$ ")
}
