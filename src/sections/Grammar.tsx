import { useState, useEffect, Suspense, lazy } from 'react'
import { LESSONS } from '@/data/lessons'

// Lazy-load the heavy Markdown renderer so it stays out of the initial bundle
const Lesson = lazy(() =>
  import('@/components/Lesson').then(m => ({ default: m.Lesson }))
)

function LessonLoader() {
  return (
    <div style={{ padding: '32px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '.9rem' }}>
      ⏳ جارٍ التحميل…
    </div>
  )
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default function Grammar(_: {}) {
  const [activeId, setActiveId] = useState(LESSONS[0].id)
  const [markdown, setMarkdown] = useState<string | null>(null)
  const [loading, setLoading]   = useState(false)

  const activeMeta = LESSONS.find(l => l.id === activeId) ?? LESSONS[0]

  useEffect(() => {
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
      <p style={{ fontSize: '.88rem', color: 'var(--text2)', marginBottom: 20, lineHeight: 1.6 }}>
        دروس قواعد هولندية مختصرة ومُعايَرة على مستوى B1 — اقرأها قبل جلسة المراجعة.
      </p>

      {/* Lesson selector */}
      <div
        role="tablist"
        aria-label="اختر درسًا"
        style={{
          display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24,
        }}
      >
        {LESSONS.map(lesson => {
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
    </div>
  )
}
