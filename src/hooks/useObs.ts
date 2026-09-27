import { useEffect, useState } from 'react'
import { useAppStore, saveHealthy } from '@/store/useAppStore'
import { useOsReducedMotion } from './useReducedMotion'
import { resolveMotion } from '@/features/observatory/motion'
import type { MotionLevel, ObsState } from '@/features/observatory/types'

/** The observatory slice + its single update entry point. */
export function useObs(): [ObsState, (fn: (o: ObsState) => ObsState) => void] {
  const o = useAppStore((s) => s.observatory)
  const update = useAppStore((s) => s.updateObservatory)
  return [o, update]
}

/** Motion level from the learner's setting, overridden by the OS preference. */
export function useMotionLevel(): MotionLevel {
  const pref = useAppStore((s) => s.observatory?.settings?.motion ?? 'system')
  const os = useOsReducedMotion()
  return resolveMotion(pref, os)
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  return online
}

/** false after a failed local save, true again after the next successful one. */
export function useSaveHealth(): boolean {
  const [ok, setOk] = useState(saveHealthy)
  useEffect(() => {
    const h = (e: Event) => setOk(!!(e as CustomEvent<{ ok: boolean }>).detail?.ok)
    window.addEventListener('nt2:save', h)
    return () => window.removeEventListener('nt2:save', h)
  }, [])
  return ok
}

/** Live media-query match (layout decisions that CSS alone cannot make). */
export function useMedia(query: string): boolean {
  const [match, setMatch] = useState(() => typeof window !== 'undefined' && window.matchMedia(query).matches)
  useEffect(() => {
    const mq = window.matchMedia(query)
    const h = (e: MediaQueryListEvent) => setMatch(e.matches)
    mq.addEventListener?.('change', h)
    return () => mq.removeEventListener?.('change', h)
  }, [query])
  return match
}
