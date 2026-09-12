import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion } from 'framer-motion'
import { useAppStore, getPlanTotal, getCurrentDay, avgBestScore } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useNow } from '@/hooks/useNow'
import { springFill } from '@/lib/animations'
import { celebrate } from '@/lib/celebrate'
import { SmartGreeting } from '@/components/SmartGreeting'
import { ExamCountdownRing } from '@/components/countdown/ExamCountdownRing'
import { phaseOfHour, msToNextBoundary, type DayPhase } from './journeyPhase'
import { shouldCelebrateGoal } from './heroProgress'

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

  const todayMins = dailyHistory[todayKey()]?.mins ?? 0
  const planTotal = getPlanTotal({ planStart, examDate })
  const planDayNow = getCurrentDay({ planDay, planStart }, planTotal)
  const readiness = avgBestScore(skill)

  // نسبة التقدم اليومي
  const targetMins = prefs?.studyDayMinutes ?? 60
  const progress = Math.min(100, Math.round((todayMins / targetMins) * 100))

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
    const today = todayKey()
    const decision = shouldCelebrateGoal({
      prevMins: prev, todayMins, targetMins,
      celebratedOn: goalCelebratedOn, today,
    })
    if (decision === 'skip') return
    markGoalCelebrated(today)
    if (decision === 'consume') return
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
    { icon: '🎯', value: Object.values(skill).some(s => s.attempts > 0 || s.best > 0) ? `${readiness}%` : '—', label: 'متوسط التدريب' },
  ]

  /* The daily summary follows the learning action and checklist. */
  return (
    <div style={{ marginBottom: 'var(--sp-4)' }}>
      <div
        ref={rootRef}
        style={{
          background: 'var(--grad-hero)',
          borderRadius: 'var(--r)',
          border: '1px solid var(--glass-border)',
          borderTop: '3px solid var(--orange)',
          boxShadow: 'var(--elev-2), inset 0 1px 0 var(--hero-hi)',
          /* الحشو السفلي يحجز شريط الأفق كاملًا، فيبقى المشهد تحت المحتوى
             لا خلفه. */
          padding: 'var(--hero-pad-y) var(--hero-pad-x) calc(var(--hero-sky-h) + var(--sp-2))',
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
            style={{ left: -16, right: -16, bottom: -1, height: 'calc(var(--hero-sky-h) * 0.73)', width: 'calc(100% + 32px)', fill: 'var(--sky-back)' }}
          >
            {houseRects(SKY_BACK)}
          </svg>
          <svg
            ref={frontRef} className="hero-sky" viewBox="0 0 400 48" preserveAspectRatio="none"
            style={{ left: -16, right: -16, bottom: -1, height: 'var(--hero-sky-h)', width: 'calc(100% + 32px)', fill: 'var(--sky-front)' }}
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
          {/* The greeting column carries the daily progress bar so it matches
              the 108px ring's height. Before, the bar sat in its own row below
              the stats and the greeting alone was ~66px tall — the 40px
              difference piled up as dead space beside the ring. Filling it with
              information the hero already owned beats padding it out, and it
              drops a whole row from the card. */}
          <div style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 240px', minWidth: 0 }}>
              <SmartGreeting />

              {/* شريط التقدم — scaleX بدل width: التحويل لا يفرض إعادة تخطيط،
                  والأصل من اليمين ليطابق اتجاه التعبئة في RTL */}
              <div style={{ marginTop: 'var(--sp-3)' }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 'var(--sp-2)',
                  }}
                >
                  <span style={{ fontSize: 'var(--text-xs)', color: 'var(--hero-ink2)', fontWeight: 'var(--fw-medium)' }}>
                    تقدمك اليومي
                  </span>
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--hero-ink)', fontWeight: 'var(--fw-cta)' }}>
                    {progress}%
                  </span>
                </div>
                <div
                  style={{
                    height: 6,
                    background: 'var(--hero-line)',
                    borderRadius: 'var(--r-2xs)',
                    overflow: 'hidden',
                  }}
                >
                  <motion.div
                    initial={reduced ? false : { scaleX: 0 }}
                    animate={{ scaleX: progress / 100 }}
                    transition={reduced ? { duration: 0 } : springFill}
                    style={{
                      height: '100%',
                      borderRadius: 'var(--r-2xs)',
                      transformOrigin: '100% 50%',
                      background: 'linear-gradient(90deg, var(--orange), var(--orange-m))',
                    }}
                  />
                </div>
              </div>
            </div>
            <div ref={ringWrapRef} style={{ flexShrink: 0 }}>
              <ExamCountdownRing />
            </div>
          </div>

          {/* الخانات — عمودان على الهاتف وأربعة من 560px.
              `repeat(4, 1fr)` الثابتة كانت تُبقي أربعة أعمدة على شاشة 320px،
              فيبقى نحو 24px صالحة داخل كل خانة لقيمة مثل «12/184». وقياس
              auto-fit وحده يمرّ بنطاق يعرض 3+1، وهو أسوأ من عمودين. */}
          <div className="hero-stats">
            {stats.map((s) => (
              <div
                key={s.label}
                style={{
                  background: 'var(--hero-veil)',
                  backdropFilter: 'blur(12px)',
                  borderRadius: 'var(--r-sm)',
                  padding: '12px 8px',
                  textAlign: 'center',
                  border: '1px solid var(--hero-line)',
                }}
              >
                <div aria-hidden="true" style={{ fontSize: 'var(--glyph-sm)', marginBottom: 'var(--sp-1)' }}>{s.icon}</div>
                <div
                  style={{
                    fontSize: 'var(--text-lg)',
                    fontWeight: 'var(--fw-cta)',
                    color: 'var(--hero-ink)',
                    fontFamily: 'var(--font-display)',
                  }}
                >
                  {s.value}
                </div>
                <div
                  style={{
                    fontSize: 'var(--text-2xs)',
                    color: 'var(--hero-ink2)',
                    marginTop: 'var(--sp-0)',
                  }}
                >
                  {s.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
