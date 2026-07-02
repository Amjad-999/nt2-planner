import { describe, it, expect } from 'vitest'
import {
  scheduleCard, isFsrsLearned, boxToFsrsFields, formatIntervalAr,
  LEARNED_STABILITY, wordToCard,
} from '@/features/vocab/fsrs'

const base = { due: Date.now(), reps: 0 }

describe('scheduleCard', () => {
  it('Again (0) produces short interval', () => {
    const { intervalDays } = scheduleCard(base, 0)
    expect(intervalDays).toBeLessThanOrEqual(1)
  })

  it('Easy (3) gives longer interval than Hard (1)', () => {
    const { intervalDays: hard } = scheduleCard(base, 1)
    const { intervalDays: easy } = scheduleCard(base, 3)
    expect(easy).toBeGreaterThanOrEqual(hard)
  })

  it('Good (2) schedules later than Again (0) for a new card', () => {
    // New cards are in learning-step mode (sub-day), so compare due timestamps
    const { due: againDue } = scheduleCard(base, 0)
    const { due: goodDue }  = scheduleCard(base, 2)
    expect(goodDue).toBeGreaterThanOrEqual(againDue)
  })

  it('returns FSRS fields with stability and state', () => {
    const { fsrsFields } = scheduleCard(base, 2)
    expect(fsrsFields.fsrs_stability).toBeGreaterThan(0)
    expect(fsrsFields.fsrs_state).toBeDefined()
    expect(fsrsFields.fsrs_last_review).toBeDefined()
  })

  it('due epoch is in the future after a Good grade', () => {
    const { due } = scheduleCard(base, 2)
    expect(due).toBeGreaterThan(Date.now())
  })

  it('second review with FSRS state gives longer interval than first', () => {
    const first = scheduleCard(base, 2)
    const second = scheduleCard({ due: first.due, reps: 1, ...first.fsrsFields }, 2)
    expect(second.intervalDays).toBeGreaterThanOrEqual(first.intervalDays)
  })
})

describe('wordToCard', () => {
  it('returns empty card when no FSRS fields present', () => {
    const card = wordToCard(base)
    // State.New = 0
    expect(card.state).toBe(0)
  })

  it('reconstructs card from FSRS fields', () => {
    const { fsrsFields, due } = scheduleCard(base, 2)
    const card = wordToCard({ due, reps: 1, ...fsrsFields })
    expect(card.stability).toBe(fsrsFields.fsrs_stability)
    expect(card.state).toBe(fsrsFields.fsrs_state)
  })
})

describe('isFsrsLearned', () => {
  it('returns true for Review state with high stability', () => {
    expect(isFsrsLearned({ fsrs_state: 2, fsrs_stability: LEARNED_STABILITY + 1 })).toBe(true)
  })

  it('returns false for Review state with low stability', () => {
    expect(isFsrsLearned({ fsrs_state: 2, fsrs_stability: 5 })).toBe(false)
  })

  it('returns false for Learning state even with high stability', () => {
    expect(isFsrsLearned({ fsrs_state: 1, fsrs_stability: 50 })).toBe(false)
  })

  it('returns false when no FSRS fields present', () => {
    expect(isFsrsLearned({})).toBe(false)
  })

  it('threshold is LEARNED_STABILITY', () => {
    expect(isFsrsLearned({ fsrs_state: 2, fsrs_stability: LEARNED_STABILITY })).toBe(true)
    expect(isFsrsLearned({ fsrs_state: 2, fsrs_stability: LEARNED_STABILITY - 1 })).toBe(false)
  })
})

describe('boxToFsrsFields', () => {
  it('returns empty object for box=0', () => {
    expect(boxToFsrsFields(0, Date.now())).toEqual({})
  })

  it('box=1 gives Learning state', () => {
    const fields = boxToFsrsFields(1, Date.now())
    expect(fields.fsrs_state).toBe(1) // State.Learning
    expect(fields.fsrs_stability).toBe(1)
  })

  it('box=3 gives Review state with 7-day stability', () => {
    const fields = boxToFsrsFields(3, Date.now())
    expect(fields.fsrs_state).toBe(2) // State.Review
    expect(fields.fsrs_stability).toBe(7)
  })

  it('box=5 (learned) gives high stability', () => {
    const fields = boxToFsrsFields(5, Date.now())
    expect(fields.fsrs_stability).toBe(30)
  })

  it('clamps box > 5 to box 5', () => {
    const fields = boxToFsrsFields(5, Date.now())
    const clamped = boxToFsrsFields(10, Date.now())
    expect(clamped.fsrs_stability).toBe(fields.fsrs_stability)
  })
})

describe('formatIntervalAr', () => {
  it('returns قريبًا for < 1 day', () => {
    expect(formatIntervalAr(0)).toBe('قريبًا')
    expect(formatIntervalAr(0.5)).toBe('قريبًا')
  })

  it('returns بعد يوم for 1 day', () => {
    expect(formatIntervalAr(1)).toBe('بعد يوم')
  })

  it('returns بعد يومين for 2 days', () => {
    expect(formatIntervalAr(2)).toBe('بعد يومين')
  })

  it('uses Western digits for > 2 days', () => {
    const result = formatIntervalAr(3)
    expect(result).toContain('3')
    expect(result).toContain('أيام')
  })

  it('formats double-digit days correctly', () => {
    const result = formatIntervalAr(14)
    expect(result).toContain('14')
  })
})
