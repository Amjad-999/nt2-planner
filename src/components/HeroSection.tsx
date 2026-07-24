import { motion } from 'framer-motion'
import { useAppStore, getDaysLeft, getPlanTotal, getCurrentDay } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { springFill } from '@/lib/animations'
import { SmartGreeting } from './SmartGreeting'

export function HeroSection() {
  const reduced = useReducedMotion()
  const examDate     = useAppStore((s) => s.examDate)
  const planDay      = useAppStore((s) => s.planDay)
  const planStart    = useAppStore((s) => s.planStart)
  const streak       = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const prefs        = useAppStore((s) => s.prefs)

  const daysLeft   = getDaysLeft(examDate)
  const todayMins  = dailyHistory[todayKey()]?.mins ?? 0
  const planTotal  = getPlanTotal({ planStart, examDate })
  const planDayNow = getCurrentDay({ planDay, planStart }, planTotal)

  // نسبة التقدم اليومي
  const targetMins = prefs?.studyDayMinutes ?? 60
  const progress = Math.min(100, Math.round((todayMins / targetMins) * 100))

  const stats = [
    { icon: '🔥', value: String(streak.count), label: 'مواظبة' },
    { icon: '⏱️', value: `${todayMins}د`, label: 'درست' },
    { icon: '📍', value: `${planDayNow}/${planTotal}`, label: 'اليوم' },
    { icon: '📅', value: `${daysLeft ?? 0}`, label: 'يوم' },
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      {/* البطاقة الرئيسية الموحدة */}
      <div
        style={{
          background: 'var(--grad-hero)',
          borderRadius: 'calc(var(--r) + 4px)',
          border: '1px solid var(--glass-border)',
          borderTop: '3px solid var(--orange)',
          boxShadow: 'var(--elev-2), inset 0 1px 0 rgba(255,244,235,.08)',
          padding: '24px 28px',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* تأثير خلفية زخرفي — يُخفى في وضع التركيز */}
        <div
          aria-hidden="true"
          className="decor-flourish"
          style={{
            position: 'absolute',
            top: '-20%',
            right: '-10%',
            width: 200,
            height: 200,
            borderRadius: '50%',
            background: 'conic-gradient(from 90deg, var(--blob-cool1), var(--blob-cool2))',
            filter: 'blur(60px)',
            opacity: 0.3,
          }}
        />

        {/* المحتوى */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* التحية */}
          <SmartGreeting />

          {/* الخانات في صف واحد */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 10,
              marginTop: 16,
            }}
          >
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  background: 'rgba(255,244,235,0.08)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 'var(--r-sm)',
                  padding: '12px 8px',
                  textAlign: 'center',
                  border: '1px solid rgba(255,244,235,0.1)',
                }}
              >
                <div style={{ fontSize: '1.3rem', marginBottom: 4 }}>{s.icon}</div>
                <div
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    color: '#FBF3EA',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: '.72rem',
                    color: 'rgba(217,201,184,0.75)',
                    marginTop: 2,
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* شريط التقدم */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontSize: '.8rem',
                  color: 'rgba(217,201,184,0.82)',
                  fontWeight: 500,
                }}
              >
                تقدمك اليومي
              </span>
              <span
                style={{
                  fontSize: '.85rem',
                  color: '#FBF3EA',
                  fontWeight: 700,
                }}
              >
                {progress}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                background: 'rgba(255,244,235,0.1)',
                borderRadius: 3,
                overflow: 'hidden',
              }}
            >
              <motion.div
                initial={reduced ? false : { width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={reduced ? { duration: 0 } : springFill}
                style={{
                  height: '100%',
                  background: 'linear-gradient(90deg, var(--orange), #EBBDA2)',
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}