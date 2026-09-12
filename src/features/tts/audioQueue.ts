import { useAppStore } from '@/store/useAppStore'

let _audioEl: HTMLAudioElement | null = null
export let _audioQueue: Promise<void> = Promise.resolve()
let controller = new AbortController()
export const audioSignal = () => controller.signal

function ensureAudio(): HTMLAudioElement {
  if (!_audioEl) {
    _audioEl = new Audio()
    _audioEl.preload = 'auto'
    // No crossOrigin / no Web Audio graph: TTS providers don't send CORS headers.
    // Raw playback is clean; a media-source node taints the element → silence.
    ;(_audioEl as HTMLAudioElement & { preservesPitch?: boolean; mozPreservesPitch?: boolean; webkitPreservesPitch?: boolean }).preservesPitch = true
    ;(_audioEl as HTMLAudioElement & { mozPreservesPitch?: boolean }).mozPreservesPitch = true
    ;(_audioEl as HTMLAudioElement & { webkitPreservesPitch?: boolean }).webkitPreservesPitch = true
  }
  return _audioEl
}

export function chunkText(text: string, maxLen = 180): string[] {
  const t = String(text).trim()
  if (t.length <= maxLen) return [t]
  const parts = t.match(/[^.!?…؟،]+[.!?…؟،]?/g) ?? [t]
  const out: string[] = []
  let buf = ''
  for (const p of parts) {
    if ((buf + ' ' + p).trim().length > maxLen) {
      if (buf) out.push(buf.trim())
      buf = p
    } else {
      buf = (buf + ' ' + p).trim()
    }
  }
  if (buf) out.push(buf.trim())
  return out
}

export function playOneClip(url: string, label: string, signal = audioSignal()): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Stopped', 'AbortError')); return }
    const a = ensureAudio()
    try { a.pause() } catch { /* pause on a fresh element may throw — safe to ignore */ }
    try { a.currentTime = 0 } catch { /* throws before any media is loaded — safe to ignore */ }
    a.src = url
    a.playbackRate = Math.max(0.6, Math.min(1.4, useAppStore.getState().prefs.rate ?? 1.0))
    a.volume = 1.0
    let settled = false
    const cleanup = () => {
      a.onended = null; a.onerror = null; a.oncanplaythrough = null
      clearTimeout(timeout); clearTimeout(retry)
      signal.removeEventListener('abort', abort)
    }
    const finish = (error?: Error) => {
      if (settled) return
      settled = true
      cleanup()
      if (error) { a.pause(); reject(error) } else resolve(label)
    }
    const abort = () => finish(new DOMException('Stopped', 'AbortError'))
    signal.addEventListener('abort', abort, { once: true })
    a.onended = () => finish()
    a.onerror = () => finish(new Error(`${label} load/decode failed`))
    a.oncanplaythrough = () => {
      a.play().catch(finish)
    }
    const timeout = setTimeout(() => finish(new Error('Audio timed out')), 45000)
    const retry = setTimeout(() => { if (!settled && a.readyState >= 2) a.play().catch(finish) }, 1200)
    a.load()
  })
}

export function stopAudio() {
  controller.abort()
  controller = new AbortController()
  try { window.speechSynthesis?.cancel() } catch { /* synthesis in an odd state — nothing to cancel */ }
  try {
    if (_audioEl) {
      _audioEl.pause()
      _audioEl.currentTime = 0
      _audioEl.removeAttribute('src')
      _audioEl.load()
    }
  } catch { /* teardown failure is harmless — the element is being reset anyway */ }
  _audioQueue = Promise.resolve()
}

export function setQueue(q: Promise<void>) { _audioQueue = q }
