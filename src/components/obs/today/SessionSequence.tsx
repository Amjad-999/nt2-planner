import type { LessonItem, SessionRun } from '@/features/observatory/types'
import { STEP_AR, STEP_NL, STEP_ORDER, EST } from '@/features/observatory/session'
import { mins, pad2 } from '@/features/observatory/format'
import { Nl } from '../ui'
import { ICheck } from '../icons'

/* The session as a readable sequence: seven steps, each with its planned
   minutes and — once done — the measured minutes, side by side, labelled.
   Planned is never presented as done. */

interface Props {
  title?: string
  run: SessionRun | null
  item?: LessonItem
  planned: { q: number; w: number; b: number }
  pace: number | null
  minutesToday: number
}

export function SessionSequence({ title, run, item, planned, pace, minutesToday }: Props) {
  const est = (k: typeof STEP_ORDER[number]) => {
    if (run) return run.steps.find((s) => s.kind === k)!.estMin
    return {
      input: item?.kind === 'listen' ? EST.listen : EST.read, questions: planned.q * EST.question, words: planned.w * EST.word,
      build: planned.b * EST.build, retell: EST.retell, recall: 2 * EST.recall, review: EST.review,
    }[k]
  }
  const total = STEP_ORDER.reduce((n, k) => n + est(k), 0)
  const actual = run ? run.steps.reduce((n, s) => n + s.activeMs, 0) / 60000 : 0

  return (
    <>
      <div className="o-row" style={{ justifyContent: 'space-between' }}>
        <h2 className="o-h3" id="seq-title">{title ?? (run ? 'تسلسل هذه الجلسة' : 'كيف ستسير الجلسة')}</h2>
        <span className="o-small">مخطط: {Math.round(total)} د{pace ? ` · معدَّل ≈ ${Math.round(total * pace)} د` : ''}</span>
      </div>
      <ol className="o-seq" style={{ marginTop: 10 }}>
        {STEP_ORDER.map((k, i) => {
          const s = run?.steps[i]
          const done = !!s?.doneAt
          const cur = !!run && run.stepIndex === i && !done
          return (
            <li key={k} className={done ? 'is-done' : cur ? 'is-current' : ''} aria-current={cur ? 'step' : undefined}>
              <span className="o-seq__n">{done ? <ICheck size={16} label="مكتملة" /> : pad2(i + 1)}</span>
              <span className="o-seq__name">
                <span style={{ fontWeight: cur ? 800 : 600 }}>{STEP_AR[k]}{cur && <span className="o-small"> · أنت هنا</span>}</span>
                <Nl>{STEP_NL[k]}</Nl>
              </span>
              <span className="o-seq__time">
                {done ? <>فعلي {mins(s!.activeMs / 60000)} د</> : <>≈ {mins(est(k))} د</>}
              </span>
            </li>
          )
        })}
      </ol>
      <div style={{ marginTop: 14, display: 'grid', gap: 6 }}>
        <div className="o-row" style={{ justifyContent: 'space-between' }}>
          <span className="o-small">وقت فعلي في هذه الجلسة: {mins(actual)} د من ≈ {Math.round(total)} مخطط</span>
          <span className="o-small">اليوم كله: {mins(minutesToday)} د فعلية</span>
        </div>
        <div className="o-meter" role="img" aria-label={`الوقت الفعلي ${mins(actual)} دقيقة من ${Math.round(total)} مخطط`}>
          <span style={{ width: `${Math.min(100, (actual / Math.max(1, total)) * 100)}%` }} />
        </div>
      </div>
    </>
  )
}
