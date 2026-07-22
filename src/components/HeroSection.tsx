import { useAppStore, getDaysLeft, getPlanTotal, getCurrentDay } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { SmartGreeting } from './SmartGreeting'

export function HeroSection() {
  const examDate     = useAppStore((s) => s.examDate)
  const planDay      = useAppStore((s) => s.planDay)
  const planStart    = useAppStore((s) => s.planStart)
  const streak       = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const reduced = useReducedMotion()

  const daysLeft   = getDaysLeft(examDate)
  const todayMins  = dailyHistory[todayKey()]?.mins ?? 0
  const planTotal  = getPlanTotal({ planStart, examDate })
  const planDayNow = getCurrentDay({ planStart, planDay }, planTotal)

  const stats = [
    { icon: '🔥', label: 'مواظبة:',      value: String(streak.count), unit: 'يوم' },
    { icon: '⏱️', label: 'درست اليوم:',  value: String(todayMins),    unit: 'دقيقة' },
    { icon: '📍', label: 'اليوم:',        value: String(planDayNow),   unit: `/ ${planTotal}` },
    { icon: '📅', label: 'المتبقّي:',     value: daysLeft == null ? '—' : String(daysLeft), unit: 'يومًا' },
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      <SmartGreeting />

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {stats.map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              backdropFilter: 'blur(16px) saturate(1.3)',
              WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
              borderRadius: 'var(--r-sm)',
              padding: '9px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: '.85rem',
              color: 'var(--text2)',
              boxShadow: 'var(--elev-1), inset 0 1px 0 var(--glass-hi)',
            }}
          >
            <span aria-hidden="true">{s.icon}</span>
            <span>{s.label}</span>
            <b style={{ color: 'var(--text)', fontSize: '1rem', fontWeight: 700 }}>{s.value}</b>
            <span>{s.unit}</span>
          </div>
        ))}
      </div>

      <DecorativeBoard reduced={reduced} />
    </div>
  )
}

/* بطاقة زخرفية هادئة — بلا بيانات، تحل محل مشهد الـ3D */
function DecorativeBoard({ reduced }: { reduced: boolean }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 'calc(var(--r) + 4px)',
        minHeight: 150,
        background: 'var(--grad-hero)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--elev-2), inset 0 1px 0 rgba(255,255,255,.10)',
      }}
    >
      <div
        style={{
          position: 'absolute', top: '18%', insetInlineEnd: '-8%',
          width: 240, height: 240, borderRadius: '50%',
          background: 'conic-gradient(from 90deg, var(--blob-cool1), var(--blob-cool2), var(--blob-cool1))',
          filter: 'blur(52px)', opacity: .5,
          animation: reduced ? 'none' : 'blob-drift 30s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'absolute', bottom: '-14%', insetInlineStart: '8%',
          width: 200, height: 200, borderRadius: '50%',
          background: 'conic-gradient(from 210deg, var(--blob-cool3), transparent 60%, var(--blob-cool2))',
          filter: 'blur(56px)', opacity: .4,
          animation: reduced ? 'none' : 'blob-drift2 34s ease-in-out infinite',
        }}
      />
      <div
        style={{
          position: 'relative', zIndex: 1, minHeight: 150,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '2.4rem', opacity: .35,
        }}
      >
        🌷
      </div>
    </div>
  )
}
