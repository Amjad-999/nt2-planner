import { useState, useCallback, useRef } from 'react'
import { speakDutch, stopSpeak } from './speakDutch'

export function useSpeech() {
  const [speaking, setSpeaking] = useState(false)
  const btnRef = useRef<HTMLButtonElement | null>(null)

  const speak = useCallback((text: string, btn?: HTMLButtonElement | null) => {
    if (btn) btnRef.current = btn
    setSpeaking(true)
    speakDutch(text, btn).finally(() => setSpeaking(false))
  }, [])

  const stop = useCallback(() => {
    stopSpeak()
    setSpeaking(false)
  }, [])

  return { speaking, speak, stop }
}
