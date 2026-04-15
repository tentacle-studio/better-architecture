"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useCanvasStore, generateElementId, type ElementType } from "@/lib/canvas-store"
import { cn } from "@/lib/utils"

export function CanvasArea() {
  const canvasRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawStart, setDrawStart] = useState({ x: 0, y: 0 })
  const [drawCurrent, setDrawCurrent] = useState({ x: 0, y: 0 })

  const {
    elements,
    selectedIds,
    activeTool,
    zoom,
    panOffset,
    isPanning,
    selectElement,
    clearSelection,
    moveElement,
    setPanOffset,
    setIsPanning,
    addElement,
    setActiveTool,
  } = useCanvasStore()

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return

      switch (e.key.toLowerCase()) {
        case "v":
          setActiveTool("select")
          break
        case "h":
          setActiveTool("hand")
          break
        case "r":
          setActiveTool("rectangle")
          break
        case "o":
          setActiveTool("ellipse")
          break
        case "t":
          setActiveTool("text")
          break
        case "l":
          setActiveTool("line")
          break
        case "a":
          setActiveTool("arrow")
          break
        case "escape":
          clearSelection()
          setActiveTool("select")
          break
        case "delete":
        case "backspace":
          selectedIds.forEach((id) => {
            useCanvasStore.getState().deleteElement(id)
          })
          break
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [selectedIds, setActiveTool, clearSelection])

  // Wheel zoom - zoom toward mouse position
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault()
      
      const rect = canvas.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top
      
      const store = useCanvasStore.getState()
      const currentZoom = store.zoom
      const currentPan = store.panOffset
      
      // Calculate zoom factor - slower zoom speed
      const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05
      const newZoom = Math.min(Math.max(currentZoom * zoomFactor, 0.1), 5)
      
      // Calculate the point under the mouse in canvas coordinates before zoom
      const canvasX = (mouseX - currentPan.x) / currentZoom
      const canvasY = (mouseY - currentPan.y) / currentZoom
      
      // After zoom, we want the same canvas point to be under the mouse
      // newMouseX = canvasX * newZoom + newPanX => newPanX = mouseX - canvasX * newZoom
      const newPanX = mouseX - canvasX * newZoom
      const newPanY = mouseY - canvasY * newZoom
      
      store.setZoom(newZoom)
      store.setPanOffset({ x: newPanX, y: newPanY })
    }

    canvas.addEventListener("wheel", handleWheel, { passive: false })
    return () => canvas.removeEventListener("wheel", handleWheel)
  }, [])

  const getCanvasCoords = useCallback(
    (clientX: number, clientY: number) => {
      const canvas = canvasRef.current
      if (!canvas) return { x: 0, y: 0 }

      const rect = canvas.getBoundingClientRect()
      return {
        x: (clientX - rect.left - panOffset.x) / zoom,
        y: (clientY - rect.top - panOffset.y) / zoom,
      }
    },
    [zoom, panOffset]
  )

  const handleCanvasMouseDown = (e: React.MouseEvent) => {
    if (e.target !== canvasRef.current) return

    const coords = getCanvasCoords(e.clientX, e.clientY)

    if (activeTool === "hand" || e.button === 1) {
      setIsPanning(true)
      setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y })
      return
    }

    if (["rectangle", "ellipse", "text", "line", "arrow"].includes(activeTool)) {
      setIsDrawing(true)
      setDrawStart(coords)
      setDrawCurrent(coords)
      return
    }

    clearSelection()
  }

  const handleCanvasMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setPanOffset({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
      return
    }

    if (isDrawing) {
      const coords = getCanvasCoords(e.clientX, e.clientY)
      setDrawCurrent(coords)
      return
    }

    if (isDragging && selectedIds.length > 0) {
      const coords = getCanvasCoords(e.clientX, e.clientY)
      const dx = coords.x - dragStart.x
      const dy = coords.y - dragStart.y

      selectedIds.forEach((id) => {
        moveElement(id, dx, dy)
      })

      setDragStart(coords)
    }
  }

  const handleCanvasMouseUp = () => {
    if (isDrawing) {
      const width = Math.abs(drawCurrent.x - drawStart.x)
      const height = Math.abs(drawCurrent.y - drawStart.y)
      const x = Math.min(drawStart.x, drawCurrent.x)
      const y = Math.min(drawStart.y, drawCurrent.y)

      if (width > 5 || height > 5) {
        const type = activeTool as ElementType
        const newElement = {
          id: generateElementId(type),
          type,
          x,
          y,
          width: Math.max(width, 50),
          height: Math.max(height, 30),
          rotation: 0,
          fill: type === "text" ? "#ffffff" : "#3b82f6",
          stroke: type === "text" ? "transparent" : "#60a5fa",
          strokeWidth: type === "text" ? 0 : 2,
          text: type === "text" ? "New Text" : undefined,
          fontSize: type === "text" ? 24 : undefined,
          locked: false,
          visible: true,
          name: `${type.charAt(0).toUpperCase() + type.slice(1)} ${elements.length + 1}`,
        }

        addElement(newElement)
        selectElement(newElement.id)
        setActiveTool("select")
      }

      setIsDrawing(false)
      return
    }

    setIsPanning(false)
    setIsDragging(false)
  }

  const handleElementMouseDown = (e: React.MouseEvent, elementId: string) => {
    e.stopPropagation()

    if (activeTool !== "select") return

    const element = elements.find((el) => el.id === elementId)
    if (element?.locked) return

    selectElement(elementId, e.shiftKey)
    setIsDragging(true)
    setDragStart(getCanvasCoords(e.clientX, e.clientY))
  }

  const renderElement = (element: (typeof elements)[0]) => {
    if (!element.visible) return null

    const isSelected = selectedIds.includes(element.id)
    const style: React.CSSProperties = {
      position: "absolute",
      left: element.x,
      top: element.y,
      width: element.width,
      height: element.height,
      transform: `rotate(${element.rotation}deg)`,
      cursor: element.locked ? "not-allowed" : activeTool === "select" ? "move" : "default",
    }

    const selectionStyle = isSelected
      ? {
          outline: "2px solid #3b82f6",
          outlineOffset: "2px",
        }
      : {}

    switch (element.type) {
      case "rectangle":
        return (
          <div
            key={element.id}
            style={{
              ...style,
              ...selectionStyle,
              backgroundColor: element.fill,
              border: `${element.strokeWidth}px solid ${element.stroke}`,
              borderRadius: "4px",
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          />
        )

      case "ellipse":
        return (
          <div
            key={element.id}
            style={{
              ...style,
              ...selectionStyle,
              backgroundColor: element.fill,
              border: `${element.strokeWidth}px solid ${element.stroke}`,
              borderRadius: "50%",
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          />
        )

      case "text":
        return (
          <div
            key={element.id}
            style={{
              ...style,
              ...selectionStyle,
              color: element.fill,
              fontSize: element.fontSize,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              whiteSpace: "nowrap",
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            {element.text}
          </div>
        )

      case "line":
      case "arrow":
        return (
          <svg
            key={element.id}
            style={{
              ...style,
              ...selectionStyle,
              overflow: "visible",
            }}
            onMouseDown={(e) => handleElementMouseDown(e, element.id)}
          >
            <defs>
              {element.type === "arrow" && (
                <marker
                  id={`arrow-${element.id}`}
                  markerWidth="10"
                  markerHeight="10"
                  refX="9"
                  refY="3"
                  orient="auto"
                >
                  <path d="M0,0 L0,6 L9,3 z" fill={element.stroke} />
                </marker>
              )}
            </defs>
            <line
              x1="0"
              y1={element.height / 2}
              x2={element.width}
              y2={element.height / 2}
              stroke={element.stroke}
              strokeWidth={element.strokeWidth}
              markerEnd={element.type === "arrow" ? `url(#arrow-${element.id})` : undefined}
            />
          </svg>
        )

      default:
        return null
    }
  }

  // Draw preview for shapes being drawn
  const renderDrawPreview = () => {
    if (!isDrawing) return null

    const width = Math.abs(drawCurrent.x - drawStart.x)
    const height = Math.abs(drawCurrent.y - drawStart.y)
    const x = Math.min(drawStart.x, drawCurrent.x)
    const y = Math.min(drawStart.y, drawCurrent.y)

    const previewStyle: React.CSSProperties = {
      position: "absolute",
      left: x,
      top: y,
      width,
      height,
      border: "2px dashed #3b82f6",
      backgroundColor: "rgba(59, 130, 246, 0.1)",
      pointerEvents: "none",
    }

    if (activeTool === "ellipse") {
      return <div style={{ ...previewStyle, borderRadius: "50%" }} />
    }

    return <div style={previewStyle} />
  }

  return (
    <div
      ref={canvasRef}
      className={cn(
        "relative h-full w-full overflow-hidden",
        activeTool === "hand" || isPanning ? "cursor-grab active:cursor-grabbing" : "",
        ["rectangle", "ellipse", "text", "line", "arrow"].includes(activeTool) && "cursor-crosshair"
      )}
      style={{
        backgroundColor: "#fafafa",
        backgroundImage: `radial-gradient(circle, #d1d5db 1px, transparent 1px)`,
        backgroundSize: `${24 * zoom}px ${24 * zoom}px`,
        backgroundPosition: `${panOffset.x}px ${panOffset.y}px`,
      }}
      onMouseDown={handleCanvasMouseDown}
      onMouseMove={handleCanvasMouseMove}
      onMouseUp={handleCanvasMouseUp}
      onMouseLeave={handleCanvasMouseUp}
    >
      <div
        style={{
          transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        {elements.map(renderElement)}
        {renderDrawPreview()}
      </div>

      {/* Coordinates display */}
      <div className="absolute bottom-4 left-4 z-10 rounded-md bg-card/90 px-2 py-1 text-xs text-muted-foreground backdrop-blur-sm">
        Pan: {Math.round(panOffset.x)}, {Math.round(panOffset.y)} | Zoom: {Math.round(zoom * 100)}%
      </div>
    </div>
  )
}
