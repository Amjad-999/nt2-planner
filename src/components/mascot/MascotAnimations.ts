import type { TargetAndTransition, Variants } from 'framer-motion'
import { EASE_OUT } from '@/lib/animations'

export type MascotMood = 'idle' | 'happy' | 'sad' | 'excited' | 'thinking' | 'dancing'

/**
 * One animation target per mood, applied to the mascot's wrapping
 * motion.div via `animate={MOOD_ANIMATION[mood]}`. All of them loop
 * (`repeat: Infinity`) since the mood persists until useMascot changes it —
 * callers gate this whole module out under prefers-reduced-motion (see
 * Mascot.tsx), same convention as Reveal/Tilt in MotionFx.tsx.
 */
export const MOOD_ANIMATION: Record<MascotMood, TargetAndTransition> = {
  idle: {
    scale: [1, 1.035, 1],
    rotate: 0,
    transition: { duration: 3.2, repeat: Infinity, ease: EASE_OUT },
  },
  happy: {
    y: [0, -18, 0, -8, 0],
    rotate: [0, -4, 4, -2, 0],
    transition: { duration: 0.9, repeat: 2, ease: 'easeOut' },
  },
  sad: {
    y: [0, 4, 0],
    rotate: [0, -2, 0],
    scale: 0.97,
    transition: { duration: 2.6, repeat: Infinity, ease: EASE_OUT },
  },
  excited: {
    rotate: [0, -6, 6, -6, 6, 0],
    scale: [1, 1.08, 1.08, 1.08, 1.08, 1],
    transition: { duration: 0.7, repeat: Infinity, repeatDelay: 0.6, ease: EASE_OUT },
  },
  thinking: {
    rotate: [0, 6, 6, 0],
    transition: { duration: 2.2, repeat: Infinity, ease: EASE_OUT },
  },
  // The victory dance: a genuine 3D turn, not a flat slide — the character
  // swings around its own Y axis while nodding on X, with its own
  // `transformPerspective` so the rotation has real depth even though the
  // stage's perspective already applies. Limb/tail motion (SVG fallback) is
  // CSS-driven via the `mascot-dancing` class — see globals.css.
  dancing: {
    y: [0, -14, 0, -14, 0],
    rotate: [0, -8, 0, 8, 0],
    rotateY: [0, 36, 0, -36, 0],
    rotateX: [0, -14, 0, -14, 0],
    scale: [1, 1.06, 1, 1.06, 1],
    transformPerspective: 500,
    transition: { duration: 1.15, repeat: Infinity, ease: 'easeInOut' },
  },
}

/** Spring used for the pointer-driven 3D tilt (Mascot.tsx). Softer than
 *  springFill: the icon should trail the cursor, not snap to it. */
export const TILT_SPRING = { stiffness: 140, damping: 18, mass: 0.6 } as const

/** Degrees of rotation at full pointer offset, and the distance (px) from the
 *  icon's centre at which that full offset is reached. */
export const MAX_TILT_DEG = 16
export const POINTER_RANGE_PX = 420

/** Static (no motion) pose per mood — used verbatim under prefers-reduced-motion. */
export const MOOD_STATIC: Record<MascotMood, TargetAndTransition> = {
  idle: { scale: 1, rotate: 0, y: 0 },
  happy: { scale: 1, rotate: 0, y: -4 },
  sad: { scale: 0.97, rotate: 0, y: 2 },
  excited: { scale: 1.05, rotate: 0, y: 0 },
  thinking: { scale: 1, rotate: 4, y: 0 },
  dancing: { scale: 1.05, rotate: -3, y: 0 },
}

/* The mount "pop-in" is deliberately CSS, not a framer variant (see
   .mascot-enter in globals.css). A variant that starts at {opacity:0} leaves
   the launcher invisible for good if the animation never runs — which is
   exactly the bug that hid the mascot: `initial="initial"` applied opacity 0
   while `animate` was a mood object with no opacity key. CSS keyframes give
   the same pop while the element's resting style stays visible. */

/** Speech bubble in/out — fade + slide, reusing the Task 4 page-transition feel. */
export const bubbleTransition: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.18, ease: EASE_OUT } },
}
