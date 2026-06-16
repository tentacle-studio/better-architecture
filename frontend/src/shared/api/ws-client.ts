export type WsStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed'
export type MessageHandler = (event: MessageEvent) => void

export interface WsClientOptions {
  url: string
  heartbeatIntervalMs?: number
  reconnectDelayMs?: number
  maxReconnectAttempts?: number
  onStatusChange?: (status: WsStatus) => void
}

function getAuthToken(): string | null {
  return localStorage.getItem('access_token')
}

function appendToken(url: string): string {
  const token = getAuthToken()
  if (!token) return url
  const sep = url.includes('?') ? '&' : '?'
  return `${url}${sep}token=${encodeURIComponent(token)}`
}

export class WsClient {
  private readonly options: WsClientOptions
  private ws: WebSocket | null = null
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null
  private reconnectAttempts = 0
  private closed = false
  private readonly handlers = new Set<MessageHandler>()
  private status: WsStatus = 'idle'

  constructor(options: WsClientOptions) {
    this.options = options
  }

  connect(): void {
    if (this.closed) return
    this.setStatus('connecting')
    const urlWithToken = appendToken(this.options.url)
    this.ws = new WebSocket(urlWithToken)
    this.ws.binaryType = 'arraybuffer'

    this.ws.onopen = () => {
      this.reconnectAttempts = 0
      this.setStatus('connected')
      this.startHeartbeat()
    }

    this.ws.onmessage = (ev) => {
      if (ev.data === 'pong') return
      this.handlers.forEach((h) => h(ev))
    }

    this.ws.onclose = () => {
      this.stopHeartbeat()
      if (!this.closed) this.scheduleReconnect()
    }

    this.ws.onerror = () => {
      this.ws?.close()
    }
  }

  send(data: string | ArrayBuffer): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(data)
  }

  subscribe(handler: MessageHandler): () => void {
    this.handlers.add(handler)
    return () => this.handlers.delete(handler)
  }

  close(): void {
    this.closed = true
    this.stopHeartbeat()
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.ws?.close()
    this.setStatus('closed')
  }

  getStatus(): WsStatus {
    return this.status
  }

  private setStatus(s: WsStatus): void {
    this.status = s
    this.options.onStatusChange?.(s)
  }

  private startHeartbeat(): void {
    const interval = this.options.heartbeatIntervalMs ?? 30_000
    this.heartbeatTimer = setInterval(() => this.send('ping'), interval)
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
  }

  private scheduleReconnect(): void {
    const max = this.options.maxReconnectAttempts ?? 10
    if (this.reconnectAttempts >= max) {
      this.setStatus('closed')
      return
    }
    this.setStatus('reconnecting')
    const delay = Math.min(
      (this.options.reconnectDelayMs ?? 1_000) * 2 ** this.reconnectAttempts,
      30_000,
    )
    this.reconnectAttempts++
    this.reconnectTimer = setTimeout(() => this.connect(), delay)
  }
}
