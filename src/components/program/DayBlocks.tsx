import { BLOCK_STYLE } from './blockStyle'
import { clockHHMM } from '@/features/program/dates'
import type { DayTimeline } from '@/features/program/types'

interface Props {
  timeline: DayTimeline
  currentIndex: number
  /** الكتل المكتملة — من الجلسة الجارية ومن السجلّ الدائم معًا. */
  completed: string[]
  running: boolean
  /** تشغيل المؤقّت من هذه الكتلة. */
  onJump: (index: number) => void
  /** تعليم الكتلة منجزة/غير منجزة — بلا حاجة إلى مؤقّت. */
  onToggleDone: (blockId: string) => void
}

export function DayBlocks({ timeline, currentIndex, completed, running, onJump, onToggleDone }: Props) {
  if (timeline.blocks.length === 0) {
    return (
      <div style={{ padding: '16px 18px', color: 'var(--muted)', fontSize: '.9rem' }}>
        لا مهامّ مجدولة في هذا اليوم.
      </div>
    )
  }

  const doneSet = new Set(completed)

  return (
    <ol style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 6 }}>
      {timeline.blocks.map((b, i) => {
        const st = BLOCK_STYLE[b.kind]
        const isCurrent = running && i === currentIndex
        const isDone = doneSet.has(b.id)
        const isBreak = b.kind === 'shortBreak' || b.kind === 'longBreak'

        return (
          <li key={b.id}>
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                background: isCurrent ? st.soft : 'var(--glass-bg)',
                border: `1px solid ${isCurrent ? st.color : 'var(--glass-border)'}`,
                borderInlineStart: `3px solid ${isCurrent ? st.color : isDone ? 'var(--green)' : 'transparent'}`,
                borderRadius: 'var(--r-sm)',
                padding: '6px 10px 6px 6px',
                opacity: isDone && !isCurrent ? 0.6 : 1,
                transition: 'background .2s ease, opacity .2s ease',
              }}
            >
              {/* صندوق الإنجاز — مستقلّ تمامًا عن المؤقّت */}
              <button
                type="button"
                onClick={() => onToggleDone(b.id)}
                aria-pressed={isDone}
                aria-label={isDone ? `إلغاء إنجاز ${b.title}` : `تعليم ${b.title} منجزة`}
                title={isDone ? 'إلغاء الإنجاز' : 'تعليم كمنجزة'}
                style={{
                  flexShrink: 0, width: 26, height: 26, borderRadius: 8,
                  border: `1.5px solid ${isDone ? 'var(--green)' : 'var(--border2)'}`,
                  background: isDone ? 'var(--green)' : 'transparent',
                  color: isDone ? '#fff' : 'var(--muted)',
                  cursor: 'pointer', fontSize: '.8rem', lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                {isDone ? '✓' : ''}
              </button>

              {/* بقيّة الصف: الضغط عليه يُشغّل المؤقّت من هنا */}
              <button
                type="button"
                onClick={() => onJump(i)}
                title="ابدأ المؤقّت من هذه المهمّة"
                style={{
                  flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 10,
                  textAlign: 'start', background: 'none', border: 'none',
                  padding: '3px 0', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--font-latin)', direction: 'ltr',
                    fontVariantNumeric: 'tabular-nums', fontSize: '.78rem',
                    color: 'var(--muted)', minWidth: 42,
                  }}
                >
                  {clockHHMM(b.plannedStartMs)}
                </span>

                <span style={{ fontSize: '1rem' }} aria-hidden="true">{st.icon}</span>

                <span style={{ flex: 1, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'block', fontWeight: isBreak ? 400 : 600,
                      fontSize: '.9rem',
                      color: isBreak ? 'var(--text2)' : 'var(--text)',
                      textDecoration: isDone ? 'line-through' : 'none',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                  >
                    {b.title}
                  </span>
                  {!isBreak && (
                    <span
                      style={{
                        display: 'block', fontSize: '.74rem', color: 'var(--muted)',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}
                    >
                      {b.subtitle}
                    </span>
                  )}
                </span>

                <span
                  style={{
                    fontSize: '.78rem', color: 'var(--muted)',
                    fontFamily: 'var(--font-latin)', whiteSpace: 'nowrap',
                  }}
                >
                  {Math.round(b.durationMs / 60000)}د
                </span>
              </button>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
