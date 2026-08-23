import { compactLessonRange, sectionShort, sumLessonMinutes } from '@/data/curriculum'
import { formatDayAr, formatMinutesAr } from '@/features/program/dates'
import { buildTimeline } from '@/features/program/timeline'
import type { ProgramPlan } from '@/features/program/schedule'
import { statusOf, type StatusMap } from '@/features/program/progress'
import type { DayKind } from '@/features/program/types'

const KIND_STYLE: Record<DayKind, { label: string; color: string; soft: string }> = {
  learn:       { label: 'تعلّم',    color: 'var(--blue)',   soft: 'var(--blue-l)' },
  buffer:      { label: 'احتياطي',  color: 'var(--green)',  soft: 'var(--green-l)' },
  consolidate: { label: 'تثبيت',    color: 'var(--purple)', soft: 'var(--purple-l)' },
  taper:       { label: 'تخفيف',    color: 'var(--amber)',  soft: 'var(--amber-l)' },
  deadline:    { label: 'الموعد',   color: 'var(--red)',    soft: 'var(--red-l)' },
}

interface Props {
  plan: ProgramPlan
  statuses: StatusMap
  todayKey: string
  selected: string
  onSelect: (date: string) => void
}

const th: React.CSSProperties = {
  padding: '9px 10px', textAlign: 'start', borderBottom: '1px solid var(--border)',
  color: 'var(--muted)', fontWeight: 500, fontSize: '.72rem',
  letterSpacing: '.4px', whiteSpace: 'nowrap',
}
const td: React.CSSProperties = {
  padding: '8px 10px', borderBottom: '1px solid var(--border)',
  fontSize: '.8rem', color: 'var(--text2)', verticalAlign: 'top',
}

export function ScheduleTable({ plan, statuses, todayKey, selected, onSelect }: Props) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 820 }}>
        <thead>
          <tr style={{ background: 'var(--glass-bg)' }}>
            <th style={th}>التاريخ</th>
            <th style={th}>النوع</th>
            <th style={th}>الكتاب · القسم · الدروس</th>
            <th style={th}>عدد</th>
            <th style={th}>دروس</th>
            <th style={th}>مراجعة</th>
            <th style={th}>استراحة</th>
            <th style={th}>الإجمالي</th>
            <th style={th}>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {plan.days.map((d) => {
            const tl = buildTimeline(d, plan.config)
            const ks = KIND_STYLE[d.kind]
            const isToday = d.date === todayKey
            const isSel = d.date === selected
            // من مصدر الحقيقة، لا رقم ثابت — يتغيّر مع نموذج المدّة
            const lessonMin = sumLessonMinutes(d.lessons, plan.config.durationModel)
            const reviewMin = d.reviews.reduce((a, r) => a + r.minutes, 0)
              + d.sweeps.reduce((a, s) => a + s.minutes, 0)
            const doneCount = d.lessons.filter((id) => statusOf(statuses, id) !== 'new').length
            const dayDone = d.lessons.length > 0 && doneCount === d.lessons.length

            const statusText = d.lessons.length === 0
              ? (d.kind === 'deadline' ? '—' : 'مراجعة فقط')
              : dayDone ? `مكتمل ${doneCount}/${d.lessons.length}`
              : doneCount > 0 ? `جارٍ ${doneCount}/${d.lessons.length}`
              : d.date < todayKey ? `متأخّر 0/${d.lessons.length}`
              : `مجدول 0/${d.lessons.length}`

            const statusColor = dayDone ? 'var(--green)'
              : doneCount > 0 ? 'var(--amber)'
              : d.lessons.length > 0 && d.date < todayKey ? 'var(--red)'
              : 'var(--muted)'

            return (
              <tr
                key={d.date}
                onClick={() => onSelect(d.date)}
                style={{
                  cursor: 'pointer',
                  background: isSel ? 'var(--orange-l)' : isToday ? 'var(--glass-bg)' : undefined,
                  outline: isToday ? '1px solid var(--orange-m)' : undefined,
                }}
              >
                <td style={{ ...td, whiteSpace: 'nowrap', color: 'var(--text)', fontWeight: isToday ? 700 : 500 }}>
                  {formatDayAr(d.date)}
                  {isToday && <span style={{ color: 'var(--orange)', fontSize: '.7rem' }}> · اليوم</span>}
                </td>
                <td style={td}>
                  <span
                    style={{
                      background: ks.soft, color: ks.color, borderRadius: 7,
                      padding: '2px 8px', fontSize: '.7rem', fontWeight: 600, whiteSpace: 'nowrap',
                    }}
                  >
                    {ks.label}{d.learnIndex ? ` ${d.learnIndex}` : ''}
                  </span>
                </td>
                <td style={{ ...td, minWidth: 210 }}>
                  {d.lessons.length > 0 ? compactLessonRange(d.lessons) : '—'}
                  {(d.reviews.length > 0 || d.sweeps.length > 0) && (
                    <div style={{ fontSize: '.7rem', color: 'var(--amber)', marginTop: 2 }}>
                      🔁 {[...d.reviews.map((r) => `${sectionShort(r.sectionId)}(+${r.stage === 1 ? 1 : r.stage === 2 ? 3 : 7}ي)`),
                          ...d.sweeps.map((s) => `${sectionShort(s.sectionId)}(كنس)`)].join('، ')}
                    </div>
                  )}
                </td>
                <td style={{ ...td, fontFamily: 'var(--font-latin)' }}>{d.lessons.length || '—'}</td>
                <td style={{ ...td, fontFamily: 'var(--font-latin)' }}>{lessonMin || '—'}</td>
                <td style={{ ...td, fontFamily: 'var(--font-latin)' }}>
                  {reviewMin + d.mockMinutes + d.weakRepairMinutes || '—'}
                </td>
                <td style={{ ...td, fontFamily: 'var(--font-latin)' }}>{tl.breakMinutes || '—'}</td>
                <td style={{ ...td, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                  {tl.wallMinutes > 0 ? formatMinutesAr(tl.wallMinutes) : '—'}
                </td>
                <td style={{ ...td, color: statusColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {statusText}
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr style={{ background: 'var(--glass-bg)' }}>
            <td style={{ ...td, fontWeight: 700, color: 'var(--text)' }} colSpan={3}>
              الإجمالي — {plan.totals.windowDays} يومًا
            </td>
            <td style={{ ...td, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-latin)' }}>
              {plan.totals.totalLessons}
            </td>
            <td style={{ ...td, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-latin)' }}>
              {plan.totals.lessonMinutes}
            </td>
            <td style={{ ...td, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-latin)' }}>
              {plan.totals.spacedReviewMinutes + plan.totals.sweepMinutes + plan.totals.mockMinutes + plan.totals.weakRepairMinutes}
            </td>
            <td style={{ ...td, fontWeight: 700, color: 'var(--text)', fontFamily: 'var(--font-latin)' }}>
              {plan.totals.breakMinutes}
            </td>
            <td style={{ ...td, fontWeight: 700, color: 'var(--orange)', whiteSpace: 'nowrap' }}>
              {formatMinutesAr(plan.totals.wallMinutes)}
            </td>
            <td style={td} />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
