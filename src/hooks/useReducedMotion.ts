import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'

const query = '(prefers-reduced-motion: reduce)'

/** The operating-system preference alone. */
export function useOsReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(query).matches
  })

  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])
  return reduced
}

/** OS preference OR the in-app «مخفّفة» motion setting. */
export function useReducedMotion(): boolean {
  const reduced = useOsReducedMotion()
  // The in-app «مخفّفة» setting counts too, so every framer-based component
  // in the app (old sections included) honours it, not only the new workspaces.
  const inApp = useAppStore((s) => s.observatory?.settings?.motion === 'reduced')
  return reduced || inApp
}
