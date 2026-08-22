import { useAppStore } from '@/store/useAppStore'
import { useNow } from '@/hooks/useNow'
import { LEARNED_BOX } from '@/data/phases'
import { LESSONS } from '@/data/lessons'
import { buildTodayPlan, latestMockRun } from '@/features/plan/todayPlan'
import { todayKey } from '@/lib/utils'

/**
 * الحلقة اليومية: قائمة مهام اليوم بأرقامها الحقيقية.
 *
 * TodayFocus above it answers "what is my weak spot"; this answers "what do I
 * actually do now, and how much is left". Every row is a real derived fact and
 * routes to the tab where it gets done, so the dashboard stops being a summary
 * and becomes the entry point of the day.
 */

const REVIEW_BATCH = 20

export function TodayPlan() {
  const state = useAppStore()
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const now = useNow()

  const plan = buildTodayPlan(state, {
    now,
    todayKey: todayKey(),
    learnedBox: LEARNED_BOX,
    reviewBatch: REVIEW_BATCH,
    totalLessons: LESSONS.length,
  })
  const lastRun = latestMockRun(state.mockRuns)

  return (
    <section
      aria-label="مهام اليوم"
      style={{
        padding: '18px 24px 20px', margin: '0 0 18px',
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r)', boxShadow: 'var(--elev-1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0, fontSize: '1.02rem', fontWeight: 700, color: 'var(--text)' }}>مهام اليوم</h3>
        <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>{plan.headlineAr}</span>
      </div>

      <div style={{ height: 6, borderRadius: 6, background: 'var(--border)', overflow: 'hidden', margin: '10px 0 14px' }}>
        <div style={{ width: `${plan.pct}%`, height: '100%', background: 'var(--orange)', transition: 'width .3s' }} />
      </div>

      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {plan.tasks.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              onClick={() => setActiveTab(t.tab)}
              aria-label={`${t.ar}. ${t.detailAr}`}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 10, width: '100%', minHeight: 44,
                padding: '10px 12px', borderRadius: 'var(--r-sm)', textAlign: 'start', cursor: 'pointer',
                fontFamily: 'inherit',
                background: 'var(--btn-bg)',
                border: '1px solid var(--border)',
                /* الحالة اللونية مقرونة دائمًا بأيقونة، فلا يعتمد المعنى على اللون وحده */
                borderInlineStart: `3px solid ${t.done ? 'var(--green)' : t.urgent ? 'var(--orange)' : 'var(--border2)'}`,
              }}
            >
              <span aria-hidden style={{ fontSize: '1rem', lineHeight: 1.4, color: t.done ? 'var(--green-text)' : t.urgent ? 'var(--orange-text)' : 'var(--muted)' }}>
                {t.done ? '✔' : t.urgent ? '!' : '○'}
              </span>
              <span style={{ flex: 1 }}>
                <span style={{
                  display: 'block', fontSize: '.92rem', fontWeight: 600,
                  color: t.done ? 'var(--muted)' : 'var(--text)',
                  textDecoration: t.done ? 'line-through' : 'none',
                }}>
                  {t.ar}
                </span>
                <span style={{ display: 'block', fontSize: 'var(--text-sm)', color: 'var(--muted)', marginTop: 2 }}>
                  {t.detailAr}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>

      {lastRun && (
        <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--border)', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
          آخر امتحان كامل: <strong style={{ color: 'var(--text)' }}>{lastRun.total}</strong> من 100
          <button
            type="button"
            onClick={() => setActiveTab('exam')}
            style={{
              marginInlineStart: 10, minHeight: 32, padding: '4px 12px', borderRadius: 10,
              background: 'transparent', border: '1px solid var(--border2)', color: 'var(--text2)',
              fontFamily: 'inherit', fontSize: 'var(--text-sm)', cursor: 'pointer',
            }}
          >
            افتح الامتحان الكامل
          </button>
        </div>
      )}
    </section>
  )
}
