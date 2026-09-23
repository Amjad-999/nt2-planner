import { useEffect, useReducer, useRef, useState, type RefObject } from 'react'
import { saveRecording, loadRecording, deleteRecording } from './recordings'
import { uid } from './state'

/* ── Voice recording with explicit states ───────────────────────────────────
   ready → (permission) → recording → processing → recorded ⇄ playing
   plus: unsupported · denied · error. Every state has a visible UI and an
   exit. The level meter reads the ACTUAL signal (mic while recording, the
   learner's own recording while playing) — nothing is simulated, and nothing
   is transcribed or scored: this app has no speech assessment connected. */

export type RecStatus = 'idle' | 'unsupported' | 'requesting' | 'denied' | 'recording' | 'processing' | 'recorded' | 'playing' | 'error'
export type RecError = '' | 'no-mic' | 'save' | 'missing' | 'unknown'

export interface RecState {
  status: RecStatus
  elapsed: number
  recordingId: string
  durationSec: number
  error: RecError
}

export type RecEvent =
  | { type: 'unsupported' }
  | { type: 'request' }
  | { type: 'granted' }
  | { type: 'denied' }
  | { type: 'tick'; elapsed: number }
  | { type: 'stop' }
  | { type: 'saved'; id: string; durationSec: number }
  | { type: 'play' }
  | { type: 'ended' }
  | { type: 'error'; error: RecError }
  | { type: 'reset' }

export function initialRec(id = '', durationSec = 0): RecState {
  return { status: id ? 'recorded' : 'idle', elapsed: 0, recordingId: id, durationSec, error: '' }
}

/** Pure transition table — exported so the states are testable without a microphone. */
export function recReducer(s: RecState, e: RecEvent): RecState {
  switch (e.type) {
    case 'unsupported': return { ...s, status: 'unsupported' }
    case 'request': return s.status === 'recording' ? s : { ...s, status: 'requesting', error: '' }
    case 'granted': return { ...s, status: 'recording', elapsed: 0 }
    case 'denied': return { ...s, status: 'denied' }
    case 'tick': return s.status === 'recording' ? { ...s, elapsed: e.elapsed } : s
    case 'stop': return s.status === 'recording' ? { ...s, status: 'processing' } : s
    case 'saved': return { ...s, status: 'recorded', recordingId: e.id, durationSec: e.durationSec, error: '' }
    case 'play': return s.recordingId ? { ...s, status: 'playing' } : s
    case 'ended': return s.status === 'playing' ? { ...s, status: 'recorded' } : s
    case 'error': return { ...s, status: 'error', error: e.error }
    case 'reset': return initialRec()
  }
}

interface Options {
  initialId?: string
  initialDuration?: number
  maxSec?: number
  meter?: RefObject<HTMLElement | null>
  onSaved?: (id: string, durationSec: number) => void
  onDiscard?: () => void
}

function isSupported(): boolean {
  return typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined' && !!navigator.mediaDevices?.getUserMedia
}

export function useRecorder({ initialId = '', initialDuration = 0, maxSec = 90, meter, onSaved, onDiscard }: Options) {
  const [state, dispatch] = useReducer(recReducer, undefined, () => initialRec(initialId, initialDuration))
  const [supported] = useState(isSupported)
  const rec = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const chunks = useRef<Blob[]>([])
  const startedAt = useRef(0)
  const ctx = useRef<AudioContext | null>(null)
  const raf = useRef(0)
  const tick = useRef(0)
  const audio = useRef<HTMLAudioElement | null>(null)
  const url = useRef('')
  const cbs = useRef({ onSaved, onDiscard })
  useEffect(() => { cbs.current = { onSaved, onDiscard } })

  const setLevel = (v: number) => { meter?.current?.style.setProperty('--level', v.toFixed(3)) }

  const stopMeter = () => {
    cancelAnimationFrame(raf.current)
    raf.current = 0
    setLevel(0)
    const c = ctx.current
    ctx.current = null
    if (c && c.state !== 'closed') c.close().catch(() => {})
  }

  const runMeter = (connect: (c: AudioContext) => AudioNode | null) => {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC || !meter?.current) return
    try {
      const c = new AC()
      const src = connect(c)
      if (!src) return
      const an = c.createAnalyser()
      an.fftSize = 512
      src.connect(an)
      ctx.current = c
      const buf = new Uint8Array(an.fftSize)
      let smooth = 0
      const loop = () => {
        an.getByteTimeDomainData(buf)
        let sum = 0
        for (let i = 0; i < buf.length; i++) { const d = (buf[i] - 128) / 128; sum += d * d }
        const rms = Math.sqrt(sum / buf.length)
        smooth = smooth * 0.7 + Math.min(1, rms * 3.2) * 0.3
        setLevel(smooth)
        raf.current = requestAnimationFrame(loop)
      }
      raf.current = requestAnimationFrame(loop)
      return an
    } catch { /* metering is decorative — recording works without it */ }
  }

  const releaseMic = () => {
    window.clearInterval(tick.current)
    stream.current?.getTracks().forEach((t) => t.stop())
    stream.current = null
  }

  const stop = () => {
    const r = rec.current
    if (!r || r.state === 'inactive') return
    dispatch({ type: 'stop' })
    r.stop()
  }

  const start = async () => {
    if (!supported) { dispatch({ type: 'unsupported' }); return }
    if (rec.current && rec.current.state !== 'inactive') return
    dispatch({ type: 'request' })
    let s: MediaStream
    try {
      s = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch (err) {
      const name = (err as DOMException)?.name
      if (name === 'NotAllowedError' || name === 'SecurityError') dispatch({ type: 'denied' })
      else if (name === 'NotFoundError' || name === 'OverconstrainedError') dispatch({ type: 'error', error: 'no-mic' })
      else dispatch({ type: 'error', error: 'unknown' })
      return
    }
    stream.current = s
    chunks.current = []
    let r: MediaRecorder
    try { r = new MediaRecorder(s) } catch { releaseMic(); dispatch({ type: 'error', error: 'unknown' }); return }
    rec.current = r
    r.ondataavailable = (e) => { if (e.data.size) chunks.current.push(e.data) }
    r.onstop = async () => {
      const durationSec = Math.round((Date.now() - startedAt.current) / 100) / 10
      releaseMic()
      stopMeter()
      const blob = new Blob(chunks.current, { type: r.mimeType || 'audio/webm' })
      chunks.current = []
      rec.current = null
      const id = uid('r', Date.now())
      const ok = await saveRecording(id, blob)
      if (!ok) { dispatch({ type: 'error', error: 'save' }); return }
      dispatch({ type: 'saved', id, durationSec })
      cbs.current.onSaved?.(id, durationSec)
    }
    startedAt.current = Date.now()
    r.start(250)
    dispatch({ type: 'granted' })
    runMeter((c) => c.createMediaStreamSource(s))
    tick.current = window.setInterval(() => {
      const el = (Date.now() - startedAt.current) / 1000
      dispatch({ type: 'tick', elapsed: el })
      if (el >= maxSec) stop()
    }, 250)
  }

  const stopPlayback = () => {
    const a = audio.current
    if (a) { a.pause(); a.currentTime = 0 }
    stopMeter()
    dispatch({ type: 'ended' })
  }

  const play = async () => {
    if (!state.recordingId) return
    const blob = await loadRecording(state.recordingId)
    if (!blob) { dispatch({ type: 'error', error: 'missing' }); return }
    if (url.current) URL.revokeObjectURL(url.current)
    url.current = URL.createObjectURL(blob)
    const a = new Audio(url.current)
    audio.current = a
    a.onended = () => { stopMeter(); dispatch({ type: 'ended' }) }
    a.onerror = () => { stopMeter(); dispatch({ type: 'error', error: 'missing' }) }
    dispatch({ type: 'play' })
    runMeter((c) => { const src = c.createMediaElementSource(a); src.connect(c.destination); return src })
    a.play().catch(() => { stopMeter(); dispatch({ type: 'ended' }) })
  }

  const discard = async () => {
    if (state.recordingId) await deleteRecording(state.recordingId)
    dispatch({ type: 'reset' })
    cbs.current.onDiscard?.()
  }

  const retry = () => dispatch({ type: 'reset' })

  // Leaving mid-recording keeps the take: stop() saves it through onstop.
  useEffect(() => () => {
    const r = rec.current
    if (r && r.state !== 'inactive') r.stop()
    audio.current?.pause()
    cancelAnimationFrame(raf.current)
    window.clearInterval(tick.current)
    if (url.current) URL.revokeObjectURL(url.current)
  }, [])

  return { state, supported, start, stop, play, stopPlayback, discard, retry }
}
