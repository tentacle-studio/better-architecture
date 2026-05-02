import { useEffect } from 'react'
import type { Terminal } from '@xterm/xterm'
import { WsClient } from '@shared/api'
import type { WsStatus } from '@shared/api'
import { useSandboxStore } from '../model/sandbox-store'
import type { ConnectionStatus } from '../model/sandbox-store'

const WS_BASE =
  (import.meta.env.VITE_WS_URL as string | undefined) ?? 'ws://localhost:3000'

function toConnectionStatus(s: WsStatus): ConnectionStatus {
  if (s === 'connected') return 'connected'
  if (s === 'reconnecting') return 'reconnecting'
  if (s === 'closed') return 'disconnected'
  if (s === 'connecting') return 'connecting'
  return 'idle'
}

export function useSandboxTerminal(
  sandboxId: string | null,
  term: Terminal | null,
): void {
  const setTerminalStatus = useSandboxStore((s) => s.setTerminalStatus)

  useEffect(() => {
    if (!sandboxId || !term) return

    const ws = new WsClient({
      url: `${WS_BASE}/ws/terminal/${sandboxId}`,
      heartbeatIntervalMs: 30_000,
      reconnectDelayMs: 1_000,
      maxReconnectAttempts: 10,
      onStatusChange: (status) => setTerminalStatus(toConnectionStatus(status)),
    })

    term.writeln('\x1b[1;36m  Connecting to sandbox terminal…\x1b[0m')
    ws.connect()

    const unsub = ws.subscribe((ev) => {
      if (ev.data instanceof ArrayBuffer) {
        term.write(new Uint8Array(ev.data))
      } else if (typeof ev.data === 'string') {
        term.write(ev.data)
      }
    })

    const onData = term.onData((data: string) => {
      ws.send(new TextEncoder().encode(data).buffer as ArrayBuffer)
    })

    const onResize = term.onResize(({ cols, rows }: { cols: number; rows: number }) => {
      ws.send(JSON.stringify({ type: 'resize', cols, rows }))
    })

    ws.send(JSON.stringify({ type: 'resize', cols: term.cols, rows: term.rows }))

    return () => {
      unsub()
      onData.dispose()
      onResize.dispose()
      ws.close()
    }
  }, [sandboxId, term, setTerminalStatus])
}
