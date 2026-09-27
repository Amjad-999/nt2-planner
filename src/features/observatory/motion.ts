import type { Transition, Variants } from 'framer-motion'
import type { MotionLevel, MotionPref } from './types'

/* ── Motion system ──────────────────────────────────────────────────────────
   After Effects is the reference for choreography (staggered layers, easy-ease
   curves, depth settling); the browser gets transform/opacity only, so every
   sequence stays on the compositor and is interruptible mid-flight.

   Three levels, resolved from the learner's setting and the OS:
     reduced    — no travel, no scale; state changes are immediate or a ≤120 ms fade
     standard   — the default timings below
     expressive — ×1.25 duration, a little more depth and travel; still no loops
   The OS "reduce motion" preference always wins over the in-app choice. */

export function resolveMotion(pref: MotionPref, osReduced: boolean): MotionLevel {
  if (osReduced) return 'reduced'
  if (pref === 'system') return 'standard'
  return pref
}

/** Seconds. Mirrors --o-dur-* in tokens.css. */
export const DUR = { control: 0.15, panel: 0.28, screen: 0.45, finale: 0.7 }
export const EASE_OUT = [0.2, 0.8, 0.2, 1] as const
export const EASE_EMPH = [0.16, 1, 0.3, 1] as const

const SCALE: Record<MotionLevel, number> = { reduced: 0, standard: 1, expressive: 1.25 }
const TRAVEL: Record<MotionLevel, number> = { reduced: 0, standard: 14, expressive: 22 }

export function dur(level: MotionLevel, key: keyof typeof DUR): number {
  if (level === 'reduced') return Math.min(0.12, DUR[key])
  return DUR[key] * SCALE[level]
}

export function travel(level: MotionLevel): number {
  return TRAVEL[level]
}

export function tr(level: MotionLevel, key: keyof typeof DUR, delay = 0): Transition {
  return { duration: dur(level, key), ease: key === 'control' ? EASE_OUT : EASE_EMPH, delay: level === 'reduced' ? 0 : delay }
}

/** Enter Today: layers arrive in order and settle in depth (scale .985 → 1). */
export function stagger(level: MotionLevel): { container: Variants; item: Variants } {
  const t = travel(level)
  return {
    container: {
      hidden: {},
      show: { transition: { staggerChildren: level === 'reduced' ? 0 : level === 'expressive' ? 0.07 : 0.05 } },
    },
    item: {
      hidden: level === 'reduced' ? { opacity: 0 } : { opacity: 0, y: t, scale: 0.985 },
      show: { opacity: 1, y: 0, scale: 1, transition: tr(level, 'screen') },
    },
  }
}

/** Step change inside the lesson: the finished plane settles down, the next rises. */
export function stepVariants(level: MotionLevel): Variants {
  const t = travel(level)
  return {
    enter: level === 'reduced' ? { opacity: 0 } : { opacity: 0, y: t * 1.4, scale: 0.98 },
    center: { opacity: 1, y: 0, scale: 1, transition: tr(level, 'screen') },
    exit: level === 'reduced'
      ? { opacity: 0, transition: { duration: 0.08 } }
      : { opacity: 0, y: -t * 0.6, scale: 0.97, transition: tr(level, 'panel') },
  }
}

/** Progressive reveal (hints, feedback): height is not animated — content
 *  below does not jump twice; opacity + a short travel only. */
export function revealVariants(level: MotionLevel): Variants {
  const t = travel(level) * 0.6
  return {
    hidden: level === 'reduced' ? { opacity: 0 } : { opacity: 0, y: -t },
    show: { opacity: 1, y: 0, transition: tr(level, 'panel') },
    exit: { opacity: 0, transition: { duration: level === 'reduced' ? 0.06 : 0.14 } },
  }
}

/** Shared-element (layoutId) morphs: Today → Lesson, token → word detail. */
export function layoutTransition(level: MotionLevel, key: 'panel' | 'screen' = 'screen'): Transition {
  if (level === 'reduced') return { duration: 0 }
  return { type: 'tween', duration: dur(level, key), ease: EASE_EMPH }
}
