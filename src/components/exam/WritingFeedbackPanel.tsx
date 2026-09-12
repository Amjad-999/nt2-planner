import { useEffect, useMemo, useRef, useState } from 'react'
import { checkWriting } from '@/features/exam/writingCheck'
import { requestWritingFeedback, aiConfigured, type AiWritingFeedback } from '@/features/ai/writingFeedback'
import type { ExamWritingItem } from '@/store/types'

/**
 * لوحة تقييم الكتابة.
 *
 * Two layers, on purpose:
 *  - the local report recomputes as the user types and never needs a network,
 *    so the panel is never empty and never blocks;
 *  - the AI review is an explicit button, because it costs a request.
 * A failed AI call leaves the local report untouched.
 */

interface Props {
  task: ExamWritingItem
  text: string
  /** Called when the user asks to record the local score. */
  onRecord: (total: number, summaryAr: string) => void
}

const box: React.CSSProperties = {
  background: 'var(--glass-bg)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--r-sm)',
  padding: '12px 14px',
  marginTop: 'var(--sp-3)',
}

function Bar({ pct, label, weight }: { pct: number; label: string; weight: number }) {
  /* Two tokens per state, not one: the fill only needs 3:1 so it uses the plain
     accent, while the number and the icon are text and must clear 4.5:1. */
  const fill = pct >= 70 ? 'var(--green)' : pct >= 45 ? 'var(--orange)' : 'var(--red)'
  const ink = pct >= 70 ? 'var(--green-text)' : pct >= 45 ? 'var(--orange-text)' : 'var(--red-text)'
  const icon = pct >= 70 ? '✔' : pct >= 45 ? '•' : '✕'
  return (
    <div style={{ margin: '8px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
        <span><span style={{ color: ink }}>{icon}</span> {label} <span style={{ color: 'var(--muted)' }}>({weight}%)</span></span>
        <strong style={{ color: ink }}>{pct}</strong>
      </div>
      <div style={{ height: 6, borderRadius: 'var(--r-xs)', background: 'var(--border)', overflow: 'hidden', marginTop: 'var(--sp-1)' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: fill, transition: 'width .25s' }} />
      </div>
    </div>
  )
}

function Btn({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        padding: '8px 14px', borderRadius: 'var(--r-sm)', cursor: disabled ? 'not-allowed' : 'pointer',
        border: '1px solid var(--border2)', background: 'var(--btn-bg)', color: 'var(--text)',
        fontSize: 'var(--text-sm)', opacity: disabled ? 0.55 : 1,
      }}
    >
      {children}
    </button>
  )
}

export function WritingFeedbackPanel({ task, text, onRecord }: Props) {
  const report = useMemo(() => checkWriting(text, task), [text, task])
  const [ai, setAi] = useState<AiWritingFeedback | null>(null)
  const [aiError, setAiError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const abort = useRef<AbortController | null>(null)

  useEffect(() => () => abort.current?.abort(), [])

  const runAi = async () => {
    abort.current?.abort()
    const ctrl = new AbortController()
    abort.current = ctrl
    setBusy(true); setAiError(null)
    const res = await requestWritingFeedback(text, task, ctrl.signal)
    if (ctrl.signal.aborted) return
    setBusy(false)
    if (res.ok) { setAi(res.data); setAiError(null) } else { setAi(null); setAiError(res.reasonAr) }
  }

  const empty = report.wordCount === 0

  return (
    <div style={{ marginTop: 'var(--sp-3)' }}>
      {/* قائمة النقاط المطلوبة — تتحدّث مع الكتابة */}
      <div style={box}>
        <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', color: 'var(--text)', marginBottom: 'var(--sp-2)' }}>
          النقاط المطلوبة — {report.coveredPoints} من {task.points.length}
        </div>
        {task.points.map((p) => {
          const done = !report.missingPointsAr.includes(p.ar)
          return (
            <div key={p.ar} style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'flex-start', fontSize: 'var(--text-sm)', margin: '4px 0', color: done ? 'var(--green-text)' : 'var(--muted)' }}>
              <span aria-hidden>{done ? '✔' : '○'}</span>
              <span>{p.ar}</span>
            </div>
          )
        })}
        {task.register === 'formeel' && (
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', marginTop: 'var(--sp-2)' }}>
            هذه المهمّة رسمية: استخدم صيغة الاحترام.
          </div>
        )}
      </div>

      {/* الدرجات لكل معيار */}
      {!empty && (
        <div style={box}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', color: 'var(--text)' }}>التقييم المحلّي</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>{report.total}</div>
          </div>
          {report.criteria.map((c) => <Bar key={c.key} pct={c.score} label={c.labelAr} weight={c.weight} />)}
          <ul style={{ margin: '8px 0 0', paddingInlineStart: 18, fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
            {report.criteria.flatMap((c) => c.notesAr).filter(Boolean).map((n, i) => <li key={i} style={{ margin: '3px 0' }}>{n}</li>)}
          </ul>
        </div>
      )}

      {/* أخطاء مؤكّدة فقط */}
      {report.issues.length > 0 && (
        <div style={box}>
          <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', color: 'var(--text)', marginBottom: 'var(--sp-2)' }}>
            أخطاء مؤكّدة — {report.issues.length}
          </div>
          {report.issues.map((it, i) => (
            <div key={i} style={{ margin: '6px 0', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
              <div dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)', fontSize: 'var(--text-sm)' }}>
                <span style={{ color: 'var(--red-text)', textDecoration: 'line-through' }}>{it.found}</span>
                {' → '}
                <span style={{ color: 'var(--green-text)' }}>{it.fixNl}</span>
              </div>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{it.whyAr}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <Btn onClick={() => onRecord(report.total, `المحتوى ${report.coveredPoints} من ${task.points.length} • ${report.wordCount} كلمة`)} disabled={empty}>
          سجّل الدرجة
        </Btn>
        <Btn onClick={runAi} disabled={empty || busy || !aiConfigured()}>
          {busy ? 'جارٍ التصحيح…' : 'تصحيح ذكي'}
        </Btn>
      </div>

      {!aiConfigured() && (
        <div style={{ ...box, color: 'var(--muted)', fontSize: 'var(--text-sm)' }}>
          التصحيح الذكي غير مُهيَّأ بعد. التقييم المحلّي أعلاه يعمل كاملًا.
        </div>
      )}

      {aiError && (
        <div style={{ ...box, borderColor: 'var(--orange)', color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>
          <span aria-hidden>⚠ </span>{aiError}
        </div>
      )}

      {ai && (
        <div style={{ ...box, borderColor: 'var(--green)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', color: 'var(--text)' }}>التصحيح الذكي</div>
            <div style={{ fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>{ai.totaal}</div>
          </div>
          <Bar pct={ai.scores.inhoud} label="المحتوى" weight={25} />
          <Bar pct={ai.scores.taal} label="التركيب اللغوي" weight={25} />
          <Bar pct={ai.scores.woordenschat} label="المفردات" weight={25} />
          <Bar pct={ai.scores.vorm} label="الشكل" weight={25} />
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', margin: '8px 0' }}>{ai.samenvattingAr}</p>

          {ai.issues.length > 0 && (
            <details open>
              <summary style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>شرح الأخطاء</summary>
              {ai.issues.map((it, i) => (
                <div key={i} style={{ margin: '6px 0', paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
                  <div dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)', fontSize: 'var(--text-sm)' }}>
                    <span style={{ color: 'var(--red-text)', textDecoration: 'line-through' }}>{it.fout}</span>
                    {' → '}
                    <span style={{ color: 'var(--green-text)' }}>{it.goed}</span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>{it.uitlegAr}</div>
                </div>
              ))}
            </details>
          )}

          <details>
            <summary style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>نصّك مصحّحًا</summary>
            <p dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)', fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-arabic)', whiteSpace: 'pre-wrap' }}>{ai.correctedNl}</p>
          </details>

          <details>
            <summary style={{ cursor: 'pointer', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>نموذج أقوى للمقارنة</summary>
            <p dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)', fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-arabic)', whiteSpace: 'pre-wrap' }}>{ai.modelNl}</p>
          </details>
        </div>
      )}
    </div>
  )
}
