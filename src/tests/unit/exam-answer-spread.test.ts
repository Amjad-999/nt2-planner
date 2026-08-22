import { describe, it, expect } from 'vitest'
import { EXAM_READING, EXAM_LISTENING, spreadAnswers } from '@/data/examContent'

/**
 * Hand-written multiple choice drifts towards putting the correct answer in the
 * same slot every time. A learner then scores well by picking that slot instead
 * of by reading, which makes the whole exam bank worthless as practice.
 * These tests guard both halves of the fix: the answer must stay correct, and
 * its position must stay spread out as new items are added.
 */

function positionShare(items: { questions: { correct: number }[] }[]) {
  const counts = [0, 0, 0, 0]
  let total = 0
  for (const item of items) {
    for (const q of item.questions) {
      counts[q.correct] += 1
      total += 1
    }
  }
  return { counts, total, max: Math.max(...counts) / total }
}

describe('spreadAnswers', () => {
  it('keeps pointing at the same option text after rotating', () => {
    const q = { opts: ['aa', 'bb', 'cc', 'dd'], correct: 3 }
    for (let salt = 0; salt < 8; salt += 1) {
      const [out] = spreadAnswers([q], salt)
      expect(out.opts[out.correct]).toBe('dd')
      expect([...out.opts].sort()).toEqual(['aa', 'bb', 'cc', 'dd'])
    }
  })

  it('is deterministic — same input gives the same output every call', () => {
    const q = [{ opts: ['a', 'b', 'c', 'd'], correct: 0 }, { opts: ['e', 'f', 'g', 'h'], correct: 2 }]
    expect(spreadAnswers(q, 3)).toEqual(spreadAnswers(q, 3))
  })

  it('leaves questions with fewer than two options untouched', () => {
    const q = [{ opts: ['only'], correct: 0 }]
    expect(spreadAnswers(q, 1)).toEqual(q)
  })
})

describe('exam answer positions', () => {
  it('does not let one position hold more than forty percent of reading answers', () => {
    const { max, counts, total } = positionShare(EXAM_READING)
    expect(total).toBeGreaterThan(0)
    expect(counts.every((c) => c > 0)).toBe(true)
    expect(max).toBeLessThanOrEqual(0.4)
  })

  it('does not let one position hold more than forty percent of listening answers', () => {
    const { max, counts, total } = positionShare(EXAM_LISTENING)
    expect(total).toBeGreaterThan(0)
    expect(counts.every((c) => c > 0)).toBe(true)
    expect(max).toBeLessThanOrEqual(0.4)
  })

  it('keeps every correct index inside the option list', () => {
    for (const item of [...EXAM_READING, ...EXAM_LISTENING]) {
      for (const q of item.questions) {
        expect(q.correct).toBeGreaterThanOrEqual(0)
        expect(q.correct).toBeLessThan(q.opts.length)
      }
    }
  })

  it('has no duplicate options inside a question', () => {
    for (const item of [...EXAM_READING, ...EXAM_LISTENING]) {
      for (const q of item.questions) {
        expect(new Set(q.opts).size).toBe(q.opts.length)
      }
    }
  })
})
