import { useAppStore, planHealth } from '@/store/useAppStore'

export function PlanHealth() {
  const examDate = useAppStore((s) => s.examDate)
  const planDay  = useAppStore((s) => s.planDay)
  const done     = useAppStore((s) => s.done)
  // FIX 3: read user-configured study capacity and pass to planHealth
  const minutesPerTask  = useAppStore((s) => s.prefs.minutesPerTask)
  const studyDayMinutes = useAppStore((s) => s.prefs.studyDayMinutes)

  const ph = planHealth({ examDate, planDay, done }, { minutesPerTask, studyDayMinutes })

  const borderColor = ph.status === 'ok' ? 'var(--green)' : ph.status === 'tight' ? 'var(--amber)' : 'var(--red)'
  const badgeBg     = ph.status === 'ok' ? 'var(--green-l)' : ph.status === 'tight' ? 'var(--amber-l)' : 'var(--red-l)'
  const badgeColor  = ph.status === 'ok' ? 'var(--green)' : ph.status === 'tight' ? 'var(--amber)' : 'var(--red)'

  return (
    <div
      className="flex items-center gap-3.5 p-[14px_18px] rounded-card mb-[18px]"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
        border: `1px solid var(--glass-border)`,
        borderInlineStart: `3px solid ${borderColor}`,
        boxShadow: 'var(--elev-2), inset 0 1px 0 var(--glass-hi)',
      }}
      aria-live="polite"
    >
      <div
        className="w-[54px] h-[54px] rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{ background: badgeBg, color: badgeColor, boxShadow: 'var(--elev-1), inset 0 1px 0 rgba(255,255,255,.4)' }}
        aria-hidden="true"
      >
        {ph.badge}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-semibold text-[var(--text)] mb-[3px]">{ph.title}</div>
        <div className="text-[.85rem] text-[var(--text2)] leading-[1.55]">{ph.why}</div>
      </div>
    </div>
  )
}
