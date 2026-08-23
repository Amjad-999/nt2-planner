import { lessonLabel } from '@/data/curriculum'
import { STATUS_AR, STATUS_COLOR, statusOf, type StatusMap } from '@/features/program/progress'
import type { LessonStatus } from '@/features/program/types'

const CYCLE: LessonStatus[] = ['new', 'active', 'done', 'review', 'weak', 'mastered']

interface Props {
  lessonIds: string[]
  statuses: StatusMap
  onSet: (lessonId: string, status: LessonStatus) => void
  onSetAll: (status: LessonStatus) => void
}

export function LessonStatusGrid({ lessonIds, statuses, onSet, onSetAll }: Props) {
  if (lessonIds.length === 0) return null

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
        <span style={{ fontSize: '.78rem', color: 'var(--muted)', alignSelf: 'center' }}>تعليم الكل:</span>
        {CYCLE.map((s) => (
          <button
            key={s}
            onClick={() => onSetAll(s)}
            style={{
              background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
              borderRadius: 8, padding: '5px 11px', cursor: 'pointer',
              fontSize: '.76rem', fontFamily: 'inherit', color: STATUS_COLOR[s], fontWeight: 600,
            }}
          >
            {STATUS_AR[s]}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))', gap: 8 }}>
        {lessonIds.map((id) => {
          const st = statusOf(statuses, id)
          const next = CYCLE[(CYCLE.indexOf(st) + 1) % CYCLE.length]
          return (
            <button
              key={id}
              onClick={() => onSet(id, next)}
              title={`اضغط للتبديل إلى: ${STATUS_AR[next]}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderInlineStart: `3px solid ${STATUS_COLOR[st]}`,
                borderRadius: 'var(--r-sm)', padding: '8px 11px',
                cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start',
              }}
            >
              <span
                style={{
                  width: 9, height: 9, borderRadius: '50%',
                  background: STATUS_COLOR[st], flexShrink: 0,
                }}
                aria-hidden="true"
              />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontSize: '.8rem', fontWeight: 600, color: 'var(--text)' }}>
                  {lessonLabel(id)}
                </span>
                <span style={{ display: 'block', fontSize: '.7rem', color: STATUS_COLOR[st] }}>
                  {STATUS_AR[st]}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
