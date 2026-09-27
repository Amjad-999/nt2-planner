import { useEffect, useState, type ReactNode } from 'react'
import type { LessonItem, ObsState, SessionRun } from '@/features/observatory/types'
import { playDutch, stopDutch } from '@/features/observatory/speech'
import { Meta, Button, Notice } from '../ui'
import { ISpeakerHigh, IStop } from '../icons'

/* Pieces every lesson step shares: the frame (kicker · instruction ·
   content), debounced drafts that survive leaving the lesson, the reading
   passage with its help highlights, and a speech control with honest states. */

export interface StepProps {
  item: LessonItem
  run: SessionRun
  readOnly: boolean
  onComplete: () => void
  update: (fn: (o: ObsState) => ObsState) => void
}

export function StepFrame({ kicker, title, lede, children, headingRef }: {
  kicker: string; title: string; lede?: ReactNode; children: ReactNode; headingRef?: React.Ref<HTMLHeadingElement>
}) {
  // Moving to the next question/word remounts the frame; keep keyboard focus
  // with the activity instead of letting it fall back to <body>.
  useEffect(() => {
    if (document.activeElement === document.body) {
      document.querySelector<HTMLElement>('.o-step-plane .o-step__title')?.focus({ preventScroll: true })
    }
  }, [kicker])
  return (
    <div className="o-step">
      <Meta>{kicker}</Meta>
      <h2 className="o-h2 o-step__title" tabIndex={-1} ref={headingRef}>{title}</h2>
      {lede && <p className="o-lede o-step__lede">{lede}</p>}
      {children}
    </div>
  )
}

/** Split a paragraph into text and <mark>s for the supporting sentences. */
function marked(p: string, support: string[]): ReactNode[] {
  if (!support.length) return [p]
  const out: ReactNode[] = []
  let rest = p, k = 0
  while (rest) {
    let best = -1, hit = ''
    for (const s of support) {
      const i = rest.indexOf(s)
      if (i >= 0 && (best < 0 || i < best)) { best = i; hit = s }
    }
    if (best < 0) { out.push(rest); break }
    if (best > 0) out.push(rest.slice(0, best))
    out.push(<mark key={k++} className="o-support">{hit}</mark>)
    rest = rest.slice(best + hit.length)
  }
  return out
}

export function Passage({ item, locate = null, support, id }: {
  item: LessonItem; locate?: number | null; support?: { paragraph: number; sentences: string[] } | null; id?: string
}) {
  return (
    <div className="o-passage" lang="nl" dir="ltr" id={id}>
      {item.paragraphs.map((p, i) => (
        <p key={i} data-p={i} className={locate === i ? 'is-located' : undefined}>
          {support && support.paragraph === i ? marked(p, support.sentences) : p}
        </p>
      ))}
    </div>
  )
}

/** Mark words in a prompt that start with one of the keyword stems. */
export function Highlight({ text, keywords, on }: { text: string; keywords: string[]; on: boolean }) {
  if (!on || !keywords.length) return <>{text}</>
  const stems = keywords.map((k) => k.toLowerCase())
  return (
    <>
      {text.split(/(\s+)/).map((w, i) => {
        const bare = w.toLowerCase().replace(/[^a-zà-ÿ'-]/g, '')
        const multi = stems.find((s) => s.includes(' ') && text.toLowerCase().includes(s) && s.split(' ').includes(bare))
        return bare && (multi || stems.some((s) => !s.includes(' ') && bare.startsWith(s.slice(0, Math.max(4, s.length - 2)))))
          ? <mark key={i} className="o-kw-q">{w}</mark>
          : <span key={i}>{w}</span>
      })}
    </>
  )
}

type SpeechUi = 'idle' | 'playing' | 'unavailable'

/** Generated Dutch speech with visible states. Announces "unavailable" honestly. */
export function SpeakButton({ text, label = 'استمع', size = 'sm', onUnavailable }: {
  text: string; label?: string; size?: 'sm' | 'md'; onUnavailable?: () => void
}) {
  const [ui, setUi] = useState<SpeechUi>('idle')
  useEffect(() => () => { stopDutch() }, [])
  const play = async () => {
    if (ui === 'playing') { stopDutch(); setUi('idle'); return }
    setUi('playing')
    window.dispatchEvent(new Event('o-activity'))
    const r = await playDutch(text)
    if (r === 'stopped') return
    window.dispatchEvent(new Event('o-activity'))
    if (r === 'unavailable') { setUi('unavailable'); onUnavailable?.() } else setUi('idle')
  }
  return (
    <span className="o-speak">
      <Button size={size} variant="secondary" icon={ui === 'playing' ? IStop : ISpeakerHigh} onClick={play} aria-pressed={ui === 'playing'}>
        {ui === 'playing' ? 'أوقف الصوت' : label}
      </Button>
      <span className="o-sr" aria-live="polite">{ui === 'playing' ? 'يتم تشغيل الصوت' : ui === 'unavailable' ? 'الصوت غير متاح' : ''}</span>
      {ui === 'unavailable' && (
        <Notice tone="warn" title="الصوت غير متاح الآن.">
          لا اتصال بخدمة النطق ولا صوت هولندي مثبّت على جهازك. النص مكتوب أمامك، ويمكنك المتابعة بالقراءة.
        </Notice>
      )}
    </span>
  )
}
