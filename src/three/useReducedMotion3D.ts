import { useState, useEffect } from 'react'

/**
 * Returns true when 3D / heavy animation should be disabled:
 *  - OS/browser signals prefers-reduced-motion
 *  - Battery API reports < 20 % charge while unplugged
 *
 * FIX 2 — WebGL detection removed from the hard-disable path.
 * Synchronous canvas.getContext() is unreliable on some Windows GPU
 * configurations (hardware acceleration disabled, certain drivers) and
 * would return null even though the browser can render WebGL fine once
 * the actual R3F Canvas mounts.  Instead:
 *  - We only hard-disable here for signals the USER explicitly chose
 *    (reduced-motion preference, critically low battery).
 *  - A soft WebGL test runs in useEffect and logs a console warning so
 *    the developer can see what's happening; it doesn't disable 3D.
 *  - Hero3D wraps the canvas in an ErrorBoundary — if R3F truly cannot
 *    initialise WebGL it will throw and the 2D fallback will render.
 */
export function useReducedMotion3D(): boolean {
  const [reduce, setReduce] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true
    // Hard-disable only for explicit prefers-reduced-motion
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    // 1. React to OS reduced-motion changes
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const motionHandler = (e: MediaQueryListEvent) => {
      if (e.matches) setReduce(true)
    }
    mq.addEventListener('change', motionHandler)

    // 2. Battery API — disable on critically low battery while unplugged
    if ('getBattery' in navigator) {
      ;(navigator as Navigator & {
        getBattery: () => Promise<{ charging: boolean; level: number }>
      })
        .getBattery()
        .then((bat) => {
          if (!bat.charging && bat.level < 0.2) setReduce(true)
        })
        .catch(() => {/* unavailable — ignore */})
    }

    // 3. Soft WebGL check — diagnostic only, does NOT disable 3D
    try {
      const c = document.createElement('canvas')
      const ctx = c.getContext('webgl2') ?? c.getContext('webgl') ?? c.getContext('experimental-webgl')
      if (!ctx) {
        // Log so the developer can see why the 3D scene may not render,
        // but let R3F attempt anyway — it has its own error handling.
        console.warn(
          '[NT2 3D] canvas.getContext(webgl) returned null — ' +
          'hardware acceleration may be disabled. ' +
          'R3F will attempt to render; Hero3D ErrorBoundary will catch failures.'
        )
      }
    } catch (e) {
      console.warn('[NT2 3D] WebGL probe threw:', e)
    }

    return () => mq.removeEventListener('change', motionHandler)
  }, [])

  return reduce
}
