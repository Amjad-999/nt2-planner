import { useState, useEffect } from 'react'

/** Returns true when 3D / heavy animation should be disabled:
 *  - prefers-reduced-motion is set
 *  - WebGL is unavailable
 *  - Battery API reports < 20 % charge while unplugged
 */
export function useReducedMotion3D(): boolean {
  const [reduce, setReduce] = useState<boolean>(() => {
    if (typeof window === 'undefined') return true

    // 1. prefers-reduced-motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true

    // 2. WebGL unavailable
    try {
      const c = document.createElement('canvas')
      if (!c.getContext('webgl2') && !c.getContext('webgl')) return true
    } catch {
      return true
    }

    return false
  })

  useEffect(() => {
    // React to OS reduced-motion changes at runtime
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setReduce(true) }
    mq.addEventListener('change', handler)

    // Battery API (best-effort — not available in all browsers)
    if ('getBattery' in navigator) {
      ;(navigator as Navigator & { getBattery: () => Promise<{ charging: boolean; level: number }> })
        .getBattery()
        .then((bat) => {
          if (!bat.charging && bat.level < 0.2) setReduce(true)
        })
        .catch(() => {/* ignore */})
    }

    return () => mq.removeEventListener('change', handler)
  }, [])

  return reduce
}
