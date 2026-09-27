import { useState, useEffect, Suspense, lazy, useRef } from 'react'
import { LESSONS } from '@/data/lessons'
import { GrammarExercises } from '@/components/GrammarExercises'
import { Callout } from '@/components/ui/Callout'
import { useAppStore } from '@/store/useAppStore'
import { grammarLessonProgress, recommendedGrammarLesson } from '@/features/grammar/progress'
import type { Level } from '@/store/types'

const Lesson = lazy(() => import('@/components/Lesson').then(m => ({ default: m.Lesson })))

const LEVELS: { key: Level; sub: string }[] = [
  { key: 'A1', sub: 'الأساسيات' },
  { key: 'A2', sub: 'الحياة اليومية' },
  { key: 'B1', sub: 'التعبير المستقل' },
  { key: 'B2', sub: 'للتوسّع' },
]

function lessonsOf(level: Level) {
  return LESSONS.filter(l => (l.level ?? 'B1') === level)
}

function LessonLoader() {
  return <p role="status" style={{ padding: 'var(--sp-8) 0', textAlign: 'center', color: 'var(--text2)' }}>جارٍ تحميل الدرس…</p>
}

export default function Grammar() {
  const progress = useAppStore(s => s.grammarProgress)
  const [activeId, setActiveId] = useState(() => recommendedGrammarLesson(progress).id)
  const [content, setContent] = useState<{ id: string; markdown: string | null; failed: boolean } | null>(null)
  const [retry, setRetry] = useState(0)
  const [catalogOpen, setCatalogOpen] = useState(false)
  const lessonPanel = useRef<HTMLElement>(null)
  const activeMeta = LESSONS.find(l => l.id === activeId) ?? LESSONS[0]
  const level = activeMeta.level ?? 'B1'
  const levelLessons = lessonsOf(level)
  const activeProgress = grammarLessonProgress(activeId, progress)
  const completed = levelLessons.filter(lesson => grammarLessonProgress(lesson.id, progress).complete).length
  const next = LESSONS.slice(LESSONS.findIndex(lesson => lesson.id === activeId) + 1)
    .find(lesson => !grammarLessonProgress(lesson.id, progress).complete)
  const loading = content?.id !== activeId

  function pickLesson(id: string, focus = false) {
    setActiveId(id)
    setCatalogOpen(false)
    if (focus) requestAnimationFrame(() => {
      lessonPanel.current?.focus({ preventScroll: true })
      lessonPanel.current?.scrollIntoView({ block: 'start' })
    })
  }

  useEffect(() => {
    let cancelled = false
    activeMeta.file()
      .then(m => { if (!cancelled) setContent({ id: activeMeta.id, markdown: m.default, failed: false }) })
      .catch(() => { if (!cancelled) setContent({ id: activeMeta.id, markdown: null, failed: true }) })
    return () => { cancelled = true }
  }, [activeMeta, retry])

  return (
    <div dir="rtl" className="page page--narrow">
      <h2 className="section-title" style={{ marginBottom: 'var(--sp-1)' }}>مسار القواعد</h2>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', marginBottom: 'var(--sp-4)', lineHeight: 'var(--lh-arabic)' }}>
        اقرأ القاعدة، جرّب الأمثلة، ثم حلّ التمارين. يُحفظ تقدّمك مع كل إجابة صحيحة.
      </p>

      <div role="group" aria-label="مستوى محتوى القواعد"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        {LEVELS.map(lv => {
          const selected = lv.key === level
          return (
            <button key={lv.key} type="button" aria-pressed={selected}
              onClick={() => pickLesson(recommendedGrammarLesson(progress, lessonsOf(lv.key)).id)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)', padding: 'var(--sp-3) var(--sp-1)', minHeight: 64,
                border: `1px solid ${selected ? 'var(--orange)' : 'var(--glass-border)'}`, borderRadius: 'var(--r-sm)',
                background: selected ? 'var(--orange-l)' : 'var(--glass-bg)', color: selected ? 'var(--orange-text)' : 'var(--text2)',
                fontFamily: 'inherit', cursor: 'pointer' }}>
              <span dir="ltr" style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-cta)' }}>{lv.key}</span>
              <span style={{ fontSize: 'var(--text-xs)' }}>{lv.sub}</span>
              {selected && <span className="sr-only">المستوى المعروض</span>}
            </button>
          )
        })}
      </div>

      <Callout tone={completed === levelLessons.length ? 'success' : 'info'} icon={completed === levelLessons.length ? '✓' : '📖'} style={{ marginBottom: 'var(--sp-4)' }}>
        <strong style={{ color: 'var(--text)' }}>{completed} من {levelLessons.length} دروس مكتملة التمارين</strong>
        <p style={{ margin: 0 }}>هذه مستويات المحتوى؛ إكمالها لا يُعدّ اختبارًا لتحديد مستواك اللغوي. يمكنك فتح أي درس أو العودة لمراجعته.</p>
      </Callout>

      <details open={catalogOpen} onToggle={event => setCatalogOpen(event.currentTarget.open)} style={{ marginBottom: 'var(--sp-4)' }}>
        <summary style={{ padding: 'var(--sp-3)', minHeight: 44, color: 'var(--text)', cursor: 'pointer', fontWeight: 'var(--fw-heading)' }}>
          فهرس دروس هذا المستوى
        </summary>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(210px, 100%), 1fr))', gap: 'var(--sp-2)', paddingTop: 'var(--sp-2)' }}>
          {levelLessons.map((lesson, index) => {
            const result = grammarLessonProgress(lesson.id, progress)
            const active = lesson.id === activeId
            return (
              <button key={lesson.id} type="button" aria-pressed={active} onClick={() => pickLesson(lesson.id, true)}
                style={{ textAlign: 'start', display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', padding: 'var(--sp-3)', minWidth: 0,
                  border: `1px solid ${active ? 'var(--orange)' : 'var(--glass-border)'}`, borderRadius: 'var(--r-sm)',
                  background: active ? 'var(--orange-l)' : 'var(--glass-bg)', color: 'var(--text)', cursor: 'pointer', fontFamily: 'inherit' }}>
                <span dir="auto" style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)' }}>{index + 1}. {lesson.title}</span>
                <span dir="ltr" lang="nl" style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>{lesson.subtitle}</span>
                <span style={{ fontSize: 'var(--text-xs)', color: result.complete ? 'var(--green-text)' : 'var(--text2)' }}>
                  {result.complete ? '✓ مكتمل · متاح للمراجعة' : active ? '● الدرس الحالي' : result.correct > 0 ? '◐ قيد التعلّم' : '○ متاح'}
                  {result.total > 0 && ` · ${result.correct}/${result.total}`}
                </span>
              </button>
            )
          })}
        </div>
      </details>

      <section ref={lessonPanel} tabIndex={-1} aria-labelledby="current-grammar-title" aria-busy={loading}
        style={{ scrollMarginTop: 'var(--sp-6)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r)', padding: 'var(--sp-5)', boxShadow: 'var(--elev-1)', minHeight: 240 }}>
        <p style={{ margin: '0 0 var(--sp-1)', color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>الدرس {levelLessons.findIndex(lesson => lesson.id === activeId) + 1} من {levelLessons.length}</p>
        <h3 id="current-grammar-title" dir="auto" style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--text-lg)', color: 'var(--text)' }}>{activeMeta.title}</h3>
        <p dir="ltr" lang="nl" style={{ margin: '0 0 var(--sp-4)', color: 'var(--text2)' }}>{activeMeta.subtitle}</p>
        {loading ? <LessonLoader /> : content?.failed ? (
          <Callout tone="danger" role="alert">
            <p style={{ margin: '0 0 var(--sp-2)' }}>تعذّر تحميل الدرس. تحقّق من الاتصال ثم حاول مجددًا.</p>
            <button type="button" className="btn-glass" onClick={() => { setContent(null); setRetry(value => value + 1) }}>إعادة المحاولة</button>
          </Callout>
        ) : (
          <Suspense fallback={<LessonLoader />}><Lesson markdown={content?.markdown ?? ''} /></Suspense>
        )}
      </section>

      {!loading && !content?.failed && <GrammarExercises key={activeId} lessonId={activeId} />}

      <div style={{ marginTop: 'var(--sp-4)', display: 'grid', gap: 'var(--sp-3)' }}>
        {activeProgress.complete && <Callout tone="success" role="status">أكملت تمارين هذا الدرس. يمكنك إعادة التدريب لتثبيت القاعدة أو متابعة المسار.</Callout>}
        {next ? (
          <button type="button" className="btn-glass" onClick={() => pickLesson(next.id, true)}
            style={{ minHeight: 48, padding: 'var(--sp-3) var(--sp-4)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)', color: 'var(--text)' }}>
            <strong>{activeProgress.complete ? 'متابعة إلى الدرس التالي' : 'استعراض الدرس التالي'}</strong>
            <span dir="auto" style={{ fontSize: 'var(--text-sm)' }}>{next.title}</span>
            {next.level !== level && <span dir="ltr" style={{ fontSize: 'var(--text-sm)' }}>{next.level}</span>}
          </button>
        ) : <Callout tone="info" icon="✓">هذا آخر درس في المسار. راجع الدروس السابقة أو طبّق ما تعلّمته في قسم التدريب.</Callout>}
      </div>
    </div>
  )
}
