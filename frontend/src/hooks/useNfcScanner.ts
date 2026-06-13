import { useCallback, useEffect, useRef, useState } from 'react'
import { nfcApi, type NfcScanEvent } from '@/api/nfc'

export type NfcScannerStatus = 'IDLE' | 'CONNECTING' | 'WAITING' | 'SCANNED' | 'ERROR'

interface UseNfcScannerOptions {
  onRegisteredTag: (event: NfcScanEvent) => void
  onReadError: () => void
}

export function useNfcScanner({ onRegisteredTag, onReadError }: UseNfcScannerOptions) {
  const eventSourceRef = useRef<EventSource | null>(null)
  const onRegisteredTagRef = useRef(onRegisteredTag)
  const onReadErrorRef = useRef(onReadError)
  const [scannedUid, setScannedUid] = useState('')
  const [status, setStatus] = useState<NfcScannerStatus>('IDLE')

  useEffect(() => {
    onRegisteredTagRef.current = onRegisteredTag
    onReadErrorRef.current = onReadError
  }, [onReadError, onRegisteredTag])

  const closeConnection = useCallback(() => {
    eventSourceRef.current?.close()
    eventSourceRef.current = null
  }, [])

  const stop = useCallback(() => {
    closeConnection()
    setScannedUid('')
    setStatus('IDLE')
  }, [closeConnection])

  const start = useCallback(() => {
    closeConnection()
    setScannedUid('')
    setStatus('CONNECTING')

    const source = new EventSource(nfcApi.getStreamUrl())
    eventSourceRef.current = source
    source.onopen = () => setStatus('WAITING')
    source.addEventListener('nfc-scan', ((event: MessageEvent<string>) => {
      try {
        const scan = JSON.parse(event.data) as NfcScanEvent
        if (scan.type !== 'UNKNOWN' || !scan.data.uid) {
          onRegisteredTagRef.current(scan)
          return
        }

        setScannedUid(scan.data.uid)
        setStatus('SCANNED')
        closeConnection()
      } catch {
        setStatus('ERROR')
        onReadErrorRef.current()
      }
    }) as EventListener)
    source.onerror = () => {
      closeConnection()
      setStatus('ERROR')
    }
  }, [closeConnection])

  useEffect(() => () => closeConnection(), [closeConnection])

  return {
    scannedUid,
    status,
    start,
    stop,
  }
}
