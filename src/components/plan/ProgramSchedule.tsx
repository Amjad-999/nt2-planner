import { useState } from 'react'
import { bookTitle, lessonById, sectionTitle } from '@/data/curriculum'
import { buildDayBlocks } from '@/features/plan/blocks'
import type { DayKind, ScheduledDay } from '@/features/plan/schedule'
import { formatMinutes } from '@/features/plan/timer'
import { AR_DAY, AR_LESSON, countAr } from '@/lib/arabicCount'
import { isCovered, statusOf, type LessonBook } from '@/features/plan/progress'

/**
 * الجدول الكامل: كل يوم بكتابه وقسمه وأرقام دروسه وأوقاته.
 *
 * Rendered from the live schedule, so after a slip the table shows the plan the
 * user is actually on — not the one they were on when they started.
 */

const KIND_AR: Record<DayKind, string> = {
  ramp: 'بداية مخفّفة',
  learn: 'يوم تعلّم',
  consolidate: 'تثبيت',
  mock: 'امتحان تجريبي',
  final: 'يوم خفيف',
}

/** رمز لكل نوع يوم — لا يُنقل المعنى باللون وحده. */
const KIND_ICON: Record<DayKind, string> = {
  ramp: '◔', learn: '●', consolidate: '↻', mock: '◆', final: '☾',
}

const KIND_COLOR: Record<DayKind, string> = {
  ramp: 'var(--blue)', learn: 'var(--orange)', consolidate: 'var(--purple)',
  mock: 'var(--amber)', final: 'var(--green)',
}

const TH: React.CSSProperties = {
  padding: '9px 10px', textAlign: 'start', borderBottom: '1px solid var(--border)',
  color: 'var(--muted)', fontWeight: 'var(--fw-medium)', fontSize: 'var(--text-xs)', letterSpacing: '.3px', whiteSpace: 'nowrap',
}

const TD: React.CSSProperties = {
  padding: '9px 10px', borderBottom: '1px solid var(--border)', fontSize: 'var(--text-sm)', color: 'var(--text2)',
}

function lessonRange(day: ScheduledDay): { book: string; section: string; nums: string } {
  if (day.lessonIds.length === 0) return { book: '—', section: '—', nums: '—' }
  const first = lessonById(day.lessonIds[0])
  const last = lessonById(day.lessonIds[day.lessonIds.length - 1])
  if (!first || !last) return { book: '—', section: '—', nums: '—' }
  const section = first.sectionId === last.sectionId
    ? sectionTitle(first.sectionId)
    : `${sectionTitle(first.sectionId)} ← ${sectionTitle(last.sectionId)}`
  return { book: bookTitle(first.bookId), section, nums: `${first.ordinal}-${last.ordinal}` }
}

export function ProgramSchedule({ days, lessons, todayKey, minutesOf }: {
  days: ScheduledDay[]
  lessons: LessonBook
  todayKey: string
  /* نفس دالّة حلّ المدّة التي تستخدمها بقيّة الشاشة: بدونها يعرض هذا الجدول
     أزمنةَ المدّة الافتراضية بينما تعرض المؤشّرات المدّة التي ضبطها المستخدم. */
  minutesOf: (lessonId: string) => number
}) {
  const [open, setOpen] = useState(false)

  const totals = days.reduce(
    (acc, d) => {
      const p = buildDayBlocks(d, minutesOf)
      acc.lessons += d.lessonIds.length
      acc.focus += p.focusMinutes
      acc.wall += p.totalMinutes
      return acc
    },
    { lessons: 0, focus: 0, wall: 0 },
  )

  return (
    <section
      aria-label="الجدول الكامل"
      style={{
        padding: '18px 22px 20px', marginBottom: 'var(--sp-4)',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', boxShadow: 'var(--elev-1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>
          الجدول الكامل — {countAr(days.length, AR_DAY)}
        </h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          style={{
            minHeight: 40, padding: '6px 14px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 'var(--text-sm)',
            background: 'var(--btn-bg)', border: '1px solid var(--border2)', color: 'var(--text2)',
          }}
        >
          {open ? 'أخفِ الجدول' : 'اعرض الجدول'}
        </button>
      </div>

      <p style={{ margin: '8px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)' }}>
        {countAr(totals.lessons, AR_LESSON)} · تركيز {formatMinutes(totals.focus)} · بالوقت الجداري {formatMinutes(totals.wall)}
      </p>

      {open && (
        <div style={{ overflowX: 'auto', marginTop: 'var(--sp-3)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 760 }}>
            <thead>
              <tr>
                {['اليوم', 'النوع', 'الكتاب', 'القسم', 'أرقام الدروس', 'الدروس', 'مراجعة', 'استراحة', 'الإجمالي', 'الحالة'].map((h) => (
                  <th key={h} scope="col" style={TH}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {days.map((d) => {
                const p = buildDayBlocks(d, minutesOf)
                const { book, section, nums } = lessonRange(d)
                const isToday = d.dayKey === todayKey
                const doneCount = d.lessonIds.filter((id) => isCovered(statusOf(lessons, id))).length
                const newMins = p.blocks.filter((b) => b.kind === 'new').reduce((s, b) => s + b.minutes, 0)
                const reviewMins = p.blocks
                  .filter((b) => b.kind === 'recall' || b.kind === 'review' || b.kind === 'consolidate')
                  .reduce((s, b) => s + b.minutes, 0)
                const state = d.lessonIds.length === 0
                  ? '—'
                  : doneCount === d.lessonIds.length ? 'مكتمل'
                  : doneCount > 0 ? `${doneCount}/${d.lessonIds.length}`
                  : 'لم يبدأ'
                return (
                  <tr key={d.dayKey} style={{ background: isToday ? 'var(--orange-l)' : 'transparent' }}>
                    <td style={{ ...TD, color: 'var(--text)', fontWeight: isToday ? 700 : 500, whiteSpace: 'nowrap' }}>
                      {d.dayKey}{isToday && <span style={{ color: 'var(--orange-text)' }}> · اليوم</span>}
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      <span aria-hidden style={{ color: KIND_COLOR[d.kind], marginInlineEnd: 'var(--sp-1)' }}>{KIND_ICON[d.kind]}</span>
                      {KIND_AR[d.kind]}
                    </td>
                    <td style={TD}>{book}</td>
                    <td style={TD}>{section}</td>
                    <td style={{ ...TD, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{nums}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>
                      {d.lessonIds.length > 0 ? `${d.lessonIds.length} × ${formatMinutes(newMins / d.lessonIds.length)}` : '—'}
                    </td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{reviewMins > 0 ? `${reviewMins} د` : '—'}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{p.breakMinutes} د</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap', color: 'var(--text)' }}>{formatMinutes(p.totalMinutes)}</td>
                    <td style={{ ...TD, whiteSpace: 'nowrap' }}>{state}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
