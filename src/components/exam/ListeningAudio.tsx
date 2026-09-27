import { useEffect, useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { speakDutch, stopSpeak } from '@/features/tts/speakDutch'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { Segmented } from '@/components/ui/Segmented'

const NORMAL = 1
const SLOW = 0.8

interface Props {
  text: string
  /** The written transcript opens only once every question is answered. */
  unlocked: boolean
}

/**
 * The listening task's audio: play/stop, a slower speed, and a transcript
 * that stays closed until the questions are answered — reading along first
 * would turn a listening exercise into a reading one.
 *
 * Speed is the app's real TTS preference (prefs.rate, also in Settings), so
 * a learner who needs it slower gets it slower everywhere, not just here.
 */
export function ListeningAudio({ text, unlocked }: Props) {
  const rate = useAppStore((s) => s.prefs.rate)
  const saveSettings = useAppStore((s) => s.saveSettings)
  const [state, setState] = useState<'idle' | 'playing' | 'error'>('idle')
  const [plays, setPlays] = useState(0)
  const request = useRef(0)
  const playing = useRef(false)

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
    setPlays((n) => n + 1)
    let failed = false
    await speakDutch(text, undefined, { onError: () => { failed = true } })
    if (request.current !== id) return
    playing.current = false
    setState(failed ? 'error' : 'idle')
  }

  const speed = (rate ?? NORMAL) < 0.9 ? 'slow' : 'normal'

  return (
    <section aria-label="التسجيل الصوتي" className="card" style={{ marginBottom: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', gap: 'var(--sp-3)' }}>
        <Button variant="primary" size="lg" icon={state === 'playing' ? '⏹' : '▶'} onClick={toggle}>
          {state === 'playing' ? 'إيقاف' : plays > 0 ? 'استمع مرّة أخرى' : 'استمع إلى التسجيل'}
        </Button>
        <div style={{ flex: '1 1 200px' }}>
          <Segmented
            label="سرعة الصوت"
            value={speed}
            onChange={(v) => saveSettings({ prefs: { rate: v === 'slow' ? SLOW : NORMAL } })}
            options={[{ id: 'normal', label: 'سرعة عادية' }, { id: 'slow', label: 'أبطأ' }]}
          />
        </div>
      </div>
      {state === 'error' && (
        <Callout tone="warn" role="alert" density="compact" style={{ marginTop: 'var(--sp-3)' }}>
          تعذّر تشغيل الصوت. تحقّق من الاتصال أو من وجود صوت هولندي على جهازك، ثم أعد المحاولة.
        </Callout>
      )}
      {unlocked ? (
        <details style={{ marginTop: 'var(--sp-3)' }}>
          <summary style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center', color: 'var(--text)', fontWeight: 'var(--fw-heading)' }}>النصّ المكتوب للتسجيل</summary>
          <div className="reading-text" dir="ltr" lang="nl" style={{ whiteSpace: 'pre-wrap', textAlign: 'start', marginTop: 'var(--sp-2)' }}>{text}</div>
        </details>
      ) : (
        <p style={{ margin: 'var(--sp-3) 0 0', color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>
          <span aria-hidden="true">🔒 </span>النصّ المكتوب يُفتح بعد أن تجيب عن كل الأسئلة.
        </p>
      )}
    </section>
  )
}
