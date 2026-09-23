import { useEffect, useRef, useState } from 'react'

/** Local text state that is persisted (debounced) through `save`, and flushed
 *  on unmount — typed work survives navigation, reloads and validation errors. */
export function useDebouncedText(initial: string, save: (v: string) => void, ms = 400): [string, (v: string) => void] {
  const [value, setValue] = useState(initial)
  const pending = useRef<{ v: string; t: number } | null>(null)
  const saveRef = useRef(save)
  useEffect(() => { saveRef.current = save })
  const set = (v: string) => {
    setValue(v)
    if (pending.current) window.clearTimeout(pending.current.t)
    const t = window.setTimeout(() => { pending.current = null; saveRef.current(v) }, ms)
    pending.current = { v, t }
  }
  useEffect(() => () => {
    const p = pending.current
    if (p) { window.clearTimeout(p.t); saveRef.current(p.v) }
  }, [])
  return [value, set]
}
