import { useEffect, useRef, useState } from 'react'
import type { ExamReadingItem, ExamListeningItem } from '@/store/types'
import { PASS_THRESHOLD } from '@/data/phases'
import { Button } from '@/components/ui/Button'
import { Callout } from '@/components/ui/Callout'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { ChoiceList } from '@/components/practice/ChoiceList'
import { ListeningAudio } from './ListeningAudio'

type Item = ExamReadingItem | ExamListeningItem
type Answers = Record<string, Record<number, number>>

interface Props {
  kind: 'reading' | 'listening'
  items: readonly Item[]
  answers: Answers
  onAnswer: (id: string, qi: number, oi: number, questions: Item['questions']) => void
  onReset: (id: string) => void
}

const COPY = {
  reading: { nl: 'Lezen', unit: 'النصّ', all: 'كل النصوص', next: 'النصّ التالي', hint: 'اقرأ النصّ، ثم أجب عن الأسئلة. لكل سؤال محاولة واحدة، كما في الامتحان.' },
  listening: { nl: 'Luisteren', unit: 'التسجيل', all: 'كل التسجيلات', next: 'التسجيل التالي', hint: 'استمع أوّلًا، ثم أجب. النصّ المكتوب يُفتح بعد أن تجيب عن كل الأسئلة.' },
} as const

function scoreOf(item: Item, ans: Record<number, number>) {
  const answered = Object.keys(ans).length
  const correct = item.questions.filter((q, qi) => ans[qi] === q.correct).length
  const complete = answered === item.questions.length
  return { answered, correct, complete, pct: complete ? Math.round((correct / item.questions.length) * 100) : null }
}

/**
 * Exam practice for Lezen and Luisteren, one passage at a time.
 *
 * The previous screen stacked every passage and all its questions into one
 * long page: no sense of where the learner was, a transcript available
 * before listening, and answers that could be changed after the correct one
 * lit up. Here a library shows each passage's status; opening one gives the
 * text (or audio) the full width, one honest try per question, feedback
 * after each answer, and a clear "next".
 */
export function PassagePractice({ kind, items, answers, onAnswer, onReset }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const copy = COPY[kind]
  const index = items.findIndex((i) => i.id === openId)
  const item = index >= 0 ? items[index] : null
  const firstOpen = items.find((i) => !scoreOf(i, answers[i.id] ?? {}).complete)

  useEffect(() => {
    if (!openId) return
    headingRef.current?.focus({ preventScroll: true })
    headingRef.current?.scrollIntoView({ block: 'start' })
  }, [openId])

  if (!item) {
    return (
      <div>
        <p style={{ margin: '0 0 var(--sp-3)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)' }}>{copy.hint}</p>
        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-2)' }}>
          {items.map((it, i) => {
            const s = scoreOf(it, answers[it.id] ?? {})
            const status = s.complete
              ? `${s.pct! >= PASS_THRESHOLD ? '✓' : '◐'} النتيجة ${s.pct}%`
              : s.answered > 0 ? `◐ أجبت ${s.answered} من ${it.questions.length}` : `○ ${it.questions.length} أسئلة`
            return (
              <li key={it.id}>
                <button type="button" className="card" onClick={() => setOpenId(it.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', width: '100%', textAlign: 'start', cursor: 'pointer', font: 'inherit', color: 'var(--text)', padding: 'var(--sp-3) var(--sp-4)' }}>
                  <span aria-hidden="true" style={{ color: 'var(--text2)', minWidth: 24 }}>{i + 1}</span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span dir="ltr" lang="nl" style={{ display: 'block', fontFamily: 'var(--font-latin)', fontWeight: 'var(--fw-heading)', textAlign: 'start', overflowWrap: 'anywhere' }}>{it.title}</span>
                    <span style={{ display: 'block', color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>{it.ar}</span>
                  </span>
                  <span className={`chip${s.complete ? ' chip--success' : ''}`}>{status}</span>
                  {it === firstOpen && <span className="chip chip--brand">التالي</span>}
                </button>
              </li>
            )
          })}
        </ul>
      </div>
    )
  }

  const ans = answers[item.id] ?? {}
  const s = scoreOf(item, ans)
  const nextItem = items.slice(index + 1).find((i) => !scoreOf(i, answers[i.id] ?? {}).complete)
  const transcript = 'transcript' in item ? item.transcript : null

  return (
    <div>
      <Button variant="ghost" onClick={() => setOpenId(null)} style={{ marginBottom: 'var(--sp-3)' }}>العودة إلى {copy.all}</Button>
      <p className="eyebrow"><span dir="ltr" lang="nl">{copy.nl}</span> · {copy.unit} {index + 1} من {items.length}</p>
      <h3 ref={headingRef} tabIndex={-1} dir="ltr" lang="nl" style={{ margin: 0, outline: 'none', fontFamily: 'var(--font-latin)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-cta)', color: 'var(--text)', textAlign: 'start', scrollMarginTop: 'var(--sp-12)' }}>{item.title}</h3>
      <p style={{ margin: '0 0 var(--sp-3)', color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>{item.ar}</p>
      <div style={{ marginBottom: 'var(--sp-4)' }}>
        <ProgressBar value={(s.answered / item.questions.length) * 100} label="الأسئلة المُجاب عنها" valueText={`${s.answered} من ${item.questions.length}`} />
      </div>

      {'text' in item && (
        <article className="card reading-text" dir="ltr" lang="nl" style={{ marginBottom: 'var(--sp-4)', textAlign: 'start' }}>
          {item.text.split('\n\n').map((p, i) => <p key={i}>{p}</p>)}
        </article>
      )}
      {transcript !== null && <ListeningAudio key={item.id} text={transcript} unlocked={s.complete} />}

      <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-4)' }}>
        {item.questions.map((q, qi) => {
          const sel = ans[qi]
          const why = 'why' in q ? (q as { why: string }).why : ''
          return (
            <li key={qi} className="card">
              <p dir="ltr" lang="nl" style={{ margin: '0 0 var(--sp-3)', fontFamily: 'var(--font-latin)', fontWeight: 'var(--fw-heading)', color: 'var(--text)', textAlign: 'start', lineHeight: 'var(--lh-ui)' }}>
                {qi + 1}. {q.q}
              </p>
              <ChoiceList label={`السؤال ${qi + 1}`} options={q.opts} correct={q.correct} picked={sel === undefined ? [] : [sel]} mode="single"
                onPick={(oi) => onAnswer(item.id, qi, oi, item.questions)} />
              {sel !== undefined && (
                <Callout tone={sel === q.correct ? 'success' : 'warn'} icon={sel === q.correct ? '✓' : '✗'} role="status" density="compact" style={{ marginTop: 'var(--sp-3)' }}>
                  <strong style={{ color: 'var(--text)' }}>{sel === q.correct ? 'إجابة صحيحة.' : `الإجابة الصحيحة: ${String.fromCharCode(65 + q.correct)}.`}</strong>
                  {why ? <p style={{ margin: 'var(--sp-1) 0 0' }}>{why}</p>
                    : kind === 'listening' && sel !== q.correct && <p style={{ margin: 'var(--sp-1) 0 0' }}>ابحث عن الجملة في النصّ المكتوب بعد أن تنهي الأسئلة، ثم استمع مرّة أخرى.</p>}
                </Callout>
              )}
            </li>
          )
        })}
      </ol>

      {s.complete && (
        <Callout tone={s.pct! >= PASS_THRESHOLD ? 'success' : 'warn'} role="status" style={{ marginTop: 'var(--sp-4)' }}>
          <strong style={{ color: 'var(--text)', fontSize: 'var(--text-lg)' }}>النتيجة: {s.correct} من {item.questions.length} ({s.pct}%)</strong>
          <p style={{ margin: 'var(--sp-1) 0 var(--sp-3)' }}>
            {s.pct! >= PASS_THRESHOLD ? `فوق هدف التدريب (${PASS_THRESHOLD}%).` : `تحت هدف التدريب (${PASS_THRESHOLD}%). راجع الإجابات الخاطئة وشرحها، ثم أعد المحاولة لاحقًا.`}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            {nextItem
              ? <Button variant="primary" onClick={() => setOpenId(nextItem.id)}>{copy.next}</Button>
              : <Button variant="primary" onClick={() => setOpenId(null)}>{copy.all}</Button>}
            <Button onClick={() => onReset(item.id)}>أعد المحاولة</Button>
          </div>
        </Callout>
      )}
    </div>
  )
}
