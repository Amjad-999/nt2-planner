import { useCallback, useEffect, useRef } from 'react'
import { addActive } from '@/features/observatory/session'
import type { ObsState } from '@/features/observatory/types'

/* Measured time, not assumed time: seconds count only while the lesson is on
   screen, the tab is visible, and the learner has interacted (or audio has
   played) in the last two minutes. Flushed into the run every 15 s, on step
   change and on leaving — so "actual minutes" means minutes of real work. */

const IDLE_MS = 120_000
const TICK_MS = 5_000

export function useActiveTime(update: (fn: (o: ObsState) => ObsState) => void): () => void {
  const pending = useRef(0)
  const flush = useCallback(() => {
    const ms = pending.current
    if (ms <= 0) return
    pending.current = 0
    update((o) => addActive(o, ms, Date.now()))
  }, [update])

  useEffect(() => {
    let last = Date.now()
    let prev = Date.now()
    const mark = () => { last = Date.now() }
    const events = ['pointerdown', 'keydown', 'input', 'scroll', 'o-activity'] as const
    events.forEach((e) => window.addEventListener(e, mark, { passive: true }))
    const iv = window.setInterval(() => {
      const t = Date.now()
      const dt = Math.min(t - prev, TICK_MS * 2)
      prev = t
      if (document.visibilityState === 'visible' && t - last < IDLE_MS) pending.current += dt
      if (pending.current >= 15_000) flush()
    }, TICK_MS)
    const onHide = () => { if (document.visibilityState === 'hidden') flush() }
    document.addEventListener('visibilitychange', onHide)
    return () => {
      events.forEach((e) => window.removeEventListener(e, mark))
      document.removeEventListener('visibilitychange', onHide)
      window.clearInterval(iv)
      flush()
    }
  }, [flush])

  return flush
}
