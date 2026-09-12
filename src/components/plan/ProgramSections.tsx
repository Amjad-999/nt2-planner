import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { CURRICULUM_BOOKS, makeMinutesResolver } from '@/data/curriculum'
import { isCovered, statusOf, type LessonBook } from '@/features/plan/progress'
import { formatMinutes } from '@/features/plan/timer'
import { AR_LESSON, countAr } from '@/lib/arabicCount'

/**
 * الكتب والأقسام — وتعليم قسم كامل منجزًا بنقرة واحدة.
 *
 * Without this there is no honest way to enter work finished before the program
 * was switched on: the alternative is clicking through dozens of lessons, and
 * the alternative to that is the app inventing progress the learner never
 * confirmed. Marking is reversible, which is what makes it safe.
 */

const BTN: React.CSSProperties = {
  minHeight: 'var(--tap-min)', padding: '5px 12px', borderRadius: 'var(--r-sm)', cursor: 'pointer',
  fontFamily: 'inherit', fontSize: 'var(--text-sm)',
  background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)',
}

function SectionRow({ sectionId, title, lessonIds, lessons, minutesOf }: {
  sectionId: string
  title: string
  lessonIds: string[]
  lessons: LessonBook
  minutesOf: (id: string) => number
}) {
  const setSectionStatus = useAppStore((s) => s.setSectionStatus)
  const done = lessonIds.filter((id) => isCovered(statusOf(lessons, id))).length
  const all = done === lessonIds.length
  const minutes = lessonIds.reduce((s, id) => s + minutesOf(id), 0)

  return (
    <li style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap',
      padding: '9px 12px', borderRadius: 'var(--r-sm)',
      background: 'var(--btn-bg)', border: '1px solid var(--border)',
      borderInlineStart: `3px solid ${all ? 'var(--green)' : done > 0 ? 'var(--amber)' : 'var(--border2)'}`,
    }}>
      {/* الحالة مقرونة برمز دائمًا، فلا يحملها اللون وحده */}
      <span aria-hidden style={{ color: all ? 'var(--green-text)' : done > 0 ? 'var(--amber-text)' : 'var(--text2)' }}>
        {all ? '✔' : done > 0 ? '◐' : '○'}
      </span>
      <span style={{ flex: '1 1 200px', fontSize: 'var(--text-sm)', color: 'var(--text)' }}>{title}</span>
      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', whiteSpace: 'nowrap' }}>
        {done} / {lessonIds.length} · {formatMinutes(minutes)}
      </span>
      <button
        type="button"
        onClick={() => setSectionStatus(sectionId, all ? 'new' : 'done')}
        aria-pressed={all}
        style={{
          ...BTN,
          background: all ? 'var(--green-l)' : 'transparent',
          border: `1px solid ${all ? 'var(--green)' : 'var(--border2)'}`,
          color: all ? 'var(--green-text)' : 'var(--text2)',
        }}
      >
        {all ? 'ألغِ التعليم' : 'علّم القسم منجزًا'}
      </button>
    </li>
  )
}

export function ProgramSections() {
  const lessons = useAppStore((s) => s.studyProgram.lessons)
  const lessonMinutes = useAppStore((s) => s.studyProgram.lessonMinutes)
  const setBookLessonMinutes = useAppStore((s) => s.setBookLessonMinutes)
  const [open, setOpen] = useState(false)
  const minutesOf = makeMinutesResolver(lessonMinutes)

  const totalDone = CURRICULUM_BOOKS
    .flatMap((b) => b.sections.flatMap((s) => s.lessonIds))
    .filter((id) => isCovered(statusOf(lessons, id))).length

  return (
    <section
      aria-label="الكتب والأقسام"
      style={{
        padding: '18px 22px 20px', marginBottom: 'var(--sp-4)',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', boxShadow: 'var(--elev-1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>الكتب والأقسام</h3>
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} style={{ ...BTN, minHeight: 'var(--tap-min)' }}>
          {open ? 'أخفِ الأقسام' : 'اعرض الأقسام'}
        </button>
      </div>
      <p style={{ margin: '8px 0 0', fontSize: 'var(--text-sm)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)' }}>
        {countAr(totalDone, AR_LESSON)} مغطّى. علّم هنا ما أنجزتَه قبل تفعيل البرنامج، فيُحذف تلقائيًّا من الجدول.
      </p>

      {open && (
        <div style={{ marginTop: 'var(--sp-3)', display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
          {CURRICULUM_BOOKS.map((b) => {
            const bookLessons = b.sections.flatMap((s) => s.lessonIds)
            const bookDone = bookLessons.filter((id) => isCovered(statusOf(lessons, id))).length
            const override = lessonMinutes[b.id]
            return (
              <div key={b.id}>
                <div style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  gap: 'var(--sp-3)', flexWrap: 'wrap', marginBottom: 'var(--sp-2)',
                  paddingInlineStart: 10, borderInlineStart: `3px solid ${b.accent}`,
                }}>
                  <strong style={{ color: 'var(--text)', fontSize: 'var(--text-base)' }}>{b.title}</strong>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
                    {bookDone} / {bookLessons.length}
                  </span>
                </div>

                <label style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap',
                  fontSize: 'var(--text-sm)', color: 'var(--text2)', marginBottom: 'var(--sp-2)',
                }}>
                  مدّة الدرس في هذا الكتاب
                  <input
                    type="number" min={5} max={120}
                    value={override ?? b.minutesPerLesson}
                    onChange={(e) => {
                      const n = parseInt(e.target.value)
                      setBookLessonMinutes(b.id, isNaN(n) ? null : n)
                    }}
                    aria-label={`مدّة الدرس بالدقائق في ${b.title}`}
                    style={{
                      width: 76, minHeight: 'var(--tap-min)', padding: '5px 8px', borderRadius: 'var(--r-xs)',
                      border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)',
                      fontFamily: 'inherit', fontSize: 'var(--text-sm)',
                    }}
                  />
                  دقيقة
                  {override !== undefined && override !== b.minutesPerLesson && (
                    <button type="button" onClick={() => setBookLessonMinutes(b.id, null)} style={BTN}>
                      أعِد الافتراضي
                    </button>
                  )}
                </label>

                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {b.sections.map((s) => (
                    <SectionRow
                      key={s.id}
                      sectionId={s.id}
                      title={s.title}
                      lessonIds={s.lessonIds}
                      lessons={lessons}
                      minutesOf={minutesOf}
                    />
                  ))}
                </ul>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
