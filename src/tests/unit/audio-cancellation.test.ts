import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest'

class FakeAudio {
  preload = ''
  src = ''
  currentTime = 0
  playbackRate = 1
  volume = 1
  readyState = 0
  onended: (() => void) | null = null
  onerror: (() => void) | null = null
  oncanplaythrough: (() => void) | null = null
  pause = vi.fn()
  play = vi.fn(async () => {})
  load = vi.fn()
  removeAttribute = vi.fn()
}

beforeEach(() => {
  vi.resetModules()
  vi.useFakeTimers()
  vi.stubGlobal('Audio', FakeAudio)
  vi.doMock('@/store/useAppStore', () => ({ useAppStore: { getState: () => ({ prefs: { rate: 1, ttsEngine: 'auto' } }) } }))
  vi.doMock('@/features/tts/voices', () => ({ loadVoices: vi.fn(), unlockTTS: vi.fn(), pickVoice: () => null, _voices: [] }))
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('audio cancellation and failure', () => {
  it('settles a pending clip immediately when the learner presses stop', async () => {
    const { playOneClip, stopAudio } = await import('@/features/tts/audioQueue')
    const clip = playOneClip('/test-audio', 'test')
    const result = expect(clip).rejects.toMatchObject({ name: 'AbortError' })
    stopAudio()
    await result
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects silent loading instead of leaving the play button busy forever', async () => {
    const { playOneClip } = await import('@/features/tts/audioQueue')
    const clip = playOneClip('/test-audio', 'test')
    const result = expect(clip).rejects.toThrow('Audio timed out')
    await vi.advanceTimersByTimeAsync(45000)
    await result
    expect(vi.getTimerCount()).toBe(0)
  })

  it('does not fall back to another voice or report an error after an intentional stop', async () => {
    const { speakDutch, stopSpeak } = await import('@/features/tts/speakDutch')
    const { loadVoices } = await import('@/features/tts/voices')
    const onError = vi.fn()
    const job = speakDutch('Goedemorgen.', undefined, { onError })
    stopSpeak()
    await job
    expect(onError).not.toHaveBeenCalled()
    expect(loadVoices).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
