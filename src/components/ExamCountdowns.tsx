import { useEffect, useState } from 'react'
import { useNow } from '@/hooks/useNow'
import { getDaysLeft } from '@/store/useAppStore'

/**
 * امتحانات الاندماج الهولندي (Inburgering) — 5 امتحانات مستقلّة.
 * كل خانة: العدّاد + زر تعديل التاريخ + مفتاح «نجاح».
 * الحالة محفوظة مؤقّتًا في localStorage (تُربط بـ Supabase لاحقًا).
 */
interface Exam {
  id: string
  nameNL: string
  nameAR: string
  daysLeft: number
  passed: boolean
  examDate: string | null
}

const DEFAULT_EXAMS: Exam[] = [
  { id: 'lezen',     nameNL: 'Lezen',     nameAR: 'القراءة',  daysLeft: 57, passed: false, examDate: null },
  { id: 'luisteren', nameNL: 'Luisteren', nameAR: 'الاستماع', daysLeft: 44, passed: false, examDate: null },
  { id: 'schrijven', nameNL: 'Schrijven', nameAR: 'الكتابة',  daysLeft: 30, passed: false, examDate: null },
  { id: 'spreken',   nameNL: 'Spreken',   nameAR: 'التحدث',   daysLeft: 60, passed: false, examDate: null },
  { id: 'knm',       nameNL: 'KNM',       nameAR: 'المعرفة',  daysLeft: 25, passed: false, examDate: null },
]

const STORAGE_KEY = 'nt2:inburgering-exams'

/* ── glassmorphism الحالة الناجحة (كما في المواصفات) ── */
const PASS_BG     = 'rgba(34, 197, 94, 0.15)'
const PASS_BORDER = '1px solid rgba(34, 197, 94, 0.3)'
const PASS_TEXT   = '#166534'

function isoToInputDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/* دمج المحفوظ مع الافتراضي بحيث تبقى الأسماء مصدرها الكود، والحالة مصدرها التخزين */
function loadExams(): Exam[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_EXAMS
    const saved = JSON.parse(raw) as Partial<Exam>[]
    const byId = new Map(saved.map((e) => [e.id, e]))
    return DEFAULT_EXAMS.map((d) => {
      const s = byId.get(d.id)
      return s
        ? { ...d, daysLeft: s.daysLeft ?? d.daysLeft, passed: !!s.passed, examDate: s.examDate ?? null }
        : d
    })
  } catch {
    return DEFAULT_EXAMS
  }
}

const SH = {
  fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
  color: 'var(--text)', margin: '24px 0 12px', display: 'flex', alignItems: 'center', gap: 10,
} as const

export function ExamCountdowns() {
  const [exams, setExams] = useState<Exam[]>(loadExams)
  const [editingId, setEditingId] = useState<string | null>(null)
  const now = useNow()

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(exams)) } catch { /* التخزين غير متاح */ }
  }, [exams])

  const update = (id: string, patch: Partial<Exam>) =>
    setExams((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)))

  const setDate = (id: string, value: string) => {
    if (!value) { update(id, { examDate: null }); setEditingId(null); return }
    const chosen = new Date(`${value}T09:00:00`)
    update(id, { examDate: chosen.toISOString(), daysLeft: getDaysLeft(chosen.toISOString()) ?? 0 })
    setEditingId(null)
  }

  const displayDays = (e: Exam) => (e.examDate ? getDaysLeft(e.examDate) ?? e.daysLeft : e.daysLeft)

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
                    onChange={(ev) => setDate(e.id, ev.target.value)}
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
                  onClick={() => { update(e.id, { passed: !passed }); if (!passed) setEditingId(null) }}
                  aria-pressed={passed}
                  aria-label={passed ? `إلغاء نجاح ${e.nameNL}` : `تحديد نجاح ${e.nameNL}`}
                  style={{
                    flex: 1, cursor: 'pointer', fontSize: '.72rem', fontWeight: 700, borderRadius: 8, padding: '5px 8px',
                    background: passed ? 'rgba(34, 197, 94, 0.25)' : 'var(--btn-bg)',
                    border: passed ? '1px solid rgba(34, 197, 94, 0.5)' : '1px solid var(--btn-border)',
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
