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

/* Magnetic انتقل إلى Magnetic.tsx (نسخة بلا framer) — يستهلكه TopBar في
   مسار الإقلاع، وبقاؤه هنا كان يسحب framer إلى الحزمة الرئيسية */
export { Magnetic } from './Magnetic'

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
