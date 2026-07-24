import { lazy, Suspense, useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useAppStore, getDaysLeft, getPlanTotal, getCurrentDay, avgBestScore } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useNow } from '@/hooks/useNow'
import { springFill } from '@/lib/animations'
import { celebrate } from '@/lib/celebrate'
import { SmartGreeting } from '@/components/SmartGreeting'
import { phaseOfHour, msToNextBoundary, type DayPhase } from './journeyPhase'
import { deriveHeroProgress } from './heroProgress'

/* Lazy for the same reason ExamCountdown lazy-loads it: the modal statically
   imports Overlay/Field from SettingsModal, which drags CloudPanel + TTS
   code — none of that belongs in the always-visible Dashboard chunk. */
const ExamDateModal = lazy(() => import('@/components/countdown/ExamDateModal').then((m) => ({ default: m.ExamDateModal })))

/* ExamCountdown's separate storage for the same date — written on save so the
   countdown pill doesn't keep nagging for a date the user just set here. */
const COUNTDOWN_DATE_KEY = 'nt2_exam_date'

/* Same touch heuristic the old 3D hero used: read once at module load —
   pointer type changing mid-session (dock/undock) is rare enough that a
   reload picking it up is acceptable. */
const IS_COARSE = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

const PHASES: DayPhase[] = ['dawn', 'day', 'dusk', 'night']

/* Ember field — fixed, hand-spread values instead of Math.random() so render
   stays pure (react-hooks/purity) and the scene is identical across mounts.
   All animation lives in the .ember CSS keyframes; React never re-renders
   for these. */
const EMBERS = [
  { left: 6, size: 5, dur: 9.5, delay: 0, rise: 130, dx: 14 },
  { left: 15, size: 4, dur: 11, delay: 3.2, rise: 100, dx: -10 },
  { left: 26, size: 6, dur: 8, delay: 1.4, rise: 150, dx: 8 },
  { left: 37, size: 4, dur: 12, delay: 5.1, rise: 90, dx: -16 },
  { left: 48, size: 5, dur: 9, delay: 2.3, rise: 140, dx: 12 },
  { left: 59, size: 7, dur: 10, delay: 0.8, rise: 165, dx: -6 },
  { left: 70, size: 4, dur: 11.5, delay: 4.4, rise: 105, dx: 16 },
  { left: 79, size: 5, dur: 8.5, delay: 6, rise: 145, dx: -12 },
  { left: 88, size: 6, dur: 10.5, delay: 1.9, rise: 120, dx: 6 },
  { left: 94, size: 4, dur: 12.5, delay: 3.7, rise: 95, dx: -14 },
]

/* Canal-house silhouettes (trapgevel skyline), drawn as rects in a 400x48
   viewBox — data-driven instead of hand-authored paths so the shapes are
   trivially correct and tweakable. `cap` adds the two stepped-gable rects. */
type House = { x: number; w: number; h: number; cap?: boolean }
const SKY_BACK: House[] = [
  { x: 0, w: 24, h: 16 }, { x: 28, w: 18, h: 24, cap: true }, { x: 50, w: 26, h: 14 },
  { x: 80, w: 20, h: 28, cap: true }, { x: 104, w: 28, h: 18 }, { x: 136, w: 18, h: 22, cap: true },
  { x: 158, w: 30, h: 12 }, { x: 192, w: 22, h: 26, cap: true }, { x: 218, w: 26, h: 16 },
  { x: 248, w: 18, h: 30, cap: true }, { x: 270, w: 30, h: 14 }, { x: 304, w: 20, h: 24, cap: true },
  { x: 328, w: 26, h: 18 }, { x: 358, w: 18, h: 26, cap: true }, { x: 380, w: 20, h: 12 },
]
const SKY_FRONT: House[] = [
  { x: 0, w: 34, h: 22 }, { x: 40, w: 26, h: 34, cap: true }, { x: 72, w: 36, h: 18 },
  { x: 114, w: 28, h: 38, cap: true }, { x: 148, w: 38, h: 24 }, { x: 192, w: 26, h: 40, cap: true },
  { x: 224, w: 36, h: 20 }, { x: 266, w: 28, h: 36, cap: true }, { x: 300, w: 38, h: 26 },
  { x: 344, w: 26, h: 38, cap: true }, { x: 376, w: 24, h: 18 },
]

function houseRects(houses: House[]) {
  return houses.flatMap((hs) => {
    const top = 48 - hs.h
    const rects = [<rect key={hs.x} x={hs.x} y={top} width={hs.w} height={hs.h} />]
    if (hs.cap) {
      rects.push(<rect key={`${hs.x}a`} x={hs.x + hs.w * 0.18} y={top - 4} width={hs.w * 0.64} height={4} />)
      rects.push(<rect key={`${hs.x}b`} x={hs.x + hs.w * 0.36} y={top - 8} width={hs.w * 0.28} height={4} />)
    }
    return rects
  })
}

export function JourneyHero() {
  const reduced = useReducedMotion()
  const now = useNow()

  const examDate = useAppStore((s) => s.examDate)
  const planDay = useAppStore((s) => s.planDay)
  const planStart = useAppStore((s) => s.planStart)
  const streak = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const prefs = useAppStore((s) => s.prefs)
  const skill = useAppStore((s) => s.skill)
  const goalCelebratedOn = useAppStore((s) => s.goalCelebratedOn)
  const markGoalCelebrated = useAppStore((s) => s.markGoalCelebrated)
  const saveSettings = useAppStore((s) => s.saveSettings)
  const setActiveTab = useAppStore((s) => s.setActiveTab)

  const daysLeft = getDaysLeft(examDate)
  const todayMins = dailyHistory[todayKey()]?.mins ?? 0
  const planTotal = getPlanTotal({ planStart, examDate })
  const planDayNow = getCurrentDay({ planDay, planStart }, planTotal)
  const readiness = avgBestScore(skill)

  // نسبة التقدم اليومي
  const targetMins = prefs?.studyDayMinutes ?? 60
  const progress = Math.min(100, Math.round((todayMins / targetMins) * 100))

  const [showDateModal, setShowDateModal] = useState(false)

  /* ── Daily-goal celebration — at most once per calendar day, persisted.
     The flag (goalCelebratedOn, a dayKey) is consumed in EVERY goal-met path;
     confetti + pulse fire only on a live below→met crossing witnessed while
     mounted. First paint with the goal already met (logged earlier today, or
     on another device) consumes the flag silently — celebrating stale news on
     mount is exactly the bug the task forbids. */
  const prevMinsRef = useRef<number | null>(null)
  const pulseTimer = useRef(0)
  const ringWrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const prev = prevMinsRef.current
    prevMinsRef.current = todayMins
    if (deriveHeroProgress(todayMins, targetMins) !== 'goal-met') return
    const today = todayKey()
    if (goalCelebratedOn === today) return
    markGoalCelebrated(today)
    if (prev === null || prev >= targetMins) return
    celebrate('tasks') // celebrate() no-ops under prefers-reduced-motion itself
    // Pulse is decorative — written straight to the DOM (same idiom as the
    // parallax layer transforms) so no render cascades from this effect.
    const el = ringWrapRef.current
    if (!reduced && el) {
      el.classList.add('ring-pulse')
      window.clearTimeout(pulseTimer.current)
      pulseTimer.current = window.setTimeout(() => el.classList.remove('ring-pulse'), 2400)
    }
  }, [todayMins, targetMins, goalCelebratedOn, markGoalCelebrated, reduced])
  useEffect(() => () => window.clearTimeout(pulseTimer.current), [])

  const handleSaveDate = (iso: string) => {
    saveSettings({ examDate: iso })
    try { localStorage.setItem(COUNTDOWN_DATE_KEY, iso) } catch { /* private mode — the store copy still saved */ }
  }

  /* ── Smart empty states: the ring never shows a hollow zero or a dash.
     No usable exam date → CTA into ExamDateModal; date set but nothing
     measured yet (brand-new user, no sims) → CTA into the first simulation. */
  const ringCta =
    daysLeft == null
      ? {
          icon: '📅',
          label: 'حدّد موعدك',
          ariaLabel: 'حدّد موعد امتحانك ليبدأ حساب الجاهزية',
          onClick: () => setShowDateModal(true),
          hasPopup: true,
        }
      : readiness === 0
        ? {
            icon: '🎯',
            label: 'أول محاكاة',
            ariaLabel: 'ابدأ أول محاكاة امتحان لقياس جاهزيتك',
            onClick: () => setActiveTab('exam'),
          }
        : undefined

  /* ── Time-of-day phase — seeded from useNow(), then one chained timer per
     boundary crossing (at most 4/day) flips the state; the visible change is
     a CSS opacity cross-fade between the stacked .hero-phase layers. */
  const [phase, setPhase] = useState<DayPhase>(() => phaseOfHour(new Date(now).getHours()))
  useEffect(() => {
    let t = 0
    const arm = (from: number) => {
      t = window.setTimeout(() => {
        // Timer callback, not render — useNow() exists for render purity;
        // reading the clock when the timer fires is exactly what it's for.
        const at = Date.now()
        setPhase(phaseOfHour(new Date(at).getHours()))
        arm(at)
      }, msToNextBoundary(from))
    }
    arm(now)
    return () => window.clearTimeout(t)
  }, [now])

  /* ── Parallax — pointer read via passive listener into a plain ref;
     transforms written once per rAF straight onto the two skyline layers.
     No React state, no layout reads (viewport-normalized coordinates), and
     none of it exists on touch devices or under reduced motion. */
  const rootRef = useRef<HTMLDivElement>(null)
  const backRef = useRef<SVGSVGElement>(null)
  const frontRef = useRef<SVGSVGElement>(null)
  useEffect(() => {
    if (reduced || IS_COARSE) return
    const root = rootRef.current
    const back = backRef.current
    const front = frontRef.current
    if (!root || !back || !front) return

    let raf = 0
    const pos = { x: 0, y: 0 } // normalized -1..1
    const apply = () => {
      raf = 0
      back.style.transform = `translate3d(${(pos.x * 5).toFixed(1)}px, ${(pos.y * 2).toFixed(1)}px, 0)`
      front.style.transform = `translate3d(${(pos.x * 10).toFixed(1)}px, ${(pos.y * 4).toFixed(1)}px, 0)`
    }
    const schedule = () => { if (!raf) raf = requestAnimationFrame(apply) }
    const onMove = (e: PointerEvent) => {
      pos.x = (e.clientX / window.innerWidth) * 2 - 1
      pos.y = (e.clientY / window.innerHeight) * 2 - 1
      schedule()
    }
    const onLeave = () => { pos.x = 0; pos.y = 0; schedule() }

    root.addEventListener('pointermove', onMove, { passive: true })
    root.addEventListener('pointerleave', onLeave, { passive: true })
    return () => {
      root.removeEventListener('pointermove', onMove)
      root.removeEventListener('pointerleave', onLeave)
      if (raf) cancelAnimationFrame(raf)
      back.style.transform = ''
      front.style.transform = ''
    }
  }, [reduced])

  const stats = [
    { icon: '🔥', value: String(streak.count), label: 'مواظبة' },
    { icon: '⏱️', value: `${todayMins}د`, label: 'درست' },
    { icon: '📍', value: `${planDayNow}/${planTotal}`, label: 'اليوم' },
    { icon: '📅', value: `${daysLeft ?? 0}`, label: 'يوم' },
  ]

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        ref={rootRef}
        style={{
          background: 'var(--grad-hero)',
          borderRadius: 'calc(var(--r) + 4px)',
          border: '1px solid var(--glass-border)',
          borderTop: '3px solid var(--orange)',
          boxShadow: 'var(--elev-2), inset 0 1px 0 rgba(255,244,235,.08)',
          padding: '24px 28px',
          position: 'relative',
          overflow: 'hidden',
          isolation: 'isolate',
        }}
      >
        {/* المشهد الزخرفي — سماء + أفق + جمرات؛ يُخفى في وضع التركيز */}
        <div aria-hidden="true" className="decor-flourish" style={{ position: 'absolute', inset: 0 }}>
          {/* Ambient sky: four stacked phase gradients, active one at opacity 1 —
              the .hero-phase opacity transition makes any phase flip a cross-fade. */}
          {PHASES.map((p) => (
            <div key={p} className={p === phase ? 'hero-phase on' : 'hero-phase'} style={{ background: `var(--hero-${p})` }} />
          ))}

          {/* Skyline — two parallax depths; layers bleed 16px past each edge so
              a ±10px parallax shift can never reveal a gap. */}
          <svg
            ref={backRef} className="hero-sky" viewBox="0 0 400 48" preserveAspectRatio="none"
            style={{ left: -16, right: -16, bottom: -1, height: 44, width: 'calc(100% + 32px)', fill: 'var(--sky-back)' }}
          >
            {houseRects(SKY_BACK)}
          </svg>
          <svg
            ref={frontRef} className="hero-sky" viewBox="0 0 400 48" preserveAspectRatio="none"
            style={{ left: -16, right: -16, bottom: -1, height: 60, width: 'calc(100% + 32px)', fill: 'var(--sky-front)' }}
          >
            {houseRects(SKY_FRONT)}
          </svg>

          {/* Embers — CSS keyframes only; skipped entirely under reduced motion
              (they carry zero information), with a CSS display guard as backup. */}
          {!reduced && EMBERS.map((e) => (
            <span
              key={e.left}
              className="ember"
              style={{
                left: `${e.left}%`,
                '--es': `${e.size}px`,
                '--ed': `${e.dur}s`,
                '--edl': `${e.delay}s`,
                '--erise': `${e.rise}px`,
                '--edx': `${e.dx}px`,
              } as CSSProperties}
            />
          ))}
        </div>

        {/* المحتوى */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <SmartGreeting />
            </div>
            <div ref={ringWrapRef} style={{ flexShrink: 0 }}>
              <ReadinessRing pct={readiness} reduced={reduced} cta={ringCta} />
            </div>
          </div>

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

          {/* شريط التقدم — scaleX بدل width: التحويل لا يفرض إعادة تخطيط،
              والأصل من اليمين ليطابق اتجاه التعبئة في RTL */}
          <div style={{ marginTop: 16 }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: '.8rem', color: 'rgba(217,201,184,0.82)', fontWeight: 500 }}>
                تقدمك اليومي
              </span>
              <span style={{ fontSize: '.85rem', color: '#FBF3EA', fontWeight: 700 }}>
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
                initial={reduced ? false : { scaleX: 0 }}
                animate={{ scaleX: progress / 100 }}
                transition={reduced ? { duration: 0 } : springFill}
                style={{
                  height: '100%',
                  borderRadius: 3,
                  transformOrigin: '100% 50%',
                  background: 'linear-gradient(90deg, var(--orange), #EBBDA2)',
                }}
              />
            </div>
          </div>
        </div>

        {showDateModal && (
          <Suspense fallback={null}>
            <ExamDateModal
              currentDate={daysLeft == null ? null : examDate}
              onClose={() => setShowDateModal(false)}
              onSave={handleSaveDate}
            />
          </Suspense>
        )}
      </div>
    </div>
  )
}

/* ── حلقة الجاهزية — نفس مقياس "معدّل امتحاناتك" (avgBestScore) بلمحة واحدة.
   في الحالات الفارغة تعرض زرًّا حقيقيًّا (قابلًا للتركيز، باسم واضح لقارئ
   الشاشة) بدل صفرٍ أجوف — انظر ringCta أعلاه. ── */
interface RingCta {
  icon: string
  label: string
  ariaLabel: string
  onClick: () => void
  hasPopup?: boolean
}

function ReadinessRing({ pct, reduced, cta }: { pct: number; reduced: boolean; cta?: RingCta }) {
  const R = 30
  const C = 2 * Math.PI * R
  const filled = (Math.min(100, Math.max(0, pct)) / 100) * C

  return (
    <div
      role={cta ? undefined : 'img'}
      aria-label={cta ? undefined : `جاهزية ${pct}%`}
      style={{ position: 'relative', width: 84, height: 84, flexShrink: 0 }}
    >
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
        <circle cx="42" cy="42" r={R} fill="none" stroke="rgba(255,244,235,.14)" strokeWidth="7" />
        {!cta && (
          <motion.circle
            cx="42" cy="42" r={R} fill="none"
            stroke="var(--orange)" strokeWidth="7" strokeLinecap="round"
            transform="rotate(-90 42 42)"
            initial={reduced ? false : { strokeDasharray: `0 ${C}` }}
            animate={{ strokeDasharray: `${filled} ${C}` }}
            transition={reduced ? { duration: 0 } : springFill}
          />
        )}
      </svg>
      {cta ? (
        <button
          type="button"
          onClick={cta.onClick}
          aria-label={cta.ariaLabel}
          aria-haspopup={cta.hasPopup ? 'dialog' : undefined}
          style={{
            position: 'absolute', inset: 8, borderRadius: '50%',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
            background: 'rgba(255,244,235,0.10)', border: '1px dashed rgba(255,244,235,0.4)',
            color: '#FBF3EA', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: '.6rem', fontWeight: 700, lineHeight: 1.4, textAlign: 'center', padding: 4,
          }}
        >
          <span aria-hidden="true" style={{ fontSize: '1.05rem' }}>{cta.icon}</span>
          {cta.label}
        </button>
      ) : (
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', pointerEvents: 'none',
          }}
        >
          <b style={{ fontSize: '1.05rem', color: '#FBF3EA', fontFamily: 'var(--font-display)' }}>{pct}%</b>
          <span style={{ fontSize: '.62rem', color: 'rgba(217,201,184,0.75)' }}>جاهزية</span>
        </div>
      )}
    </div>
  )
}
