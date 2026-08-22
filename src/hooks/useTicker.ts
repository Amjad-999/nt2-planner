import { useEffect, useState } from 'react'

/**
 * طابع زمني حيّ يتجدّد كل ثانية — لمؤقّتات العدّ التنازلي وحدها.
 *
 * `useNow()` is a mount-time snapshot and is the right default everywhere else;
 * this is its ticking sibling for screens that must show seconds move. It never
 * accumulates: each tick reads the wall clock afresh, so a throttled background
 * tab or a sleeping device simply resumes with the correct value instead of
 * drifting behind. The visibility listener forces an immediate resync the
 * moment the tab comes back, without waiting for the next interval.
 */
export function useTicker(intervalMs = 1000): number {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const tick = () => setNow(Date.now())
    const id = setInterval(tick, intervalMs)
    const onVisible = () => { if (!document.hidden) tick() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
      window.removeEventListener('focus', onVisible)
    }
  }, [intervalMs])

  return now
}
