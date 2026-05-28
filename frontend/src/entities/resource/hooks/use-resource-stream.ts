import { useState, useEffect, useRef, useCallback } from 'react'
import { getAccessToken } from '@shared/api'
import type { Resource } from '../model/resource'

interface UseResourceStreamOptions {
  sandboxId: string | null
  wsUrl: string
}

interface UseResourceStreamReturn {
  resources: Resource[]
  isLoading: boolean
  error: string | null
  connect: () => void
  disconnect: () => void
}

export function useResourceStream({
  sandboxId,
  wsUrl,
}: UseResourceStreamOptions): UseResourceStreamReturn {
  const [resources, setResources] = useState<Resource[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reconnectAttemptsRef = useRef(0)

  const connect = useCallback(() => {
    if (!sandboxId || !wsUrl) {
      return
    }

    // Don't reconnect if already connected
    if (wsRef.current?.readyState === WebSocket.OPEN || wsRef.current?.readyState === WebSocket.CONNECTING) {
      return
    }

    setIsLoading(true)
    setError(null)

    const token = getAccessToken()
    if (!token) {
      console.error('[ResourceStream] No access token available')
      setError('Authentication required')
      setIsLoading(false)
      return
    }

    const wsProtocol = wsUrl.startsWith('wss') ? 'wss' : 'ws'
    const wsUrlWithPath = `${wsProtocol}://${window.location.host}/ws/resources/${sandboxId}`

    // Append auth token to URL
    const sep = wsUrlWithPath.includes('?') ? '&' : '?'
    const wsUrlWithAuth = `${wsUrlWithPath}${sep}token=${encodeURIComponent(token)}`

    console.log('[ResourceStream] Connecting to:', wsUrlWithPath)

    try {
      const ws = new WebSocket(wsUrlWithAuth)

      ws.onopen = () => {
        console.log('[ResourceStream] Connected successfully')
        setIsLoading(false)
        setError(null)
        reconnectAttemptsRef.current = 0
      }

      ws.onmessage = (event) => {
        try {
          const resource: Resource = JSON.parse(event.data)
          setResources((prev) => {
            const index = prev.findIndex(
              (r) => r.kind === resource.kind && r.name === resource.name
            )

            if (resource.eventType === 'Deleted') {
              return prev.filter((r) => !(r.kind === resource.kind && r.name === resource.name))
            }

            if (index >= 0) {
              const updated = [...prev]
              updated[index] = { ...resource }
              return updated
            }
            return [...prev, resource]
          })
        } catch (err) {
          console.error('[ResourceStream] Failed to parse resource message:', err)
        }
      }

      ws.onerror = () => {
        console.error('[ResourceStream] WebSocket error occurred')
        setIsLoading(false)
      }

      ws.onclose = (event) => {
        console.log('[ResourceStream] WebSocket closed:', event.code, event.reason)
        wsRef.current = null

        if (event.code === 1008) {
          setError('Unauthorized - please refresh the page')
        } else if (event.code !== 1000 && reconnectAttemptsRef.current < 5) {
          // Auto-reconnect for non-normal closures
          const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 10000)
          reconnectAttemptsRef.current++
          console.log(`[ResourceStream] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`)
          reconnectTimeoutRef.current = setTimeout(() => connect(), delay)
        } else if (reconnectAttemptsRef.current >= 5) {
          setError('Connection lost - please refresh the page')
        }
      }

      wsRef.current = ws
    } catch (err) {
      console.error('[ResourceStream] Failed to create WebSocket:', err)
      setError('Failed to connect')
      setIsLoading(false)
    }
  }, [sandboxId, wsUrl])

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current)
      reconnectTimeoutRef.current = null
    }
    if (wsRef.current) {
      wsRef.current.close(1000)
      wsRef.current = null
    }
    setResources([])
    reconnectAttemptsRef.current = 0
  }, [])

  useEffect(() => {
    connect()

    return () => {
      disconnect()
    }
  }, [connect, disconnect])

  return {
    resources,
    isLoading,
    error,
    connect,
    disconnect,
  }
}