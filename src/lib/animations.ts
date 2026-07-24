import type { Transition, Variants } from 'framer-motion'

/**
 * Shared framer-motion variants/transitions. Import ONLY into files that
 * already use framer-motion (Dashboard, FlashCard, WordCard, MotionFx, …).
 * TopBar/NavTabs/AppShell deliberately stay framer-free — the page-transition
 * on tab switch is plain CSS (.tab-in in globals.css), not AnimatePresence,
 * so framer-motion never loads on the boot path. See AppShell.tsx's comment
 * on the section swap for the reasoning; don't reintroduce framer there.
 *
 * Every variant here is meant to be used together with the app's own
 * useReducedMotion() hook (@/hooks/useReducedMotion) at the call site —
 * this file has no opinion on reduced-motion by itself, same as Reveal/Tilt
 * in MotionFx.tsx.
 */

export const EASE_OUT = [0.2, 0.7, 0.2, 1] as const

/** Fade + slide, 0.3s ease-out — for content that mounts/unmounts within an
 *  already-framer view (e.g. inside a section, not the top-level tab swap). */
export const pageTransition: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: EASE_OUT } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2, ease: EASE_OUT } },
}

/** Stagger a list's children 0.05s apart. Wrap the container in
 *  `variants={staggerContainer} initial="initial" animate="animate"`, and
 *  give each child `variants={staggerItem}` (no separate initial/animate
 *  needed on the child — it inherits from the container). */
export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.05 } },
}
export const staggerItem: Variants = {
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE_OUT } },
}

/** Spring physics for animated fills (progress bars, meters). Pair with
 *  `animate={{ width: pct + '%' }} transition={springFill}`. */
export const springFill: Transition = { type: 'spring', stiffness: 120, damping: 18, mass: 0.7 }

/** Button interactions — spread onto whileTap/whileHover. */
export const buttonTap = { scale: 0.95 }
export const buttonHover = { y: -2 }

/** Success-state emoji: pops in with a small spring overshoot + slight
 *  rotation. Pair with confetti (@/lib/celebrate) for the full success beat. */
export const emojiBounce: Variants = {
  initial: { scale: 0.4, opacity: 0, rotate: -12 },
  animate: {
    scale: 1, opacity: 1, rotate: 0,
    transition: { type: 'spring', stiffness: 300, damping: 12 },
  },
}
