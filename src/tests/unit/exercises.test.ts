import { describe, it, expect } from 'vitest'
import {
  shuffle,
  buildMatchExercise, checkMatching,
  buildSortExercise,  checkSortOrder,
  buildGapExercise,   checkGap,
} from '@/features/exercises/logic'

// ── shuffle ──────────────────────────────────────────────────────────────────
describe('shuffle', () => {
  it('preserves length', () => {
    expect(shuffle([1, 2, 3, 4, 5]).length).toBe(5)
  })
  it('is deterministic with the same seed', () => {
    expect(shuffle([1, 2, 3, 4, 5], 42)).toEqual(shuffle([1, 2, 3, 4, 5], 42))
  })
  it('produces a different order with a different seed (most of the time)', () => {
    const a = shuffle([1, 2, 3, 4, 5, 6, 7], 1)
    const b = shuffle([1, 2, 3, 4, 5, 6, 7], 999)
    expect(a).not.toEqual(b)
  })
  it('does not mutate the original array', () => {
    const orig = [1, 2, 3]
    shuffle(orig, 7)
    expect(orig).toEqual([1, 2, 3])
  })
})

// ── Matching ──────────────────────────────────────────────────────────────────
const PAIRS = [
  { id: 'p0', nl: 'huis', ar: 'بيت' },
  { id: 'p1', nl: 'boom', ar: 'شجرة' },
  { id: 'p2', nl: 'auto', ar: 'سيارة' },
]

describe('checkMatching', () => {
  it('all correct', () => {
    const r = checkMatching({ p0: 'p0', p1: 'p1', p2: 'p2' }, PAIRS)
    expect(r.correct).toBe(3)
    expect(r.total).toBe(3)
    expect(Object.values(r.results).every(Boolean)).toBe(true)
  })
  it('all wrong', () => {
    const r = checkMatching({ p0: 'p1', p1: 'p2', p2: 'p0' }, PAIRS)
    expect(r.correct).toBe(0)
  })
  it('partial match', () => {
    const r = checkMatching({ p0: 'p0', p1: 'p2', p2: 'p1' }, PAIRS)
    expect(r.correct).toBe(1)
    expect(r.results['p0']).toBe(true)
    expect(r.results['p1']).toBe(false)
  })
  it('empty map → 0 correct', () => {
    const r = checkMatching({}, PAIRS)
    expect(r.correct).toBe(0)
    expect(r.total).toBe(3)
  })
})

describe('buildMatchExercise', () => {
  it('respects count', () => {
    const words = Array.from({ length: 10 }, (_, i) => ({ nl: `nl${i}`, ar: `ar${i}` }))
    const ex = buildMatchExercise(words, 4, 1)
    expect(ex.pairs.length).toBe(4)
    expect(ex.nlShuffled.length).toBe(4)
    expect(ex.arShuffled.length).toBe(4)
  })
  it('does not exceed available words', () => {
    const words = [{ nl: 'a', ar: 'b' }]
    const ex = buildMatchExercise(words, 5, 1)
    expect(ex.pairs.length).toBe(1)
  })
})

// ── Sentence ordering ─────────────────────────────────────────────────────────
describe('buildSortExercise', () => {
  it('splits into correct word count', () => {
    const ex = buildSortExercise('Ik ga naar huis morgen', 1)
    expect(ex).not.toBeNull()
    expect(ex!.words.length).toBe(5)
    expect(ex!.correctIds).toEqual(['w0', 'w1', 'w2', 'w3', 'w4'])
  })
  it('contains all original words', () => {
    const ex = buildSortExercise('De kat zit op de mat', 2)
    expect(ex).not.toBeNull()
    const found = ex!.words.map(w => w.word).sort()
    expect(found).toEqual(['De', 'de', 'kat', 'mat', 'op', 'zit'].sort())
  })
})

describe('checkSortOrder', () => {
  it('correct order', () => {
    expect(checkSortOrder(['w0', 'w1', 'w2'], ['w0', 'w1', 'w2'])).toBe(true)
  })
  it('wrong order', () => {
    expect(checkSortOrder(['w1', 'w0', 'w2'], ['w0', 'w1', 'w2'])).toBe(false)
  })
  it('length mismatch', () => {
    expect(checkSortOrder(['w0', 'w1'], ['w0', 'w1', 'w2'])).toBe(false)
  })
})

// ── Fill the gap ──────────────────────────────────────────────────────────────
describe('buildGapExercise', () => {
  it('splits sentence at the answer', () => {
    const ex = buildGapExercise('Ik ga naar huis', 'huis', ['fiets', 'werk', 'school'], 1)
    expect(ex.before).toBe('Ik ga naar ')
    expect(ex.after).toBe('')
    expect(ex.answerId).toBe('ans')
    expect(ex.chips.length).toBe(4)
    expect(ex.chips.some(c => c.id === 'ans')).toBe(true)
  })
  it('answer not in sentence → before contains original sentence', () => {
    // 'fiets' does not appear in 'Ik ben thuis', so before = full sentence + space
    const ex = buildGapExercise('Ik ben thuis', 'fiets', ['huis', 'werk'], 1)
    expect(ex.before).toContain('Ik ben thuis')
    expect(ex.after).toBe('')
  })
})

describe('checkGap', () => {
  it('correct id → true',  () => expect(checkGap('ans', 'ans')).toBe(true))
  it('wrong id   → false', () => expect(checkGap('d0',  'ans')).toBe(false))
  it('null       → false', () => expect(checkGap(null,  'ans')).toBe(false))
})
