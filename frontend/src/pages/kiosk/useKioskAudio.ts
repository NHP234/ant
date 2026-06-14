import { useRef, useCallback } from 'react'

type AudioContextWindow = Window & {
  webkitAudioContext?: typeof AudioContext
}

/**
 * Hook providing kiosk beep sounds via Web Audio API.
 * success = high-pitched short beep
 * warn    = mid-pitched medium beep
 * error   = low-pitched sawtooth beep
 */
export function useKioskAudio() {
  const ctxRef = useRef<AudioContext | null>(null)

  const getContext = useCallback(() => {
    if (ctxRef.current && ctxRef.current.state !== 'closed') return ctxRef.current
    const AudioContextClass = window.AudioContext || (window as AudioContextWindow).webkitAudioContext
    if (!AudioContextClass) return null
    ctxRef.current = new AudioContextClass()
    return ctxRef.current
  }, [])

  const playBeep = useCallback((type: 'success' | 'warn' | 'error') => {
    try {
      const audioCtx = getContext()
      if (!audioCtx) return

      const oscillator = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()
      oscillator.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      if (type === 'success') {
        oscillator.type = 'sine'
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime)
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.1)
      } else if (type === 'warn') {
        oscillator.type = 'triangle'
        oscillator.frequency.setValueAtTime(440, audioCtx.currentTime)
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.25)
      } else {
        oscillator.type = 'sawtooth'
        oscillator.frequency.setValueAtTime(150, audioCtx.currentTime)
        gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime)
        oscillator.start()
        oscillator.stop(audioCtx.currentTime + 0.3)
      }
    } catch {
      // Web Audio not available — silently ignore
    }
  }, [getContext])

  return { playBeep }
}
