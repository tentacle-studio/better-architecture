"use client"

import { useEffect, useRef, useCallback, useState } from "react"
import { FileCode, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const DEFAULT_FILES: Record<string, { language: string; value: string }> = {
  "module-01.json": {
    language: "json",
    value: JSON.stringify(
      {
        id: "module-01",
        title: "Introduction to Training Lab",
        description: "Learn the basics of creating engaging training content.",
        duration: "15 min",
        sections: [
          { id: "s1", title: "Getting Started", type: "lesson", completed: false },
          { id: "s2", title: "Core Concepts", type: "lesson", completed: false },
          { id: "s3", title: "Quiz", type: "quiz", questions: 5, completed: false },
        ],
      },
      null,
      2
    ),
  },
  "introduction.md": {
    language: "markdown",
    value: `# Introduction to Training Lab

Welcome to **Training Lab** — a powerful canvas-based platform for building interactive training courses.

## Features

- Drag-and-drop canvas editor
- Built-in terminal for running scripts
- Monaco-powered code editor
- Real-time collaboration

## Getting Started

1. Open a course from the sidebar
2. Drag elements onto the canvas
3. Configure properties on the left panel
4. Preview your course with the \`Preview\` button

## Keyboard Shortcuts

| Shortcut | Action         |
|----------|----------------|
| V        | Select tool    |
| H        | Hand/Pan tool  |
| R        | Rectangle      |
| O        | Ellipse        |
| T        | Text           |
| Ctrl+Z   | Undo           |
`,
  },
  "quiz.json": {
    language: "json",
    value: JSON.stringify(
      {
        id: "quiz-01",
        title: "Module 1 Assessment",
        passingScore: 80,
        questions: [
          {
            id: "q1",
            type: "multiple-choice",
            question: "What is Training Lab used for?",
            options: ["Video editing", "Creating training courses", "Database management", "Networking"],
            correct: 1,
          },
          {
            id: "q2",
            type: "true-false",
            question: "Training Lab supports real-time collaboration.",
            correct: true,
          },
        ],
      },
      null,
      2
    ),
  },
}

const LANGUAGE_COLORS: Record<string, string> = {
  json: "text-yellow-400",
  markdown: "text-blue-400",
  javascript: "text-green-400",
  typescript: "text-sky-400",
}

export function MonacoPane({ isActive }: { isActive: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<any>(null)
  const [activeFile, setActiveFile] = useState("module-01.json")
  const [fileContents, setFileContents] = useState<Record<string, string>>(
    Object.fromEntries(Object.entries(DEFAULT_FILES).map(([k, v]) => [k, v.value]))
  )
  const [showFilePicker, setShowFilePicker] = useState(false)
  const initializedRef = useRef(false)

  const initEditor = useCallback(async () => {
    if (!containerRef.current || initializedRef.current) return
    initializedRef.current = true

    const monaco = await import("monaco-editor")

    monaco.editor.defineTheme("training-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "comment", foreground: "64748b", fontStyle: "italic" },
        { token: "keyword", foreground: "38bdf8" },
        { token: "string", foreground: "86efac" },
        { token: "number", foreground: "fb923c" },
        { token: "type", foreground: "c084fc" },
      ],
      colors: {
        "editor.background": "#0f1117",
        "editor.foreground": "#e2e8f0",
        "editorLineNumber.foreground": "#334155",
        "editorLineNumber.activeForeground": "#64748b",
        "editor.selectionBackground": "#38bdf820",
        "editor.lineHighlightBackground": "#1e293b50",
        "editorCursor.foreground": "#38bdf8",
        "editor.inactiveSelectionBackground": "#38bdf810",
        "editorIndentGuide.background1": "#1e293b",
        "editorIndentGuide.activeBackground1": "#334155",
        "scrollbarSlider.background": "#33415540",
        "scrollbarSlider.hoverBackground": "#47556940",
        "scrollbarSlider.activeBackground": "#47556960",
      },
    })

    const file = DEFAULT_FILES[activeFile]
    const editor = monaco.editor.create(containerRef.current, {
      value: fileContents[activeFile] ?? file.value,
      language: file.language,
      theme: "training-dark",
      fontSize: 13,
      fontFamily: '"Geist Mono", "Fira Code", "Cascadia Code", monospace',
      fontLigatures: true,
      lineNumbers: "on",
      minimap: { enabled: true, scale: 1 },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      tabSize: 2,
      wordWrap: "on",
      renderLineHighlight: "all",
      smoothScrolling: true,
      cursorSmoothCaretAnimation: "on",
      cursorBlinking: "smooth",
      bracketPairColorization: { enabled: true },
      padding: { top: 12, bottom: 12 },
      overviewRulerBorder: false,
      scrollbar: {
        verticalScrollbarSize: 6,
        horizontalScrollbarSize: 6,
      },
    })

    editor.onDidChangeModelContent(() => {
      const val = editor.getValue()
      setFileContents((prev) => ({ ...prev, [activeFile]: val }))
    })

    editorRef.current = editor
  }, [activeFile, fileContents])

  useEffect(() => {
    initEditor()
    return () => {
      editorRef.current?.dispose()
      editorRef.current = null
      initializedRef.current = false
    }
  }, [])

  // Switch file
  const switchFile = useCallback(
    async (filename: string) => {
      if (!editorRef.current) return
      const monaco = await import("monaco-editor")
      const file = DEFAULT_FILES[filename]
      const content = fileContents[filename] ?? file.value

      const model = monaco.editor.createModel(content, file.language)
      editorRef.current.setModel(model)
      setActiveFile(filename)
      setShowFilePicker(false)
    },
    [fileContents]
  )

  useEffect(() => {
    if (!isActive || !editorRef.current) return
    const timeout = setTimeout(() => editorRef.current?.layout(), 100)
    return () => clearTimeout(timeout)
  }, [isActive])

  useEffect(() => {
    const observer = new ResizeObserver(() => editorRef.current?.layout())
    if (containerRef.current) observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const currentLang = DEFAULT_FILES[activeFile]?.language ?? "text"

  return (
    <div className="flex h-full w-full flex-col" style={{ background: "#0f1117" }}>
      {/* File tabs bar */}
      <div className="flex items-center gap-0 border-b border-white/5 bg-[#0a0d14] px-2">
        {Object.keys(DEFAULT_FILES).map((filename) => (
          <button
            key={filename}
            onClick={() => switchFile(filename)}
            className={cn(
              "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs transition-colors",
              activeFile === filename
                ? "border-sky-400 text-slate-200"
                : "border-transparent text-slate-500 hover:text-slate-300"
            )}
          >
            <FileCode className="h-3 w-3" />
            {filename}
          </button>
        ))}

        <div className="ml-auto flex items-center gap-2 pr-2">
          <span
            className={cn(
              "text-[10px] font-medium uppercase tracking-wider",
              LANGUAGE_COLORS[currentLang] ?? "text-slate-500"
            )}
          >
            {currentLang}
          </span>
        </div>
      </div>

      {/* Editor */}
      <div ref={containerRef} className="min-h-0 flex-1" />
    </div>
  )
}
