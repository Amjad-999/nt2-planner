import { lazy, Suspense, useState, useMemo } from 'react'
import { useAppStore, getDaysLeft, avgBestScore } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { useReducedMotion3D } from '@/three/useReducedMotion3D'
import { Hero2DFallback } from './Hero2DFallback'

/* Lazy-import the heavy 3D scene — only loaded when 3D is enabled */
const Scene      = lazy(() => import('@/three/Scene').then((m) => ({ default: m.Scene })))
const CanalScene = lazy(() => import('@/three/CanalScene').then((m) => ({ default: m.CanalScene })))

export function Hero3D() {
  const reducedMotion = useReducedMotion3D()
  const [visible, setVisible] = useState(true)

  const examDate     = useAppStore((s) => s.examDate)
  const planDay      = useAppStore((s) => s.planDay)
  const streak       = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const skill        = useAppStore((s) => s.skill)

  const daysLeft    = getDaysLeft(examDate)
  const todayMins   = useMemo(() => dailyHistory[todayKey()]?.mins ?? 0, [dailyHistory])
  const progress    = avgBestScore(skill)
  const streakCount = streak.count

  // Always render the 2D content as an accessible text layer behind/beside the canvas
  const textContent = (
    <Hero2DFallback />
  )

  // Fall back to 2D if reduced motion or WebGL unavailable
  if (reducedMotion) return textContent

  return (
    <div
      style={{
        borderRadius: 'calc(var(--r) + 4px)',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 20,
        minHeight: 280,
        // Dark indigo gradient behind the 3D canvas
        background: 'var(--grad-hero)',
        border: '1px solid rgba(255,255,255,.10)',
        boxShadow: 'var(--elev-3), inset 0 1px 0 rgba(255,255,255,.10)',
      }}
    >
      {/* 3D canvas layer */}
      {visible && (
        <Suspense fallback={null}>
          <Scene onVisibilityChange={setVisible}>
            <CanalScene
              progress={progress}
              streak={streakCount}
              daysLeft={daysLeft}
              planDay={planDay}
              todayMins={todayMins}
              streakCount={streakCount}
            />
          </Scene>
        </Suspense>
      )}

      {/* Text overlay — always on top of the canvas, readable at all times */}
      <div
        style={{
          position: 'relative',
          zIndex: 2,
          pointerEvents: 'none',
          padding: '28px 28px 26px',
        }}
      >
        <HeroTextOverlay
          daysLeft={daysLeft}
          planDay={planDay}
          todayMins={todayMins}
          streakCount={streakCount}
          progress={progress}
          examDate={examDate}
        />
      </div>
    </div>
  )
}

/* ── The readable text layer that sits on top of the 3D canvas ── */
interface TextProps {
  daysLeft:    number | null
  planDay:     number
  todayMins:   number
  streakCount: number
  progress:    number
  examDate:    string
}

const GREETINGS = [
  'أهلًا بك في NT2 Planner',
  'يومٌ مبارك — هيا نواصل التقدّم',
  'مرحبًا من جديد — رحلتك إلى B1 مستمرّة',
  'goedendag — مخطّط NT2 جاهز لك',
  'هيا بنا — كل يوم خطوة نحو الامتحان',
  'سلام — لنرَ أين وصلت اليوم',
]

function HeroTextOverlay({ daysLeft, planDay, todayMins, streakCount }: TextProps) {
  const name = useAppStore((s) => s.name)
  const greeting = useMemo(() => {
    const g = [...GREETINGS]
    if (name) { g[0] = `أهلًا بك يا ${name}`; g[2] = `مرحبًا ${name} — رحلتك إلى B1 مستمرّة` }
    return g[Math.floor(Math.random() * g.length)]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name])

  return (
    <>
      <h1
        style={{
          fontFamily: 'var(--font-display,"Plus Jakarta Sans",serif)',
          fontSize: 'clamp(1.4rem, 3vw, 1.8rem)',
          fontWeight: 700,
          color: '#F6F7FF',
          marginBottom: 6,
          letterSpacing: '-.4px',
          textShadow: '0 2px 12px rgba(13,15,30,.6)',
        }}
      >
        {greeting}
      </h1>
      <div style={{ fontSize: '.9rem', color: 'rgba(233,236,250,.82)', lineHeight: 1.5, marginBottom: 14, textShadow: '0 1px 6px rgba(13,15,30,.5)' }}>
        منصة متكاملة للوصول إلى مستوى B1 الفعلي المطلوب في امتحان NT2 — خطة تكيّفية، وذكاء اصطناعي مدمج.
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {[
          { icon: '📅', label: 'المتبقّي:', value: daysLeft == null ? '—' : String(daysLeft), unit: 'يومًا' },
          { icon: '📍', label: 'اليوم:', value: String(planDay), unit: '/ 46' },
          { icon: '⏱️', label: 'درست اليوم:', value: String(todayMins), unit: 'دقيقة' },
          { icon: '🔥', label: 'مواظبة:', value: String(streakCount), unit: 'يوم' },
        ].map((ck) => (
          <div
            key={ck.label}
            style={{
              background: 'rgba(255,255,255,.09)',
              border: '1px solid rgba(255,255,255,.14)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderRadius: 10,
              padding: '7px 13px',
              color: '#F2EEE2',
              display: 'flex',
              alignItems: 'center',
              gap: 7,
              fontSize: '.83rem',
              pointerEvents: 'auto',
            }}
          >
            {ck.icon}
            <span style={{ opacity: .8 }}>{ck.label}</span>
            <b style={{ color: '#C7CCFF', fontWeight: 700, fontSize: '1rem' }}>{ck.value}</b>
            <span style={{ opacity: .7 }}>{ck.unit}</span>
          </div>
        ))}
      </div>
    </>
  )
}
