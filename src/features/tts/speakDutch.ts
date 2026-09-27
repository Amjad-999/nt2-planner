import { useAppStore } from '@/store/useAppStore'
import { loadVoices, pickVoice, unlockTTS, _voices } from './voices'
import { chunkText, playOneClip, stopAudio, _audioQueue, setQueue, audioSignal } from './audioQueue'

/* Online Dutch TTS = Google Translate (two hosts, second as backup).
   StreamElements' public speech endpoint was shut down (401 since 2026)
   and must not be used. ~200-char limit per request → always chunkText. */
function googleTTSURL(text: string): string {
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=nl&client=tw-ob`
}
function googleTTSBackupURL(text: string): string {
  return `https://translate.googleapis.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=nl&client=gtx`
}

export async function speakOnline(text: string, signal = audioSignal()): Promise<string> {
  const chunks = chunkText(text)
  let firstLabel: string | null = null
  for (const chunk of chunks) {
    let label: string
    try {
      label = await playOneClip(googleTTSURL(chunk), 'google', signal)
    } catch (error) {
      if (signal.aborted) throw error
      label = await playOneClip(googleTTSBackupURL(chunk), 'google-backup', signal)
    }
    if (!firstLabel) firstLabel = label
  }
  return firstLabel ?? 'online'
}

export function speakBrowser(text: string, signal = audioSignal()): Promise<string> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(new DOMException('Stopped', 'AbortError')); return }
    if (!('speechSynthesis' in window)) return reject(new Error('no speechSynthesis'))
    if (!_voices.length) { try { loadVoices() } catch { /* voice list unavailable — pickVoice falls back to null */ } }
    try { window.speechSynthesis.cancel() } catch { /* synthesis in an odd state — nothing to cancel */ }
    const chunks = chunkText(text)
    const v = pickVoice()
    // Never read Dutch with a non-Dutch voice — wrong phonetics are worse
    // than no audio; rejecting lets the caller fall back to online TTS
    if (!v || !/^nl/i.test(v.lang)) return reject(new Error('no Dutch voice installed'))
    let i = 0, settled = false
    const fin = (ok: boolean, err?: Error) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      signal.removeEventListener('abort', abort)
      if (ok) resolve('browser')
      else reject(err ?? new Error('speech err'))
    }
    const abort = () => fin(false, new DOMException('Stopped', 'AbortError'))
    signal.addEventListener('abort', abort, { once: true })
    function speakNext() {
      if (settled) return
      if (i >= chunks.length) return fin(true)
      const u = new SpeechSynthesisUtterance(chunks[i++])
      u.lang = 'nl-NL'
      u.rate = Math.max(0.7, Math.min(1.2, useAppStore.getState().prefs.rate ?? 0.95))
      u.pitch = 1.0
      u.voice = v
      u.onend = () => speakNext()
      u.onerror = (e) => fin(false, new Error((e as SpeechSynthesisErrorEvent).error || 'speech err'))
      window.speechSynthesis.speak(u)
    }
    const timer = setTimeout(() => {
      fin(false, new Error('Speech timed out'))
      window.speechSynthesis.cancel()
    }, Math.max(15000, text.length * 180))
    speakNext()
  })
}

export function speakDutch(text: string, btnEl?: HTMLElement | null, options?: { onError?: () => void }): Promise<void> {
  if (!text) return _audioQueue
  const trimmed = String(text).trim()
  unlockTTS()
  stopAudio()
  const signal = audioSignal()

  if (btnEl) {
    if (!btnEl.dataset.orig) btnEl.dataset.orig = btnEl.textContent ?? '🔊'
    btnEl.textContent = '⏳'
    ;(btnEl as HTMLButtonElement).disabled = true
  }
  const finish = () => {
    if (btnEl) {
      btnEl.textContent = btnEl.dataset.orig ?? '🔊'
      ;(btnEl as HTMLButtonElement).disabled = false
    }
  }

  const job = (async () => {
    const engine = useAppStore.getState().prefs.ttsEngine ?? 'auto'
    if (!_voices.length) { try { loadVoices() } catch { /* voice list unavailable — engine fallbacks below cover it */ } }

    try {
      if (engine === 'browser') {
        await speakBrowser(trimmed, signal)
      } else if (engine === 'online') {
        if (!navigator.onLine) throw new Error('offline')
        try { await speakOnline(trimmed, signal) }
        catch { await speakBrowser(trimmed, signal) }
      } else {
        // auto: online Google Dutch first — pronunciation is guaranteed
        // correct, while device voices vary wildly (and speakBrowser now
        // rejects when no genuine Dutch voice is installed)
        if (navigator.onLine) {
          try { await speakOnline(trimmed, signal) }
          catch { await speakBrowser(trimmed, signal) }
        } else {
          await speakBrowser(trimmed, signal)
        }
      }
    } catch (e) {
      if (signal.aborted) { finish(); return }
      try {
        if (engine === 'online') await speakBrowser(trimmed, signal)
        else if (navigator.onLine) await speakOnline(trimmed, signal)
        else throw e
      } catch {
        console.warn('TTS failed:', e)
        if (!signal.aborted) options?.onError?.()
      }
    }
    finish()
  })()

  setQueue(job)
  return job
}

export function stopSpeak() { stopAudio() }

export async function testAudio(): Promise<string> {
  const t = 'Hallo, dit is een test van de Nederlandse uitspraak. Het werkt!'
  const engine = useAppStore.getState().prefs.ttsEngine
  if (engine === 'browser') { await speakBrowser(t); return '✅ يعمل عبر متصفّحك (نطق محلّي).' }
  if (engine === 'online') {
    const eng = await speakOnline(t)
    return `✅ يعمل عبر الإنترنت (${eng}) — صوت طبيعي.`
  }
  if (navigator.onLine) {
    try { const eng = await speakOnline(t); return `✅ يعمل عبر الإنترنت (${eng}).` }
    catch { await speakBrowser(t); return '✅ يعمل عبر متصفّحك (تلقائي fallback).' }
  } else {
    await speakBrowser(t); return '✅ يعمل عبر متصفّحك (أنت بدون إنترنت).'
  }
}
