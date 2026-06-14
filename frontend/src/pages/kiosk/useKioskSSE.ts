import { useState, useEffect, useRef, useCallback } from 'react'
import { nfcApi } from '@/api/nfc'

type SseStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'

/**
 * Hook managing the SSE connection to the NFC reader.
 * Auto-reconnects on disconnect with a 5-second delay.
 */
export function useKioskSSE(
  enabled: boolean,
  onEvent: (event: { type: string; data: unknown }) => void,
) {
  const [sseStatus, setSseStatus] = useState<SseStatus>('DISCONNECTED')
  const sseRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const disconnect = useCallback(() => {
    if (sseRef.current) {
      sseRef.current.close()
      sseRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!enabled) {
      disconnect()
      return
    }

    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null
    let disposed = false

    const connectSSE = () => {
      disconnect()
      setSseStatus('CONNECTING')
      const source = new EventSource(nfcApi.getStreamUrl())
      sseRef.current = source

      source.onopen = () => setSseStatus('CONNECTED')

      source.addEventListener('nfc-scan', (event: MessageEvent) => {
        try {
          onEventRef.current(JSON.parse(event.data))
        } catch (error) {
          console.error('NFC event parse error:', error)
        }
      })

      source.onerror = () => {
        setSseStatus('DISCONNECTED')
        source.close()
        if (!disposed) {
          reconnectTimeout = setTimeout(connectSSE, 5000)
        }
      }
    }

    connectSSE()

    return () => {
      disposed = true
      if (reconnectTimeout) clearTimeout(reconnectTimeout)
      disconnect()
    }
  }, [enabled, disconnect])

  return { sseStatus }
}
