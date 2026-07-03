import { useRef, useEffect, type ReactNode, type CSSProperties } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/* ── M19 shared animation primitives ─────────────────────────────────────────
   All three no-op under prefers-reduced-motion (hooks still run — only the
   rendered output changes — so the rules of hooks hold on toggle). */

const EASE = [0.2, 0.7, 0.2, 1] as const

/** Fade-up once when scrolled into view (scroll-reveal for cards/headings). */
export function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const reduced = useReducedMotion()
  if (reduced) return <>{children}</>
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px 0px' }}
      transition={{ duration: 0.5, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Element springs a few pixels toward the cursor (icon buttons, CTAs). */
export function Magnetic({ children, strength = 0.25, maxShift = 5, className }: {
  children: ReactNode
  strength?: number
  maxShift?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 320, damping: 22, mass: 0.5 })
  const sy = useSpring(y, { stiffness: 320, damping: 22, mass: 0.5 })

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) * strength
    const dy = (e.clientY - (r.top + r.height / 2)) * strength
    x.set(Math.max(-maxShift, Math.min(maxShift, dx)))
    y.set(Math.max(-maxShift, Math.min(maxShift, dy)))
  }
  const onLeave = () => { x.set(0); y.set(0) }

  if (reduced) return <div className={className}>{children}</div>
  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  )
}

/** 3D pointer-tilt (max ±`max`°) with spring return — KPI cards. */
export function Tilt({ children, max = 8, disabled = false, className, style }: {
  children: ReactNode
  max?: number
  disabled?: boolean
  className?: string
  style?: CSSProperties
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const rx = useMotionValue(0)
  const ry = useMotionValue(0)
  const srx = useSpring(rx, { stiffness: 260, damping: 20, mass: 0.6 })
  const sry = useSpring(ry, { stiffness: 260, damping: 20, mass: 0.6 })
  const off = reduced || disabled

  // Snap flat when tilt gets disabled mid-hover (e.g. the card enters edit mode)
  useEffect(() => {
    if (off) { rx.set(0); ry.set(0) }
  }, [off, rx, ry])

  const onMove = (e: React.MouseEvent) => {
    if (off) return
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const px = (e.clientX - r.left) / r.width - 0.5   // −0.5 … 0.5
    const py = (e.clientY - r.top) / r.height - 0.5
    ry.set(px * 2 * max)
    rx.set(-py * 2 * max)
  }
  const onLeave = () => { rx.set(0); ry.set(0) }

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, rotateX: srx, rotateY: sry, transformPerspective: 700 }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </motion.div>
  )
}
