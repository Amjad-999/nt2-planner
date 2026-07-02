import { useCallback, useRef } from 'react'
import { useMotionValue, useSpring, useTransform, useReducedMotion } from 'framer-motion'
import type { MotionValue } from 'framer-motion'

// Gate once at module load — never true on touch-only devices
const canHover =
  typeof window !== 'undefined' &&
  window.matchMedia('(hover: hover) and (pointer: fine)').matches

const SPRING = { stiffness: 350, damping: 35, mass: 0.4 }

export interface SpotlightReturn {
  overlayRef: React.RefObject<HTMLDivElement | null>
  motionStyle: { rotateX: MotionValue<number>; rotateY: MotionValue<number>; transformPerspective: number } | Record<string, never>
  handlers: { onMouseMove: React.MouseEventHandler<HTMLElement>; onMouseLeave: React.MouseEventHandler<HTMLElement> } | Record<string, never>
}

export function useSpotlight(): SpotlightReturn {
  const reduced = useReducedMotion()

  // Always create motion values — hooks must not be conditional
  const rawX = useMotionValue(0.5)
  const rawY = useMotionValue(0.5)
  const springX = useSpring(rawX, SPRING)
  const springY = useSpring(rawY, SPRING)
  const rotateY = useTransform(springX, [0, 1], [-6, 6])
  const rotateX = useTransform(springY, [0, 1], [6, -6])

  const overlayRef = useRef<HTMLDivElement>(null)
  const rafId = useRef(0)

  const onMouseMove = useCallback<React.MouseEventHandler<HTMLElement>>((e) => {
    // Capture before RAF — React nullifies currentTarget after the handler returns
    const clientX = e.clientX
    const clientY = e.clientY
    const target = e.currentTarget as HTMLElement
    cancelAnimationFrame(rafId.current)
    rafId.current = requestAnimationFrame(() => {
      const rect = target.getBoundingClientRect()
      // Use clientX - rect.left so RTL layout doesn't affect the result
      const nx = (clientX - rect.left) / rect.width
      const ny = (clientY - rect.top) / rect.height
      rawX.set(nx)
      rawY.set(ny)
      if (overlayRef.current) {
        overlayRef.current.style.setProperty('--spot-x', `${nx * 100}%`)
        overlayRef.current.style.setProperty('--spot-y', `${ny * 100}%`)
      }
    })
  }, [rawX, rawY])

  const onMouseLeave = useCallback<React.MouseEventHandler<HTMLElement>>(() => {
    rawX.set(0.5)
    rawY.set(0.5)
  }, [rawX, rawY])

  if (!canHover || reduced) {
    return { overlayRef, motionStyle: {}, handlers: {} }
  }

  return {
    overlayRef,
    motionStyle: { rotateX, rotateY, transformPerspective: 800 },
    handlers: { onMouseMove, onMouseLeave },
  }
}
