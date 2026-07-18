import { useState } from 'react'
import { GRAMMAR_EXERCISES, type GrammarExercise } from '@/data/grammarExercises'
import { useAppStore } from '@/store/useAppStore'

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
  const list: GrammarExercise[] = GRAMMAR_EXERCISES[lessonId] ?? []
  const markGrammarDone = useAppStore(s => s.markGrammarDone)

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
  const [inputs, setInputs] = useState<Record<number, string>>({})

  if (list.length === 0) return null

  const correctCount = Object.values(answers).filter(a => a.done && a.correct).length

  const answerMcq = (i: number, choice: number, correctIdx: number) => {
    setAnswers(prev => (prev[i]?.done ? prev : { ...prev, [i]: { done: true, correct: choice === correctIdx, chosen: choice } }))
    if (choice === correctIdx) markGrammarDone(lessonId, i)
  }
  const answerGap = (i: number, answer: string, accept: string[]) => {
    const val = norm(inputs[i] ?? '')
    const ok = val.length > 0 && [answer, ...accept].map(norm).includes(val)
    setAnswers(prev => (prev[i]?.done ? prev : { ...prev, [i]: { done: true, correct: ok, chosen: null } }))
    if (ok) markGrammarDone(lessonId, i)
  }

  return (
    <section dir="rtl" style={{
      marginTop: 20,
      background: 'var(--glass-bg)',
      backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
      border: '1px solid var(--glass-border)',
      borderRadius: 'var(--r)',
      padding: '20px 18px',
      boxShadow: 'var(--elev-1)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', fontWeight: 700, color: 'var(--text)', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: 'var(--orange)' }}>✏️</span> تمارين
        </h3>
        <span style={{ fontSize: '.82rem', color: 'var(--muted)', fontWeight: 600 }}>{correctCount} / {list.length}</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {list.map((ex, i) => {
          const st = answers[i]
          const done = !!st?.done
          return (
            <div key={i} style={{ border: '1px solid var(--border)', borderRadius: 'var(--r-sm)', padding: '12px 14px', background: 'var(--surface2)' }}>
              <div style={{ fontSize: '.9rem', color: 'var(--text)', marginBottom: ex.cue ? 8 : 10, display: 'flex', gap: 8, alignItems: 'baseline' }}>
                <span style={{ color: 'var(--orange)', fontWeight: 700 }}>{i + 1}.</span>
                <span>{ex.promptAr}</span>
              </div>

              {ex.cue && (
                <div dir="ltr" style={{ textAlign: 'start', background: 'var(--surface3)', borderRadius: 8, padding: '8px 12px', fontSize: '.95rem', color: 'var(--text)', marginBottom: 10, fontWeight: 500 }}>{ex.cue}</div>
              )}

              {ex.kind === 'mcq' ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {ex.options.map((opt, oi) => {
                    const showCorrect = done && oi === ex.answer
                    const showWrong = done && st?.chosen === oi && oi !== ex.answer
                    let bg = 'var(--btn-bg)'; let bc = 'var(--btn-border)'; let col = 'var(--text)'
                    if (showCorrect) { bg = 'var(--green-l)'; bc = 'var(--green)'; col = 'var(--green)' }
                    if (showWrong) { bg = 'var(--red-l)'; bc = 'var(--red)'; col = 'var(--red)' }
                    return (
                      <button key={oi} dir="ltr" disabled={done} onClick={() => answerMcq(i, oi, ex.answer)}
                        style={{ background: bg, border: `1px solid ${bc}`, color: col, borderRadius: 8, padding: '8px 16px', fontFamily: 'inherit', fontSize: '.92rem', fontWeight: 500, cursor: done ? 'default' : 'pointer' }}>
                        {opt}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <input dir="ltr" type="text" value={inputs[i] ?? ''} disabled={done}
                    onChange={e => setInputs(prev => ({ ...prev, [i]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') answerGap(i, ex.answer, ex.accept ?? []) }}
                    placeholder="اكتب الإجابة…"
                    style={{ flex: 1, minWidth: 140, padding: '9px 12px', border: `1px solid ${done ? (st?.correct ? 'var(--green)' : 'var(--red)') : 'var(--border2)'}`, borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: '.95rem' }} />
                  <button disabled={done} onClick={() => answerGap(i, ex.answer, ex.accept ?? [])} className="btn-shine"
                    style={{ background: done ? 'var(--surface3)' : 'var(--grad-primary)', color: done ? 'var(--muted)' : '#fff', border: 'none', borderRadius: 8, padding: '9px 18px', fontWeight: 600, fontSize: '.85rem', fontFamily: 'inherit', cursor: done ? 'default' : 'pointer' }}>تحقّق</button>
                </div>
              )}

              {st && st.done && (
                <div style={{ marginTop: 10, fontSize: '.86rem', lineHeight: 1.6, color: st.correct ? 'var(--green)' : 'var(--red)' }}>
                  {st.correct ? '✅ صحيح! ' : '❌ غير صحيح. '}
                  {!st.correct && ex.kind === 'gap' && (<>الإجابة: <strong style={{ color: 'var(--text)' }}>{ex.answer}</strong> — </>)}
                  {!st.correct && ex.kind === 'mcq' && (<>الإجابة: <strong style={{ color: 'var(--text)' }}>{ex.options[ex.answer]}</strong> — </>)}
                  <span style={{ color: 'var(--text2)' }}>{ex.explainAr}</span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
