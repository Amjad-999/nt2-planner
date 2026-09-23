import { useEffect, useRef, useState } from 'react'
import { loadRecording } from '@/features/observatory/recordings'
import { Button } from './ui'
import { IPlay, IStop } from './icons'

/* Plays a saved learner recording from this device. If the audio is not on
   this device (another device, cleared storage), it says so. */

export function RecordingPlayer({ id, label = 'استمع' }: { id: string; label?: string }) {
  const [state, setState] = useState<'idle' | 'playing' | 'missing'>('idle')
  const audio = useRef<HTMLAudioElement | null>(null)
  const url = useRef('')
  useEffect(() => () => {
    audio.current?.pause()
    if (url.current) URL.revokeObjectURL(url.current)
  }, [])

  const toggle = async () => {
    if (state === 'playing') { audio.current?.pause(); setState('idle'); return }
    const blob = await loadRecording(id)
    if (!blob) { setState('missing'); return }
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = URL.createObjectURL(blob)
    const a = new Audio(url.current)
    audio.current = a
    a.onended = () => setState('idle')
    setState('playing')
    a.play().catch(() => setState('idle'))
  }

  if (state === 'missing') return <span className="o-small">التسجيل ليس على هذا الجهاز.</span>
  return (
    <Button size="sm" variant="secondary" icon={state === 'playing' ? IStop : IPlay} onClick={toggle} aria-pressed={state === 'playing'}>
      {state === 'playing' ? 'أوقف' : label}
    </Button>
  )
}
