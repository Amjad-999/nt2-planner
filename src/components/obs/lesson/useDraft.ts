import { useEffect, useRef, useState } from 'react'
import type { SessionRun } from '@/features/observatory/types'
import { setDraft } from '@/features/observatory/session'
import type { StepProps } from './shared'

/** Typed input that is saved (debounced) into the run, and flushed on unmount. */
export function useDraft(run: SessionRun, key: string, update: StepProps['update']): [string, (v: string) => void] {
  const [value, setValue] = useState(() => run.drafts[key] ?? '')
  const pending = useRef<{ v: string; t: number } | null>(null)
  const set = (v: string) => {
    setValue(v)
    if (pending.current) window.clearTimeout(pending.current.t)
    const t = window.setTimeout(() => { pending.current = null; update((o) => setDraft(o, key, v, Date.now())) }, 400)
    pending.current = { v, t }
  }
  useEffect(() => () => {
    const p = pending.current
    if (p) { window.clearTimeout(p.t); update((o) => setDraft(o, key, p.v, Date.now())) }
  }, [key, update])
  return [value, set]
}
