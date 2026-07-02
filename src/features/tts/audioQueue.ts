import { useAppStore } from '@/store/useAppStore'

let _audioEl: HTMLAudioElement | null = null
export let _audioQueue: Promise<void> = Promise.resolve()

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

export function playOneClip(url: string, label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const a = ensureAudio()
    try { a.pause() } catch { /* pause on a fresh element may throw — safe to ignore */ }
    try { a.currentTime = 0 } catch { /* throws before any media is loaded — safe to ignore */ }
    a.src = url
    a.playbackRate = Math.max(0.6, Math.min(1.4, useAppStore.getState().prefs.rate ?? 1.0))
    a.volume = 1.0
    let settled = false
    const cleanup = () => { a.onended = null; a.onerror = null; a.oncanplaythrough = null }
    a.onended = () => { if (settled) return; settled = true; cleanup(); resolve(label) }
    a.onerror = () => { if (settled) return; settled = true; cleanup(); reject(new Error(`${label} load/decode failed`)) }
    a.oncanplaythrough = () => {
      a.play().catch((err) => { if (settled) return; settled = true; cleanup(); reject(err) })
    }
    a.load()
    setTimeout(() => { if (!settled && a.readyState >= 2) a.play().catch(() => {}) }, 1200)
  })
}

export function stopAudio() {
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
