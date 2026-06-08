import { useAppStore } from '@/store/useAppStore'

export const ONLINE_VOICES = [
  { id: 'BrendaNeural',  name: 'Brenda (vrouw, warm)' },
  { id: 'ColetteNeural', name: 'Colette (vrouw, helder)' },
  { id: 'FennaNeural',   name: 'Fenna (vrouw, jong)' },
  { id: 'MaartenNeural', name: 'Maarten (man, neutraal)' },
]

export let _voices: SpeechSynthesisVoice[] = []
export let _bestNlVoice: SpeechSynthesisVoice | null = null
export let _ttsUnlocked = false

function score(v: SpeechSynthesisVoice): number {
  let s = 0
  const n = (v.name ?? '').toLowerCase()
  if (/enhanced|premium|neural|natural|wavenet|online/.test(n)) s += 100
  if (/nl-nl/i.test(v.lang)) s += 50
  if (/nl-be/i.test(v.lang)) s += 30
  if (v.localService) s += 5
  if (/google/i.test(n)) s += 20
  if (/microsoft/i.test(n)) s += 10
  return s
}

export function loadVoices() {
  if (!('speechSynthesis' in window)) return
  _voices = window.speechSynthesis.getVoices() ?? []
  const nl = _voices.filter((v) => /^nl/i.test(v.lang))
  nl.sort((a, b) => score(b) - score(a))
  _bestNlVoice = nl[0] ?? null
}

export function pickVoice(): SpeechSynthesisVoice | null {
  if (!('speechSynthesis' in window)) return null
  const uri = useAppStore.getState().prefs.voiceURI
  if (uri) {
    const v = _voices.find((v) => v.voiceURI === uri)
    if (v) return v
  }
  return _bestNlVoice
}

export function unlockTTS() {
  if (_ttsUnlocked || !('speechSynthesis' in window)) return
  try {
    const u = new SpeechSynthesisUtterance(' ')
    u.volume = 0; u.lang = 'nl-NL'
    window.speechSynthesis.speak(u)
    _ttsUnlocked = true
  } catch {}
}

export function initVoices() {
  if (!('speechSynthesis' in window)) return
  loadVoices()
  window.speechSynthesis.onvoiceschanged = loadVoices
}
