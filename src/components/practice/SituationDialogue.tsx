import { useEffect, useRef, useState } from 'react'
import type { Situation } from '@/data/situations'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { SpeakAndCheck } from '@/components/SpeakAndCheck'
import { ChoiceList } from './ChoiceList'
import { ListenButton } from './ListenButton'

interface Props {
  situation: Situation
  onExit: () => void
}

/**
 * One conversation, one line at a time: hear or read what the other person
 * says, choose the reply that fits, learn why, then say it yourself. A wrong
 * pick is explained and the learner tries again — the goal is to leave with
 * the right sentence, not with a score.
 */
export function SituationDialogue({ situation, onExit }: Props) {
  const { turns } = situation
  const [turnIdx, setTurnIdx] = useState(0)
  const [picks, setPicks] = useState<number[][]>([])
  const [meaning, setMeaning] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const currentRef = useRef<HTMLDivElement>(null)

  const finished = turnIdx >= turns.length
  const turn = turns[turnIdx]
  const correctOf = (i: number) => turns[i].choices.findIndex((c) => c.ok)
  const current = picks[turnIdx] ?? []
  const solved = !finished && current.includes(correctOf(turnIdx))
  const last = current.at(-1)
  const firstTry = picks.filter((p, i) => p[0] === correctOf(i)).length

  // Each new line takes focus, so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (turnIdx > 0) currentRef.current?.focus()
  }, [turnIdx])

  const pick = (i: number) => {
    setPicks((prev) => {
      const next = [...prev]
      next[turnIdx] = [...(next[turnIdx] ?? []), i]
      return next
    })
  }

  const advance = () => {
    setMeaning(false)
    setSpeaking(false)
    setTurnIdx((t) => t + 1)
  }

  const restart = () => {
    setPicks([])
    setMeaning(false)
    setSpeaking(false)
    setTurnIdx(0)
  }

  return (
    <div>
      <Button variant="ghost" onClick={onExit} style={{ marginBottom: 'var(--sp-3)' }}>العودة إلى كل المواقف</Button>
      <p className="eyebrow">
        <span dir="ltr">{situation.level}</span> · {finished ? 'اكتمل الحوار' : `الجملة ${turnIdx + 1} من ${turns.length}`}
      </p>
      <h2 className="section-title" style={{ marginBottom: 'var(--sp-1)' }}>{situation.titleAr}</h2>
      <p dir="ltr" lang="nl" style={{ margin: '0 0 var(--sp-3)', color: 'var(--text2)', fontFamily: 'var(--font-latin)', textAlign: 'start' }}>{situation.titleNl}</p>
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <ProgressBar value={(Math.min(turnIdx, turns.length) / turns.length) * 100} label="تقدّم الحوار" valueText={`${Math.min(turnIdx, turns.length)} من ${turns.length}`} />
      </div>
      <Callout tone="info" icon="📍" density="compact" style={{ marginBottom: 'var(--sp-4)' }}>{situation.contextAr}</Callout>

      <ol className="dialogue" aria-label="الحوار حتى الآن">
        {turns.slice(0, turnIdx).map((t, i) => (
          <li key={i} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
            <div className="bubble bubble--other" dir="ltr" lang="nl">
              <span className="bubble__who">{t.speaker}</span>
              <p className="bubble__nl">{t.nl}</p>
            </div>
            <div className="bubble bubble--me">
              <span className="bubble__who" lang="ar">أنت</span>
              <p className="bubble__nl" dir="ltr" lang="nl" style={{ textAlign: 'start' }}>{t.choices[correctOf(i)].nl}</p>
            </div>
          </li>
        ))}
      </ol>

      {!finished && turn && (
        <div ref={currentRef} tabIndex={-1} style={{ outline: 'none' }}>
          <div className="bubble bubble--other" dir="ltr" lang="nl" style={{ marginBottom: 'var(--sp-2)' }}>
            <span className="bubble__who">{turn.speaker}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
              <p className="bubble__nl" style={{ flex: 1 }}>{turn.nl}</p>
              <ListenButton compact text={turn.nl} label="استمع إلى الجملة" />
            </div>
          </div>
          <button type="button" className="btn btn--ghost" aria-expanded={meaning} onClick={() => setMeaning((m) => !m)} style={{ marginBottom: 'var(--sp-2)' }}>
            {meaning ? 'إخفاء المعنى' : 'إظهار المعنى بالعربية'}
          </button>
          {meaning && <p lang="ar" style={{ margin: '0 0 var(--sp-3)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)' }}>{turn.ar}</p>}

          <h3 style={{ margin: 'var(--sp-3) 0 var(--sp-2)', fontSize: 'var(--text-base)', fontWeight: 'var(--fw-heading)', color: 'var(--text)' }}>كيف تردّ؟</h3>
          <ChoiceList
            label="اختر الردّ المناسب"
            options={turn.choices.map((c) => c.nl)}
            correct={correctOf(turnIdx)}
            picked={current}
            mode="retry"
            onPick={pick}
          />

          {last !== undefined && (
            <Callout tone={turn.choices[last].ok ? 'success' : 'warn'} icon={turn.choices[last].ok ? '✓' : '✗'} role="status" style={{ marginTop: 'var(--sp-3)' }}>
              <strong style={{ color: 'var(--text)' }}>{turn.choices[last].ok ? 'ردّ مناسب.' : 'هذا الردّ لا يناسب هنا. جرّب مرّة أخرى.'}</strong>
              <p style={{ margin: 'var(--sp-1) 0 0' }}>{turn.choices[last].whyAr}</p>
              <p style={{ margin: 'var(--sp-1) 0 0' }}>المعنى: {turn.choices[last].ar}</p>
            </Callout>
          )}

          {solved && (
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', alignItems: 'flex-start' }}>
                <ListenButton text={turn.choices[correctOf(turnIdx)].nl} label="استمع إلى الردّ" />
                <Button variant="ghost" icon="🎙️" aria-expanded={speaking} onClick={() => setSpeaking((s) => !s)}>
                  {speaking ? 'أخفِ تمرين النطق' : 'قل الردّ بصوتك'}
                </Button>
              </div>
              {speaking && <SpeakAndCheck targetNl={turn.choices[correctOf(turnIdx)].nl} label="قل الردّ بصوتك" />}
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <Button variant="primary" size="lg" onClick={advance}>{turnIdx + 1 < turns.length ? 'الجملة التالية' : 'أنهِ الحوار'}</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {finished && (
        <div ref={currentRef} tabIndex={-1} style={{ outline: 'none' }}>
          <Callout tone="success" role="status" style={{ marginBottom: 'var(--sp-4)' }}>
            <strong style={{ color: 'var(--text)' }}>أنهيت هذا الموقف.</strong>
            <p style={{ margin: 'var(--sp-1) 0 0' }}>اخترت الردّ المناسب من المحاولة الأولى في {firstTry} من {turns.length} جمل.</p>
          </Callout>
          <h3 style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--text-base)', fontWeight: 'var(--fw-heading)', color: 'var(--text)' }}>عبارات تستحقّ الحفظ</h3>
          <ul style={{ listStyle: 'none', margin: '0 0 var(--sp-4)', padding: 0, display: 'grid', gap: 'var(--sp-2)' }}>
            {situation.phrases.map((p) => (
              <li key={p.nl} className="card" style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p dir="ltr" lang="nl" style={{ margin: 0, fontFamily: 'var(--font-latin)', fontWeight: 'var(--fw-heading)', color: 'var(--text)', textAlign: 'start', overflowWrap: 'anywhere' }}>{p.nl}</p>
                  <p lang="ar" style={{ margin: 0, color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>{p.ar}</p>
                </div>
                <ListenButton compact text={p.nl} label="استمع إلى العبارة" />
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <Button variant="primary" size="lg" onClick={onExit}>اختر موقفًا آخر</Button>
            <Button onClick={restart}>أعد هذا الموقف</Button>
          </div>
        </div>
      )}
    </div>
  )
}
