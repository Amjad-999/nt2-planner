import type { TargetAndTransition, Variants } from 'framer-motion'
import { EASE_OUT, springFill } from '@/lib/animations'

export type MascotMood = 'idle' | 'happy' | 'sad' | 'excited' | 'thinking'

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
}

/** Static (no motion) pose per mood — used verbatim under prefers-reduced-motion. */
export const MOOD_STATIC: Record<MascotMood, TargetAndTransition> = {
  idle: { scale: 1, rotate: 0, y: 0 },
  happy: { scale: 1, rotate: 0, y: -4 },
  sad: { scale: 0.97, rotate: 0, y: 2 },
  excited: { scale: 1.05, rotate: 0, y: 0 },
  thinking: { scale: 1, rotate: 4, y: 0 },
}

/** The character popping into view the first time it mounts. */
export const mascotEntrance: Variants = {
  initial: { scale: 0, opacity: 0 },
  animate: { scale: 1, opacity: 1, transition: springFill },
}

/** Speech bubble in/out — fade + slide, reusing the Task 4 page-transition feel. */
export const bubbleTransition: Variants = {
  initial: { opacity: 0, y: 10, scale: 0.96 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { opacity: 0, y: 6, scale: 0.97, transition: { duration: 0.18, ease: EASE_OUT } },
}
