import { useState } from 'react'
import { useNow } from '@/hooks/useNow'
import { useAppStore, getDaysLeft } from '@/store/useAppStore'
import type { InburgeringExam } from '@/store/types'

/**
 * امتحانات الاندماج الهولندي (Inburgering) — 5 امتحانات مستقلّة.
 * كل خانة: العدّاد + زر تعديل التاريخ + مفتاح «نجاح».
 * الحالة تُقرأ من المتجر (useAppStore) وتُزامَن سحابيًّا عبر Supabase تلقائيًّا.
 */

/* ── glassmorphism الحالة الناجحة — الألوان من tokens.css فتتكيّف مع الثيم
   (النص الداكن #166534 غير مقروء على الأخضر في الوضع الداكن؛ التوكِن يبدّله) ── */
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

const SH = {
  fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
  color: 'var(--text)', margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 10,
} as const

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
      <h2 id="inburgering-heading" style={SH}>
        <span style={{ color: 'var(--orange)' }}>🎓</span> امتحانات الاندماج
      </h2>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3" style={{ marginBottom: 18 }}>
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
                  fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', lineHeight: 1.2,
                  color: passed ? PASS_TEXT : 'var(--text)',
                }}
              >
                {e.nameNL}
              </div>
              <div style={{ fontSize: '.74rem', color: passed ? PASS_TEXT : 'var(--muted)', marginTop: 2, opacity: passed ? 0.85 : 1 }}>
                ({e.nameAR})
              </div>

              {/* العدّاد أو حالة النجاح */}
              <div style={{ marginTop: 12, marginBottom: 12, minHeight: 40 }}>
                {passed ? (
                  <div style={{ fontSize: '.95rem', fontWeight: 700, color: PASS_TEXT, display: 'flex', alignItems: 'center', gap: 6 }}>
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
                      width: '100%', padding: '6px 8px', border: '1px solid var(--orange)', borderRadius: 8,
                      background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: '.82rem', outline: 'none',
                    }}
                  />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1.65rem', lineHeight: 1, color: 'var(--text)' }}>
                      {days}
                    </span>
                    <span style={{ fontSize: '.72rem', color: 'var(--muted)' }}>يوم متبقٍ</span>
                  </div>
                )}
              </div>

              {/* الأزرار */}
              <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
                <button
                  type="button"
                  disabled={passed}
                  onClick={() => setEditingId((cur) => (cur === e.id ? null : e.id))}
                  aria-label={`تعديل تاريخ امتحان ${e.nameNL}`}
                  style={{
                    flex: 1, cursor: passed ? 'not-allowed' : 'pointer', fontSize: '.72rem', fontWeight: 600,
                    borderRadius: 8, padding: '5px 8px', background: 'var(--btn-bg)',
                    border: '1px solid var(--btn-border)', color: 'var(--orange)',
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
                    flex: 1, cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, borderRadius: 8, padding: '5px 8px',
                    background: passed ? 'var(--pass-btn-bg)' : 'var(--btn-bg)',
                    border: passed ? '1px solid var(--pass-btn-border)' : '1px solid var(--btn-border)',
                    color: passed ? PASS_TEXT : 'var(--green)', boxShadow: 'var(--elev-1)',
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
