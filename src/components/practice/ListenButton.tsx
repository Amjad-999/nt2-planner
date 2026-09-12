import { useEffect, useRef, useState } from 'react'
import { speakDutch, stopSpeak } from '@/features/tts/speakDutch'

interface Props {
  /** The Dutch text to read aloud. */
  text: string
  /** Visible label; with `compact` it becomes the accessible name only. */
  label?: string
  /** Icon-only button, for lines where the text is already on screen. */
  compact?: boolean
}

/**
 * Play / stop for one Dutch line, with an honest failure state: TTS needs a
 * network or an installed Dutch voice, and a silent button teaches nothing.
 */
export function ListenButton({ text, label = 'استمع', compact }: Props) {
  const [state, setState] = useState<'idle' | 'playing' | 'error'>('idle')
  const request = useRef(0)
  const playing = useRef(false)

  // Leaving the screen mid-sentence must not leave audio running behind it.
  useEffect(() => () => {
    request.current += 1
    if (playing.current) stopSpeak()
  }, [])

  const toggle = async () => {
    if (state === 'playing') {
      request.current += 1
      playing.current = false
      stopSpeak()
      setState('idle')
      return
    }
    const id = ++request.current
    playing.current = true
    setState('playing')
    let failed = false
    await speakDutch(text, undefined, { onError: () => { failed = true } })
    if (request.current !== id) return
    playing.current = false
    setState(failed ? 'error' : 'idle')
  }

  return (
    <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--sp-1)' }}>
      <button
        type="button"
        className="btn btn--ghost"
        onClick={toggle}
        aria-label={compact ? `${state === 'playing' ? 'إيقاف' : label}: ${text}` : undefined}
        style={compact ? { minWidth: 44, minHeight: 44, padding: 'var(--sp-1)' } : undefined}
      >
        <span aria-hidden="true">{state === 'playing' ? '⏹' : '🔊'}</span>
        {!compact && (state === 'playing' ? 'إيقاف' : label)}
      </button>
      {state === 'error' && (
        <span role="alert" style={{ color: 'var(--red-text)', fontSize: 'var(--text-xs)' }}>
          <span aria-hidden="true">⚠ </span>تعذّر تشغيل الصوت. تحقّق من الاتصال ثم أعد المحاولة.
        </span>
      )}
    </span>
  )
}
