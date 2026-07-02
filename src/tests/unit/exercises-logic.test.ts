import { describe, it, expect } from 'vitest'
import {
  buildSortExercise,
  buildMatchExercise,
  buildGapExercise,
  checkSortOrder,
  checkMatching,
  checkGap,
} from '@/features/exercises/logic'

// ── buildSortExercise edge cases ─────────────────────────────────────────────
describe('buildSortExercise', () => {
  it('returns null for undefined input', () => {
    expect(buildSortExercise(undefined)).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(buildSortExercise('')).toBeNull()
  })

  it('returns null for whitespace-only string', () => {
    expect(buildSortExercise('   ')).toBeNull()
  })

  it('returns null for single-word sentence', () => {
    expect(buildSortExercise('Hallo')).toBeNull()
  })

  it('returns a valid exercise for a normal sentence', () => {
    const result = buildSortExercise('Ik hou van leren', 42)
    expect(result).not.toBeNull()
    expect(result!.words).toHaveLength(4)
    expect(result!.correctIds).toHaveLength(4)
    expect(result!.sentence).toBe('Ik hou van leren')
  })

  it('shuffled words contain all original words', () => {
    const result = buildSortExercise('Ik ga naar school vandaag', 1)
    expect(result).not.toBeNull()
    const wordSet = new Set(result!.words.map(w => w.word))
    expect(wordSet).toContain('Ik')
    expect(wordSet).toContain('school')
    expect(wordSet).toContain('vandaag')
  })

  it('correctIds matches the original word order', () => {
    const result = buildSortExercise('een twee drie vier vijf', 99)
    expect(result).not.toBeNull()
    // correctIds should be w0..w4 in order
    expect(result!.correctIds).toEqual(['w0', 'w1', 'w2', 'w3', 'w4'])
  })
})

// ── checkSortOrder ────────────────────────────────────────────────────────────
describe('checkSortOrder', () => {
  it('returns true for correct order', () => {
    expect(checkSortOrder(['w0', 'w1', 'w2'], ['w0', 'w1', 'w2'])).toBe(true)
  })

  it('returns false for wrong order', () => {
    expect(checkSortOrder(['w1', 'w0', 'w2'], ['w0', 'w1', 'w2'])).toBe(false)
  })

  it('returns false for different lengths', () => {
    expect(checkSortOrder(['w0', 'w1'], ['w0', 'w1', 'w2'])).toBe(false)
  })
})

// ── buildMatchExercise with empty words ───────────────────────────────────────
describe('buildMatchExercise', () => {
  it('works with more than 5 words', () => {
    const words = Array.from({ length: 8 }, (_, i) => ({ nl: `word${i}`, ar: `كلمة${i}` }))
    const result = buildMatchExercise(words, 5, 1)
    expect(result.pairs).toHaveLength(5)
    expect(result.nlShuffled).toHaveLength(5)
    expect(result.arShuffled).toHaveLength(5)
  })

  it('works with fewer words than count', () => {
    const words = [{ nl: 'hallo', ar: 'مرحبا' }, { nl: 'dag', ar: 'يوم' }]
    const result = buildMatchExercise(words, 5, 1)
    expect(result.pairs).toHaveLength(2)
  })

  it('works with exactly 0 words — returns empty exercise not crash', () => {
    const result = buildMatchExercise([], 5, 1)
    expect(result.pairs).toHaveLength(0)
    expect(result.nlShuffled).toHaveLength(0)
  })
})

// ── checkMatching ─────────────────────────────────────────────────────────────
describe('checkMatching', () => {
  it('marks all correct when mapping matches', () => {
    const pairs = [
      { id: 'p0', nl: 'a', ar: 'أ' },
      { id: 'p1', nl: 'b', ar: 'ب' },
    ]
    const { results, correct } = checkMatching({ p0: 'p0', p1: 'p1' }, pairs)
    expect(correct).toBe(2)
    expect(results.p0).toBe(true)
    expect(results.p1).toBe(true)
  })

  it('marks incorrect for wrong mapping', () => {
    const pairs = [{ id: 'p0', nl: 'a', ar: 'أ' }, { id: 'p1', nl: 'b', ar: 'ب' }]
    const { results } = checkMatching({ p0: 'p1', p1: 'p0' }, pairs)
    expect(results.p0).toBe(false)
    expect(results.p1).toBe(false)
  })
})

// ── buildGapExercise / checkGap ───────────────────────────────────────────────
describe('buildGapExercise', () => {
  it('splits sentence around the answer word', () => {
    const ex = buildGapExercise('Ik ga naar school', 'naar', ['hallo', 'dag'], 1)
    expect(ex.before).toBe('Ik ga ')
    expect(ex.after).toBe(' school')
    expect(ex.answer).toBe('naar')
  })

  it('includes correct answer chip and up to 3 distractors', () => {
    const ex = buildGapExercise('test word here', 'word', ['a', 'b', 'c', 'd'], 1)
    expect(ex.chips.some(c => c.id === 'ans')).toBe(true)
    expect(ex.chips.length).toBeLessThanOrEqual(4)
  })
})

describe('checkGap', () => {
  it('returns true for correct answer id', () => {
    expect(checkGap('ans', 'ans')).toBe(true)
  })
  it('returns false for wrong id', () => {
    expect(checkGap('d0', 'ans')).toBe(false)
  })
  it('returns false for null placed', () => {
    expect(checkGap(null, 'ans')).toBe(false)
  })
})
