import { describe, it, expect, beforeEach, vi } from 'vitest'
import { completionPct } from '@/features/exam/scoring'
import { todayKey } from '@/lib/utils'

/**
 * Regression tests for the "reading/listening scores never reach analytics"
 * bug: ReadingView/ListeningView displayed a score on completion but nothing
 * called recordExam, so skill.reading/listening stayed at 0 attempts forever.
 */

// Two 3-question passages; correct option is always index 1
const QUESTIONS = [{ correct: 1 }, { correct: 1 }, { correct: 1 }]

async function freshStore() {
  vi.resetModules()
  localStorage.clear()
  const mod = await import('@/store/useAppStore')
  return mod.useAppStore
}

describe('completionPct', () => {
  it('returns null while the passage is incomplete', () => {
    expect(completionPct({}, 0, 1, QUESTIONS)).toBeNull()
    expect(completionPct({ 0: 1 }, 1, 0, QUESTIONS)).toBeNull()
  })

  it('returns the score when the last answer completes the passage', () => {
    expect(completionPct({ 0: 1, 1: 0 }, 2, 1, QUESTIONS)).toBe(67) // 2/3
    expect(completionPct({ 0: 0, 1: 0 }, 2, 0, QUESTIONS)).toBe(0)
  })

  it('returns null when the passage was already complete (answer changed)', () => {
    expect(completionPct({ 0: 1, 1: 1, 2: 1 }, 0, 0, QUESTIONS)).toBeNull()
  })
})

describe('reading exam recording', () => {
  beforeEach(() => localStorage.clear())

  // Recorded scores stay under PASS_THRESHOLD (65) so celebrate() never
  // fires — canvas-confetti has no 2D context under jsdom.
  it('records one attempt when all questions are answered', async () => {
    const store = await freshStore()
    const s = store.getState()
    s.answerReading('t1', 0, 1, QUESTIONS)
    s.answerReading('t1', 1, 0, QUESTIONS)
    expect(store.getState().skill.reading.attempts).toBe(0)
    s.answerReading('t1', 2, 0, QUESTIONS)

    const sk = store.getState().skill.reading
    expect(sk.attempts).toBe(1)
    expect(sk.best).toBe(33)
    expect(sk.history).toHaveLength(1)
    expect(sk.history[0].score).toBe(33)
    expect(store.getState().dailyHistory[todayKey()].examTaken).toEqual([
      { skill: 'reading', score: 33 },
    ])
  })

  it('does not record again when an answer is changed after completion', async () => {
    const store = await freshStore()
    const s = store.getState()
    QUESTIONS.forEach((_, qi) => s.answerReading('t1', qi, 0, QUESTIONS))
    expect(store.getState().skill.reading.attempts).toBe(1)

    s.answerReading('t1', 0, 1, QUESTIONS)
    expect(store.getState().skill.reading.attempts).toBe(1)
  })

  it('records a new attempt after resetReading', async () => {
    const store = await freshStore()
    const s = store.getState()
    QUESTIONS.forEach((_, qi) => s.answerReading('t1', qi, 0, QUESTIONS))
    expect(store.getState().skill.reading.attempts).toBe(1)

    s.resetReading('t1')
    QUESTIONS.forEach((_, qi) => s.answerReading('t1', qi, 0, QUESTIONS))
    expect(store.getState().skill.reading.attempts).toBe(2)
  })

  it('tracks passages independently', async () => {
    const store = await freshStore()
    const s = store.getState()
    QUESTIONS.forEach((_, qi) => s.answerReading('t1', qi, 0, QUESTIONS))
    s.answerReading('t2', 0, 0, QUESTIONS) // t2 incomplete
    expect(store.getState().skill.reading.attempts).toBe(1)
  })
})

describe('listening exam recording', () => {
  beforeEach(() => localStorage.clear())

  it('records one attempt on completion, none on later changes', async () => {
    const store = await freshStore()
    const s = store.getState()
    s.answerListening('l1', 0, 1, QUESTIONS)
    s.answerListening('l1', 1, 0, QUESTIONS)
    s.answerListening('l1', 2, 0, QUESTIONS)

    const sk = store.getState().skill.listening
    expect(sk.attempts).toBe(1)
    expect(sk.best).toBe(33)
    expect(store.getState().dailyHistory[todayKey()].examTaken).toEqual([
      { skill: 'listening', score: 33 },
    ])

    s.answerListening('l1', 1, 1, QUESTIONS)
    expect(store.getState().skill.listening.attempts).toBe(1)
  })
})
