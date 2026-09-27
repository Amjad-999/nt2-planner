import { useState } from 'react'
import { useNow } from '@/hooks/useNow'
import { useAppStore, getDaysLeft } from '@/store/useAppStore'
import type { InburgeringExam } from '@/store/types'

/**
 * امتحانات الاندماج الهولندي (Inburgering) — 5 امتحانات مستقلّة.
 * كل خانة: العدّاد + زر تعديل التاريخ + مفتاح «نجاح».
 * الحالة تُقرأ من المتجر (useAppStore) وتُزامَن سحابيًّا عبر Supabase تلقائيًّا.
 */

/* ── glassmorphism الحالة الناجحة — الألوان من tokens.css فتتكيّف مع الثيم.
   --pass-text صار يشير إلى --green-text (وسم النصّ) لا إلى --green (وسم
   التعبئة): الأخير قِيس 4.17:1 فوق --pass-bg، تحت AA. أمّا زرّ «ناجح» فسطحه
   --pass-btn-bg أكثف (.22) ويُسقط حتى --green-text إلى 4.21:1، فنصّه --text
   وتحمل الحالةَ الأيقونةُ ✅ و aria-pressed. ── */
const PASS_BG     = 'var(--pass-bg)'
const PASS_BORDER = '1px solid var(--pass-border)'
const PASS_TEXT   = 'var(--pass-text)'

function isoToInputDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function ExamCountdowns() {
  const exams       = useAppStore((s) => s.inburgeringExams)
  const setPassed   = useAppStore((s) => s.setInburgeringExamPassed)
  const setExamDate = useAppStore((s) => s.setInburgeringExamDate)
  const [editingId, setEditingId] = useState<string | null>(null)
  const now = useNow()

  const applyDate = (id: string, value: string) => {
    setExamDate(id, value ? new Date(`${value}T09:00:00`).toISOString() : null)
    setEditingId(null)
  }

  const displayDays = (e: InburgeringExam) => (e.examDate ? getDaysLeft(e.examDate) ?? e.daysLeft : e.daysLeft)

  return (
    <section aria-labelledby="inburgering-heading">
      <h2 id="inburgering-heading" className="section-title section-title--spaced">
        <span style={{ color: 'var(--orange-text)' }}>🎓</span> امتحانات الاندماج
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" style={{ marginBottom: 'var(--sp-4)' }}>
        {exams.map((e) => {
          const passed = e.passed
          const editing = editingId === e.id && !passed
          const days = displayDays(e)

          return (
            <div
              key={e.id}
              className="relative overflow-hidden rounded-card-sm flex flex-col"
              style={{
                padding: '14px',
                background: passed ? PASS_BG : 'var(--glass-bg)',
                backdropFilter: passed ? 'blur(10px)' : 'blur(16px) saturate(1.3)',
                WebkitBackdropFilter: passed ? 'blur(10px)' : 'blur(16px) saturate(1.3)',
                border: passed ? PASS_BORDER : '1px solid var(--glass-border)',
                boxShadow: passed ? 'var(--elev-1)' : 'var(--elev-1), inset 0 1px 0 var(--glass-hi)',
                transition: 'background .25s ease, border-color .25s ease',
              }}
            >
              {/* اسم الامتحان */}
              <div
                style={{
                  fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-cta)', fontSize: 'var(--text-base)', lineHeight: 'var(--lh-heading)',
                  color: passed ? PASS_TEXT : 'var(--text)',
                }}
              >
                {e.nameNL}
              </div>
              {/* لا opacity على نصّ: تخفيت لون معتمد أصلًا أسقط التباين إلى
                  3.25:1. الحالة الثانوية تُحمل بوسم النصّ الثانوي نفسه. */}
              <div style={{ fontSize: 'var(--text-2xs)', color: passed ? 'var(--text2)' : 'var(--muted)', marginTop: 'var(--sp-0)' }}>
                ({e.nameAR})
              </div>

              {/* العدّاد أو حالة النجاح */}
              <div style={{ marginTop: 'var(--sp-3)', marginBottom: 'var(--sp-3)', minHeight: 40 }}>
                {passed ? (
                  <div style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-cta)', color: PASS_TEXT, display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <span aria-hidden="true">✅</span> تمّ النجاح
                  </div>
                ) : editing ? (
                  <input
                    autoFocus
                    type="date"
                    defaultValue={isoToInputDate(e.examDate)}
                    min={isoToInputDate(new Date(now).toISOString())}
                    onChange={(ev) => applyDate(e.id, ev.target.value)}
                    onBlur={() => setEditingId(null)}
                    aria-label={`تاريخ امتحان ${e.nameNL}`}
                    style={{
                      width: '100%', padding: '6px 8px', border: '1px solid var(--orange)', borderRadius: 'var(--r-xs)',
                      background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', outline: 'none',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 'var(--sp-2)' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-cta)', fontSize: 'var(--text-2xl)', lineHeight: 'var(--lh-none)', color: 'var(--text)' }}>
                      {days}
                    </span>
                    <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)' }}>يوم متبقٍ</span>
                  </div>
                )}
              </div>

              {/* الأزرار */}
              <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'auto' }}>
                <button
                  type="button"
                  disabled={passed}
                  onClick={() => setEditingId((cur) => (cur === e.id ? null : e.id))}
                  aria-label={`تعديل تاريخ امتحان ${e.nameNL}`}
                  style={{
                    flex: 1, cursor: passed ? 'not-allowed' : 'pointer', fontSize: 'var(--text-2xs)', fontWeight: 'var(--fw-heading)',
                    borderRadius: 'var(--r-xs)', padding: '5px 8px', background: 'var(--btn-bg)',
                    border: '1px solid var(--btn-border)', color: 'var(--orange-text)',
                    opacity: passed ? 0.45 : 1, boxShadow: 'var(--elev-1)',
                  }}
                >
                  ✎ تعديل
                </button>
                <button
                  type="button"
                  onClick={() => { setPassed(e.id, !passed); if (!passed) setEditingId(null) }}
                  aria-pressed={passed}
                  aria-label={passed ? `إلغاء نجاح ${e.nameNL}` : `تحديد نجاح ${e.nameNL}`}
                  style={{
                    flex: 1, cursor: 'pointer', fontSize: 'var(--text-2xs)', fontWeight: 'var(--fw-cta)', borderRadius: 'var(--r-xs)', padding: '5px 8px',
                    background: passed ? 'var(--pass-btn-bg)' : 'var(--btn-bg)',
                    border: passed ? '1px solid var(--pass-btn-border)' : '1px solid var(--btn-border)',
                    color: passed ? 'var(--text)' : 'var(--green-text)', boxShadow: 'var(--elev-1)',
                  }}
                >
                  {passed ? '✅ ناجح' : 'نجاح'}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}
