import { useId, useRef, useState } from 'react'
import { GRAMMAR_EXERCISES, type GrammarExercise } from '@/data/grammarExercises'
import { useAppStore } from '@/store/useAppStore'
import { BilingualText } from '@/components/BilingualText'

interface Props {
  lessonId: string
}

interface AnswerState {
  done: boolean
  correct: boolean
  chosen: number | null
}

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')

/** تمارين القواعد التفاعلية المعروضة أسفل كل درس — مع حفظ التقدّم في المتجر. */
export function GrammarExercises({ lessonId }: Props) {
  return <LessonExercises key={lessonId} lessonId={lessonId} />
}

function LessonExercises({ lessonId }: Props) {
  const list: GrammarExercise[] = GRAMMAR_EXERCISES[lessonId] ?? []
  const markGrammarDone = useAppStore(s => s.markGrammarDone)
  const groupId = useId()
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({})

  // البذرة من التقدّم المحفوظ: التمارين المُجابة بنجاحٍ سابقًا تظهر مكتملةً
  const [answers, setAnswers] = useState<Record<number, AnswerState>>(() => {
    const saved = useAppStore.getState().grammarProgress[lessonId] ?? []
    const seed: Record<number, AnswerState> = {}
    for (const i of saved) {
      const ex = list[i]
      if (!ex) continue
      seed[i] = { done: true, correct: true, chosen: ex.kind === 'mcq' ? ex.answer : null }
    }
    return seed
  })
  const [inputs, setInputs] = useState<Record<number, string>>(() => {
    const saved = useAppStore.getState().grammarProgress[lessonId] ?? []
    return Object.fromEntries(saved.flatMap(i => list[i]?.kind === 'gap' ? [[i, list[i].answer]] : []))
  })

  if (list.length === 0) return null

  const correctCount = Object.values(answers).filter(a => a.done && a.correct).length

  const answerMcq = (i: number, choice: number, correctIdx: number) => {
    if (answers[i]?.done) return
    setAnswers(prev => (prev[i]?.done ? prev : { ...prev, [i]: { done: true, correct: choice === correctIdx, chosen: choice } }))
    if (choice === correctIdx) markGrammarDone(lessonId, i)
  }
  const answerGap = (i: number, answer: string, accept: string[]) => {
    if (answers[i]?.done) return
    const val = norm(inputs[i] ?? '')
    if (!val) return
    const ok = val.length > 0 && [answer, ...accept].map(norm).includes(val)
    setAnswers(prev => (prev[i]?.done ? prev : { ...prev, [i]: { done: true, correct: ok, chosen: null } }))
    if (ok) markGrammarDone(lessonId, i)
  }
  const retry = (i: number) => {
    setAnswers(prev => {
      const next = { ...prev }
      delete next[i]
      return next
    })
    setInputs(prev => ({ ...prev, [i]: '' }))
    setTimeout(() => questionRefs.current[i]?.querySelector<HTMLElement>('input, button')?.focus(), 0)
  }

  return (
    <section dir="rtl" style={{
      marginTop: 'var(--sp-5)',
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--r)',
      padding: '20px 18px',
      boxShadow: 'var(--elev-1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--sp-3)' }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-heading)', color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <span style={{ color: 'var(--orange-text)' }}>✏️</span> تمارين
        </h3>
        <span aria-label={`${correctCount} إجابات صحيحة من ${list.length}`} style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', fontWeight: 'var(--fw-heading)' }}>{correctCount} / {list.length}</span>
      </div>
      <p style={{ color: 'var(--text2)', fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-arabic)' }}>
        {correctCount === list.length ? '✅ أكملت التمارين. راجع الشرح ثم انتقل إلى الدرس التالي.' : 'أجب عن الأسئلة ثم راجع التفسير. يمكنك إعادة أي إجابة خاطئة، وتُحفظ إجاباتك الصحيحة تلقائيًا.'}
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
        {list.map((ex, i) => {
          const st = answers[i]
          const done = !!st?.done
          return (
            <div key={i} ref={el => { questionRefs.current[i] = el }} role="group" aria-labelledby={`${groupId}-${i}`} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 14px', background: 'var(--surface2)' }}>
              <div id={`${groupId}-${i}`} style={{ fontSize: 'var(--text-base)', color: 'var(--text)', marginBottom: 'var(--sp-2)', display: 'flex', gap: 'var(--sp-2)', alignItems: 'baseline' }}>
                <span style={{ color: 'var(--orange-text)', fontWeight: 'var(--fw-cta)' }}>{i + 1}.</span>
                <span><BilingualText text={ex.promptAr} /></span>
              </div>

              {ex.cue && (
                <div dir="auto" style={{ textAlign: 'start', background: 'var(--surface3)', borderRadius: 'var(--r-xs)', padding: '8px 12px', fontSize: 'var(--text-base)', lineHeight: 'var(--lh-arabic)', color: 'var(--text)', marginBottom: 'var(--sp-3)', fontWeight: 'var(--fw-medium)' }}><BilingualText text={ex.cue} /></div>
              )}

              {ex.kind === 'mcq' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
                  {ex.options.map((opt, oi) => {
                    const showCorrect = done && oi === ex.answer
                    const showWrong = done && st?.chosen === oi && oi !== ex.answer
                    let bg = 'var(--btn-bg)'; let bc = 'var(--btn-border)'; let col = 'var(--text)'
                    if (showCorrect) { bg = 'var(--green-l)'; bc = 'var(--green)'; col = 'var(--green-text)' }
                    if (showWrong) { bg = 'var(--red-l)'; bc = 'var(--red)'; col = 'var(--red-text)' }
                    return (
                      <button key={oi} type="button" dir="ltr" lang="nl" disabled={done} aria-pressed={st?.chosen === oi} onClick={() => answerMcq(i, oi, ex.answer)}
                        style={{ minHeight: 'var(--tap-min)', background: bg, border: `1px solid ${bc}`, color: col, borderRadius: 'var(--r-xs)', padding: '8px 16px', fontFamily: 'var(--font-latin)', fontSize: 'var(--text-base)', fontWeight: 'var(--fw-medium)', cursor: done ? 'default' : 'pointer' }}>
                        {showCorrect && <span aria-hidden="true">✓ </span>}{showWrong && <span aria-hidden="true">✕ </span>}{opt}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                  <input dir="ltr" lang="nl" type="text" value={inputs[i] ?? ''} disabled={done}
                    aria-label={`إجابة السؤال ${i + 1}`}
                    aria-invalid={done && !st?.correct}
                    aria-describedby={done ? `${groupId}-${i}-feedback` : undefined}
                    onChange={e => setInputs(prev => ({ ...prev, [i]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') answerGap(i, ex.answer, ex.accept ?? []) }}
                    placeholder="Uw antwoord"
                    style={{ flex: 1, minWidth: 140, minHeight: 'var(--tap-min)', padding: '9px 12px', border: `1px solid ${done ? (st?.correct ? 'var(--green)' : 'var(--red)') : 'var(--border2)'}`, borderRadius: 'var(--r-xs)', background: 'var(--surface)', color: 'var(--text)', fontFamily: 'var(--font-latin)', fontSize: 'var(--text-base)' }} />
                  <button type="button" disabled={done || !norm(inputs[i] ?? '')} onClick={() => answerGap(i, ex.answer, ex.accept ?? [])} className="btn-shine"
                    style={{ background: done ? 'var(--surface3)' : 'var(--btn-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', color: done ? 'var(--muted)' : 'var(--text)', border: '1px solid var(--btn-border)', borderRadius: 'var(--r-xs)', padding: '9px 18px', fontWeight: 'var(--fw-cta)', fontSize: 'var(--text-sm)', fontFamily: 'inherit', cursor: done ? 'default' : 'pointer' }}>تحقّق</button>
                </div>
              )}

              {st && st.done && (
                <div id={`${groupId}-${i}-feedback`} role="status" style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-arabic)', color: st.correct ? 'var(--green-text)' : 'var(--red-text)' }}>
                  <strong>{st.correct ? '✅ إجابة صحيحة' : '✕ راجع الإجابة وحاول مجدّدًا'}</strong>
                  {!st.correct && <>
                    <p style={{ margin: 'var(--sp-2) 0 0' }}>الإجابة الصحيحة:</p>
                    <p dir="ltr" lang="nl" style={{ margin: 'var(--sp-1) 0', color: 'var(--text)', fontFamily: 'var(--font-latin)', fontSize: 'var(--text-base)' }}>{ex.kind === 'gap' ? ex.answer : ex.options[ex.answer]}</p>
                  </>}
                  <p style={{ color: 'var(--text2)', margin: 'var(--sp-2) 0' }}><BilingualText text={ex.explainAr} /></p>
                  {!st.correct && <button type="button" onClick={() => retry(i)} className="btn-secondary" style={{ minHeight: 'var(--tap-min)' }}>إعادة هذا السؤال</button>}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
