import { useAppStore } from '@/store/useAppStore'
import { _bestNlVoice, loadVoices, pickVoice, unlockTTS, _voices } from './voices'
import { chunkText, playOneClip, stopAudio, _audioQueue, setQueue } from './audioQueue'

function streamElementsURL(text: string, voice: string): string {
  const v = voice || useAppStore.getState().prefs.onlineVoice || 'FennaNeural'
  return `https://api.streamelements.com/kappa/v2/speech?voice=${encodeURIComponent(v)}&text=${encodeURIComponent(text)}`
}

function googleTTSURL(text: string): string {
  return `https://translate.google.com/translate_tts?ie=UTF-8&q=${encodeURIComponent(text)}&tl=nl&client=tw-ob`
}

export async function speakOnline(text: string, voice?: string): Promise<string> {
  const v = voice ?? useAppStore.getState().prefs.onlineVoice ?? 'FennaNeural'
  const chunks = chunkText(text)
  let firstLabel: string | null = null
  for (const chunk of chunks) {
    let label: string
    try {
      label = await playOneClip(streamElementsURL(chunk, v), 'streamelements')
    } catch {
      label = await playOneClip(googleTTSURL(chunk), 'google')
    }
    if (!firstLabel) firstLabel = label
  }
  return firstLabel ?? 'online'
}

export function speakBrowser(text: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!('speechSynthesis' in window)) return reject(new Error('no speechSynthesis'))
    if (!_voices.length) { try { loadVoices() } catch {} }
    try { window.speechSynthesis.cancel() } catch {}
    const chunks = chunkText(text)
    const v = pickVoice()
    let i = 0, spokeAny = false, settled = false
    const fin = (ok: boolean, err?: Error) => { if (settled) return; settled = true; ok ? resolve('browser') : reject(err ?? new Error('speech err')) }
    function speakNext() {
      if (settled) return
      if (i >= chunks.length) return fin(true)
      const u = new SpeechSynthesisUtterance(chunks[i++])
      u.lang = 'nl-NL'
      u.rate = Math.max(0.7, Math.min(1.2, useAppStore.getState().prefs.rate ?? 0.95))
      u.pitch = 1.0
      if (v) u.voice = v
      u.onend = () => { spokeAny = true; speakNext() }
      u.onerror = (e) => { if (!spokeAny) return fin(false, new Error((e as SpeechSynthesisErrorEvent).error || 'speech err')); speakNext() }
      window.speechSynthesis.speak(u)
    }
    speakNext()
    setTimeout(() => fin(true), Math.max(9000, text.length * 95))
  })
}

export function speakDutch(text: string, btnEl?: HTMLElement | null): Promise<void> {
  if (!text) return _audioQueue
  const trimmed = String(text).trim()
  unlockTTS()
  stopAudio()

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
    if (!_voices.length) { try { loadVoices() } catch {} }
    const hasNativeDutch = !!_bestNlVoice

    try {
      if (engine === 'browser') {
        await speakBrowser(trimmed)
      } else if (engine === 'online') {
        if (!navigator.onLine) throw new Error('offline')
        try { await speakOnline(trimmed) }
        catch { await speakBrowser(trimmed) }
      } else {
        // auto: prefer native Dutch; fall back to online if none installed
        if (hasNativeDutch || !navigator.onLine) {
          try { await speakBrowser(trimmed) }
          catch { if (navigator.onLine) await speakOnline(trimmed); else throw new Error('offline') }
        } else {
          try { await speakOnline(trimmed) }
          catch { await speakBrowser(trimmed) }
        }
      }
    } catch (e) {
      try {
        if (engine === 'online') await speakBrowser(trimmed)
        else if (navigator.onLine) await speakOnline(trimmed)
        else throw e
      } catch {
        console.warn('TTS failed:', e)
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
