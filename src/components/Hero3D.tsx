import { lazy, Suspense, useState, useMemo, Component, type ReactNode, type ErrorInfo } from 'react'
import { useAppStore, getDaysLeft, avgBestScore, getPlanTotal, getCurrentDay } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { useReducedMotion3D } from '@/three/useReducedMotion3D'
import { Hero2DFallback } from './Hero2DFallback'

/* Lazy-import the heavy 3D scene — only loaded when 3D is enabled */
const Scene      = lazy(() => import('@/three/Scene').then((m) => ({ default: m.Scene })))
const CanalScene = lazy(() => import('@/three/CanalScene').then((m) => ({ default: m.CanalScene })))

/* ── ErrorBoundary — catches R3F / WebGL init failures and shows 2D fallback ── */
interface EBState { error: Error | null }
class HeroErrorBoundary extends Component<{ children: ReactNode }, EBState> {
  state: EBState = { error: null }
  static getDerivedStateFromError(error: Error): EBState {
    console.warn('[NT2 3D] Canvas error caught by HeroErrorBoundary:', error.message)
    return { error }
  }
  componentDidCatch(_err: Error, info: ErrorInfo) {
    console.warn('[NT2 3D] componentDidCatch:', info.componentStack?.slice(0, 200))
  }
  render() {
    if (this.state.error) return <Hero2DFallback />
    return this.props.children
  }
}

// FIX 2 — proofreading pass (mirrors Hero2DFallback):
//   'يومٌ مبارك' → 'يوم مبارك'   (tanwin dropped)
//   'لنرَ'        → 'لنرى'         (standard spelling)
const GREETINGS_3D = [
  'أهلًا بك في NT2 Planner',
  'يوم مبارك — هيا نواصل التقدّم',
  'مرحبًا من جديد — رحلتك إلى B1 مستمرّة',
  'goedendag — مخطّط NT2 جاهز لك',
  'هيا بنا — كل يوم خطوة نحو الامتحان',
  'سلام — لنرى أين وصلت اليوم',
]

export function Hero3D() {
  const reducedMotion = useReducedMotion3D()
  const [visible, setVisible] = useState(true)

  const examDate     = useAppStore((s) => s.examDate)
  const planDay      = useAppStore((s) => s.planDay)
  const streak       = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const skill        = useAppStore((s) => s.skill)
  const planStart    = useAppStore((s) => s.planStart)

  const daysLeft    = getDaysLeft(examDate)
  const todayMins   = useMemo(() => dailyHistory[todayKey()]?.mins ?? 0, [dailyHistory])
  const progress    = avgBestScore(skill)
  const streakCount = streak.count
  const planTotal   = getPlanTotal({ planStart, examDate })
  const planDayNow  = getCurrentDay({ planStart, planDay }, planTotal)

  // Render 2D fallback when the OS requests reduced motion
  if (reducedMotion) return <Hero2DFallback />

  return (
    <div
      style={{
        borderRadius: 'calc(var(--r) + 4px)',
        overflow: 'hidden',
        position: 'relative',
        marginBottom: 20,
        minHeight: 280,
        background: 'var(--grad-hero)',
        border: '1px solid rgba(255,255,255,.10)',
        boxShadow: 'var(--elev-3), inset 0 1px 0 rgba(255,255,255,.10)',
      }}
    >
      {/* 3D canvas — ErrorBoundary catches WebGL failures → shows 2D fallback */}
      <HeroErrorBoundary>
        {visible && (
          <Suspense fallback={null}>
            <Scene onVisibilityChange={setVisible}>
              <CanalScene
                progress={progress}
                streak={streakCount}
                daysLeft={daysLeft}
                planDay={planDayNow}
                todayMins={todayMins}
                streakCount={streakCount}
              />
            </Scene>
          </Suspense>
        )}
      </HeroErrorBoundary>

      {/* Text overlay — always on top, readable regardless of 3D state */}
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
          planDay={planDayNow}
          total={planTotal}
          todayMins={todayMins}
          streakCount={streakCount}
        />
      </div>
    </div>
  )
}

/* ── Text overlay rendered on top of the 3D canvas ── */
interface TextProps {
  daysLeft:    number | null
  planDay:     number
  total:       number
  todayMins:   number
  streakCount: number
}

function HeroTextOverlay({ daysLeft, planDay, total, todayMins, streakCount }: TextProps) {
  // FIX 2 — stable greeting picked ONCE per mount, inside the useState lazy
  // initializer so render stays pure (same pattern as Hero2DFallback)
  const [greeting] = useState<string>(() => {
    const g = [...GREETINGS_3D]
    const name = useAppStore.getState().name
    if (name) {
      g[0] = `أهلًا بك يا ${name}`
      g[2] = `مرحبًا ${name} — رحلتك إلى B1 مستمرّة`
    }
    return g[Math.floor(Math.random() * g.length)]
  })

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
          { icon: '📅', label: 'المتبقّي:',    value: daysLeft == null ? '—' : String(daysLeft), unit: 'يومًا' },
          { icon: '📍', label: 'اليوم:',        value: String(planDay),   unit: `/ ${total}` },
          { icon: '⏱️', label: 'درست اليوم:',  value: String(todayMins), unit: 'دقيقة'  },
          { icon: '🔥', label: 'مواظبة:',       value: String(streakCount), unit: 'يوم'  },
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
            <b style={{ color: 'var(--hero-accent)', fontWeight: 700, fontSize: '1rem' }}>{ck.value}</b>
            <span style={{ opacity: .7 }}>{ck.unit}</span>
          </div>
        ))}
      </div>
    </>
  )
}
