import { speakOnline, speakBrowser, stopSpeak } from '@/features/tts/speakDutch'
import { unlockTTS } from '@/features/tts/voices'
import { useAppStore } from '@/store/useAppStore'

/* ── Generated Dutch speech with an honest outcome ─────────────────────────
   speakDutch() in features/tts swallows failures (it resolves either way), so
   a lesson could never tell the learner "audio is unavailable". This wrapper
   tries the same engines in the same order but REJECTS when none works, and
   ignores late results from a playback that was stopped or replaced. */

let token = 0

export type SpeechOutcome = 'done' | 'stopped' | 'unavailable'

export async function playDutch(text: string): Promise<SpeechOutcome> {
  const my = ++token
  stopSpeak()
  unlockTTS()
  const engine = useAppStore.getState().prefs.ttsEngine ?? 'auto'
  const online = typeof navigator === 'undefined' || navigator.onLine
  const tries = engine === 'browser' ? [speakBrowser]
    : engine === 'online' ? (online ? [speakOnline, speakBrowser] : [speakBrowser])
      : online ? [speakOnline, speakBrowser] : [speakBrowser]
  for (const t of tries) {
    try {
      await t(text)
      return my === token ? 'done' : 'stopped'
    } catch {
      if (my !== token) return 'stopped'
    }
  }
  return my === token ? 'unavailable' : 'stopped'
}

export function stopDutch(): void {
  token++
  stopSpeak()
}
