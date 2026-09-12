import { useAppStore } from '@/store/useAppStore'
import { useTodayPlan } from '@/hooks/useTodayPlan'
import { nextTask, weakest } from '@/features/plan/todayPlan'
import { setNavIntent } from '@/lib/navIntent'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { headlineMock } from './lastMock'

/**
 * الحلقة اليومية: قائمة مهام اليوم بأرقامها الحقيقية.
 *
 * TodayFocus above it presents the next unfinished row as the one big action;
 * this is the whole day at a glance — what is done, what is next, what is
 * left. Every row is a real derived fact and routes to the tab where it gets
 * done, so the dashboard stays the entry point of the day, not a summary.
 */
export function TodayPlan() {
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const skill = useAppStore((s) => s.skill)
  const mockRuns = useAppStore((s) => s.mockRuns)
  const plan = useTodayPlan()
  const next = nextTask(plan)
  const last = headlineMock(skill, mockRuns)

  return (
    <section aria-labelledby="today-plan-title" className="card" style={{ marginBottom: 'var(--sp-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
        <h3 id="today-plan-title" style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>مهام اليوم</h3>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>{plan.headlineAr}</span>
      </div>

      <div style={{ margin: 'var(--sp-3) 0' }}>
        <ProgressBar value={plan.pct} label="تقدّم مهام اليوم" valueText={`${plan.doneCount} من ${plan.tasks.length}`} />
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {plan.tasks.map((t) => {
          const isNext = t === next
          return (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => {
                  if (t.id === 'vocab' && !t.done) setNavIntent({ to: 'vocab', view: 'review' })
                  if (t.id === 'focus') setNavIntent({ to: 'exam', view: weakest(skill) })
                  if (t.id === 'mock') setNavIntent({ to: 'exam', view: 'mock' })
                  setActiveTab(t.tab)
                }}
                aria-current={isNext ? 'step' : undefined}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-3)', width: '100%', minHeight: 'var(--tap-min)',
                  padding: 'var(--sp-3)', borderRadius: 'var(--r-sm)', textAlign: 'start', cursor: 'pointer',
                  fontFamily: 'inherit',
                  background: isNext ? 'var(--orange-l)' : 'transparent',
                  border: `1px solid ${isNext ? 'var(--orange-m)' : 'var(--border)'}`,
                }}
              >
                {/* الحالة بأيقونة ونصّ مخفيّ، لا باللون وحده */}
                <span aria-hidden="true" style={{ fontSize: 'var(--text-base)', lineHeight: 'var(--lh-heading)', color: t.done ? 'var(--green-text)' : isNext ? 'var(--orange-text)' : 'var(--text2)', minWidth: 20, textAlign: 'center' }}>
                  {t.done ? '✓' : isNext ? '▶' : t.urgent ? '!' : '○'}
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{
                    display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)',
                    color: t.done ? 'var(--text2)' : 'var(--text)',
                    textDecoration: t.done ? 'line-through' : 'none',
                  }}>
                    {t.ar}
                    <span className="sr-only">{t.done ? ' — منجزة' : isNext ? ' — الخطوة التالية' : ''}</span>
                  </span>
                  <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--text2)', marginTop: 'var(--sp-0)' }}>
                    {t.detailAr}
                  </span>
                </span>
                {isNext && <span className="chip chip--brand" aria-hidden="true">التالي</span>}
              </button>
            </li>
          )
        })}
      </ul>

      {last && (
        <div style={{ marginTop: 'var(--sp-3)', paddingTop: 'var(--sp-3)', borderTop: '1px solid var(--border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
          <span>
            {last.full ? 'آخر امتحان كامل' : 'آخر محاكاة'}: <strong style={{ color: 'var(--text)' }}>{last.score}%</strong>
            {' · '}
            {last.full ? last.label : <bdi dir="ltr" lang="nl">{last.label}</bdi>}
          </span>
          <button type="button" className="btn btn--ghost" onClick={() => setActiveTab('exam')}>افتح تدريب الامتحان</button>
        </div>
      )}
    </section>
  )
}
