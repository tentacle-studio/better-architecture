import { useEffect, useRef } from 'react'
import { WsClient } from '@shared/api'
import type { WsStatus } from '@shared/api'
import { useAuthStore } from '@features/auth'
import { useSandboxStore } from '../model/sandbox-store'
import type { ConnectionStatus } from '../model/sandbox-store'

export interface CanvasTrafficEvent {
  src: string
  dst: string
  protocol: string
  latency_ms: number
  bytes?: number
}

export interface CanvasResourceEventData {
  kind: string
  name: string
  status: string
  connections?: Array<{ from: string; to: string; port: number }>
}

export type CanvasMessage =
  | { type: 'traffic'; events: CanvasTrafficEvent[] }
  | { type: 'resource_event'; data: CanvasResourceEventData }
  | { type: 'batch'; events: Array<{ type: 'resource_event'; data: CanvasResourceEventData }> }

const WS_BASE =
  (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3000'

function toConnectionStatus(s: WsStatus): ConnectionStatus {
  if (s === 'connected') return 'connected'
  if (s === 'reconnecting') return 'reconnecting'
  if (s === 'closed') return 'disconnected'
  if (s === 'connecting') return 'connecting'
  return 'idle'
}

export function useCanvasSync(
  sandboxId: string | null,
  onMessage: (msg: CanvasMessage) => void,
): void {
  const onMessageRef = useRef(onMessage)
  onMessageRef.current = onMessage

  const setCanvasStatus = useSandboxStore((s) => s.setCanvasStatus)
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    if (!sandboxId || !accessToken) return

    const ws = new WsClient({
      url: `${WS_BASE}/ws/canvas/${sandboxId}`,
      heartbeatIntervalMs: 30_000,
      reconnectDelayMs: 1_000,
      maxReconnectAttempts: 10,
      onStatusChange: (status) => setCanvasStatus(toConnectionStatus(status)),
    })
    ws.connect()

    const unsub = ws.subscribe((ev) => {
      if (typeof ev.data !== 'string') return
      try {
        const msg = JSON.parse(ev.data) as CanvasMessage
        onMessageRef.current(msg)
      } catch {
        // ignore malformed frames
      }
    })

    return () => {
      unsub()
      ws.close()
    }
  }, [sandboxId, setCanvasStatus, accessToken])
}
