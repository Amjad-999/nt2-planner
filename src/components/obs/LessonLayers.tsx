import type { StepKind } from '@/features/observatory/types'
import { STEP_AR } from '@/features/observatory/session'
import { ICheck } from './icons'

/* ── Lesson layers ──────────────────────────────────────────────────────────
   The session as seven shallow planes: finished ones settle back (and can be
   reopened to revisit), the current one is raised and labelled, the upcoming
   ones wait flat. The same information is spoken as text: "الخطوة 3 من 7". */

interface Props {
  steps: { kind: StepKind; done: boolean }[]
  current: number
  viewing: number
  onSelect: (i: number) => void
}

export function LessonLayers({ steps, current, viewing, onSelect }: Props) {
  return (
    <nav aria-label="مراحل الجلسة">
      <ol className="o-layers" style={{ listStyle: 'none', margin: 0 }}>
        {steps.map((s, i) => {
          const isCur = i === current
          const state = s.done && !isCur ? 'is-done' : isCur ? 'is-current' : i === current + 1 ? 'is-next' : ''
          const reachable = s.done || isCur
          return (
            <li key={s.kind} style={{ display: 'contents' }}>
              <button
                type="button"
                className={`o-layer ${state}${viewing === i && !isCur ? ' is-viewing' : ''}`}
                aria-current={isCur ? 'step' : undefined}
                aria-disabled={!reachable || undefined}
                aria-label={`${i + 1} من ${steps.length}: ${STEP_AR[s.kind]}${s.done ? ' — مكتملة، افتحها للمراجعة' : isCur ? ' — الحالية' : ' — لم تبدأ بعد'}`}
                onClick={() => { if (reachable) onSelect(i) }}
              >
                {s.done && !isCur ? <ICheck size={14} /> : <span className="o-meta" style={{ color: 'inherit' }}>{String(i + 1).padStart(2, '0')}</span>}
                <span className="o-layer__label">{STEP_AR[s.kind]}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
