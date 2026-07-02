import { useState, useEffect, Suspense, lazy } from 'react'
import { LESSONS } from '@/data/lessons'
import { GrammarExercises } from '@/components/GrammarExercises'
import type { Level } from '@/store/types'

// Lazy-load the heavy Markdown renderer so it stays out of the initial bundle
const Lesson = lazy(() =>
  import('@/components/Lesson').then(m => ({ default: m.Lesson }))
)

// المستويات — كل مستوى في قسمه الخاصّ
const LEVELS: { key: Level; label: string; sub: string }[] = [
  { key: 'A1', label: 'A1', sub: 'المبتدئون' },
  { key: 'A2', label: 'A2', sub: 'متوسّط' },
  { key: 'B1', label: 'B1', sub: 'متقدّم' },
  { key: 'B2', label: 'B2', sub: 'Staatsexamen' },
]

function lessonsOf(level: Level) {
  return LESSONS.filter(l => (l.level ?? 'B1') === level)
}

function LessonLoader() {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '.9rem' }}>
      ⏳ جارٍ التحميل…
    </div>
  )
}

export default function Grammar() {
  const [level, setLevel] = useState<Level>('A1')
  const [activeId, setActiveId] = useState(lessonsOf('A1')[0].id)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const levelLessons = lessonsOf(level)
  const activeMeta = LESSONS.find(l => l.id === activeId) ?? LESSONS[0]

  function pickLevel(lv: Level) {
    setLevel(lv)
    const first = lessonsOf(lv)[0]
    if (first) setActiveId(first.id)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- مؤثّر تحميل غير متزامن للدرس
    setLoading(true)
    setMarkdown(null)
    activeMeta.file()
      .then(m => { setMarkdown(m.default); setLoading(false) })
      .catch(() => { setMarkdown('⚠️ تعذّر تحميل الدرس.'); setLoading(false) })
  }, [activeId, activeMeta])

  return (
    <div dir="rtl" style={{ padding: '24px 28px 80px', maxWidth: 820, margin: '0 auto' }}>
      {/* Header */}
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
        color: 'var(--text)', margin: '0 0 4px',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ color: 'var(--orange)' }}>📖</span> قواعد ونصائح
      </h2>
      <p style={{ fontSize: '.88rem', color: 'var(--text2)', marginBottom: 18, lineHeight: 1.6 }}>
        كل المستويات A1 · A2 · B1 · B2 — اختر مستوًى ثمّ درسًا، وبعد كل درس تمارين تفاعلية.
      </p>

      {/* Level selector — كل مستوى قسم مستقلّ */}
      <div role="tablist" aria-label="اختر المستوى"
        style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {LEVELS.map(lv => {
          const on = lv.key === level
          const count = lessonsOf(lv.key).length
          return (
            <button key={lv.key} role="tab" aria-selected={on}
              onClick={() => pickLevel(lv.key)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                padding: '8px 16px', minWidth: 92,
                border: `1px solid ${on ? 'var(--orange)' : 'var(--glass-border)'}`,
                borderRadius: 12,
                background: on ? 'var(--orange)' : 'var(--glass-bg)',
                color: on ? '#fff' : 'var(--text2)',
                fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: on ? 700 : 600,
                transition: 'border-color .15s, background .15s',
              }}>
              <span style={{ fontSize: '.95rem', fontWeight: 800 }}>{lv.label}</span>
              <span style={{ fontSize: '.66rem', opacity: on ? 0.9 : 0.7 }}>{lv.sub} · {count}</span>
            </button>
          )
        })}
      </div>

      {/* Lesson selector — دروس المستوى المختار فقط */}
      <div role="tablist" aria-label="اختر درسًا"
        style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {levelLessons.map(lesson => {
          const active = lesson.id === activeId
          return (
            <button
              key={lesson.id}
              role="tab"
              aria-selected={active}
              aria-controls={`lesson-panel-${lesson.id}`}
              id={`lesson-tab-${lesson.id}`}
              onClick={() => setActiveId(lesson.id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start',
                gap: 2, padding: '10px 14px',
                border: `1px solid ${active ? 'var(--orange)' : 'var(--glass-border)'}`,
                borderRadius: 12,
                background: active ? 'var(--orange-l)' : 'var(--glass-bg)',
                backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                color: active ? 'var(--orange)' : 'var(--text2)',
                fontFamily: 'inherit', cursor: 'pointer',
                fontWeight: active ? 700 : 500,
                transition: 'border-color .15s, background .15s',
                minWidth: 140,
              }}
            >
              <span style={{ fontSize: '1.1rem' }} aria-hidden="true">{lesson.icon}</span>
              <span style={{ fontSize: '.85rem', fontWeight: active ? 700 : 600, lineHeight: 1.3 }}>
                {lesson.title}
              </span>
              <span style={{ fontSize: '.72rem', color: active ? 'var(--orange-d)' : 'var(--muted)', direction: 'ltr' }}>
                {lesson.subtitle}
              </span>
            </button>
          )
        })}
      </div>

      {/* Lesson content panel */}
      <div
        role="tabpanel"
        id={`lesson-panel-${activeId}`}
        aria-labelledby={`lesson-tab-${activeId}`}
        style={{
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
          border: '1px solid var(--glass-border)',
          borderRadius: 'var(--r)',
          padding: '24px 22px',
          boxShadow: 'var(--elev-1)',
          minHeight: 300,
        }}
      >
        {loading || markdown === null ? (
          <LessonLoader />
        ) : (
          <Suspense fallback={<LessonLoader />}>
            <Lesson markdown={markdown} />
          </Suspense>
        )}
      </div>

      {/* تمارين تفاعلية مرتبطة بالدرس الحالي — key يعيد الضبط عند تبديل الدرس */}
      <GrammarExercises key={activeId} lessonId={activeId} />
    </div>
  )
}
