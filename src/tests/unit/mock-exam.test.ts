import { describe, it, expect } from 'vitest'
import {
  MOCK_MINUTES, SKILL_ORDER, advance, buildReport, createSession, formatClock,
  isExpired, isFinished, isValidSession, nextSkill, progressPct, remainingMs, scoreFromState,
} from '@/features/exam/mock'
import type { State } from '@/store/types'

const T0 = 1_700_000_000_000
const MIN = 60_000

const emptySkill: State['skill'] = {
  reading: { best: 0, attempts: 0, history: [] },
  listening: { best: 0, attempts: 0, history: [] },
  writing: { best: 0, attempts: 0, history: [] },
  speaking: { best: 0, attempts: 0, history: [] },
}

describe('createSession', () => {
  it('starts on the first skill with the right deadline', () => {
    const s = createSession(T0)
    expect(s.skill).toBe('reading')
    expect(s.endsAt).toBe(T0 + MOCK_MINUTES.reading * MIN)
    expect(s.scores).toEqual({})
    expect(s.order).toEqual([...SKILL_ORDER])
  })

  it('honours a custom order and custom minutes', () => {
    const mins = { reading: 1, listening: 2, writing: 3, speaking: 4 }
    const s = createSession(T0, ['speaking', 'writing'], mins)
    expect(s.skill).toBe('speaking')
    expect(s.endsAt).toBe(T0 + 4 * MIN)
    expect(nextSkill(s)).toBe('writing')
  })
})

describe('the clock', () => {
  it('counts down and never goes below zero', () => {
    const s = createSession(T0)
    expect(remainingMs(s, T0)).toBe(MOCK_MINUTES.reading * MIN)
    expect(remainingMs(s, T0 + 60 * MIN)).toBe((MOCK_MINUTES.reading - 60) * MIN)
    expect(remainingMs(s, T0 + 999 * MIN)).toBe(0)
  })

  it('expires exactly at the deadline, not before', () => {
    const s = createSession(T0)
    expect(isExpired(s, s.endsAt - 1)).toBe(false)
    expect(isExpired(s, s.endsAt)).toBe(true)
  })

  it('formats without Arabic-Indic digits and without negatives', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(-5000)).toBe('00:00')
    expect(formatClock(65_000)).toBe('01:05')
    expect(formatClock(3_600_000)).toBe('01:00:00')
    expect(formatClock(100 * MIN)).toBe('01:40:00')
    expect(/^[0-9:]+$/.test(formatClock(12_345))).toBe(true)
  })
})

describe('advance', () => {
  it('records the score and resets the clock for the next skill', () => {
    const s = createSession(T0)
    const t1 = T0 + 10 * MIN
    const s2 = advance(s, 72, t1)
    expect(s2.scores.reading).toBe(72)
    expect(s2.skill).toBe('listening')
    expect(s2.endsAt).toBe(t1 + MOCK_MINUTES.listening * MIN)
  })

  it('clamps out-of-range scores', () => {
    const s = createSession(T0)
    expect(advance(s, 150, T0).scores.reading).toBe(100)
    expect(advance(s, -20, T0).scores.reading).toBe(0)
  })

  it('keeps the last skill in place and marks the run finished', () => {
    let s = createSession(T0, ['reading', 'listening'])
    s = advance(s, 60, T0)
    expect(isFinished(s)).toBe(false)
    s = advance(s, 80, T0)
    expect(isFinished(s)).toBe(true)
    expect(s.skill).toBe('listening')
    expect(nextSkill(s)).toBeNull()
  })

  it('reports progress as skills handed in', () => {
    let s = createSession(T0)
    expect(progressPct(s)).toBe(0)
    s = advance(s, 50, T0)
    expect(progressPct(s)).toBe(25)
  })
})

describe('scoreFromState', () => {
  const items = {
    reading: [{ id: 'r1', questions: [{ correct: 0 }, { correct: 1 }] }],
    listening: [{ id: 'l1', questions: [{ correct: 2 }, { correct: 3 }] }],
  }
  const base: Pick<State, 'examReading' | 'examListening' | 'examWriting' | 'examSpeaking'> = {
    examReading: {}, examListening: {}, examWriting: {}, examSpeaking: {},
  }

  it('returns null when nothing has been answered', () => {
    for (const k of SKILL_ORDER) expect(scoreFromState(base, k, items)).toBeNull()
  })

  it('ignores a partly answered passage instead of scoring it low', () => {
    const st = { ...base, examReading: { r1: { 0: 0 } } }
    expect(scoreFromState(st, 'reading', items)).toBeNull()
  })

  it('scores a fully answered passage', () => {
    const all = { ...base, examReading: { r1: { 0: 0, 1: 1 } } }
    expect(scoreFromState(all, 'reading', items)).toBe(100)
    const half = { ...base, examReading: { r1: { 0: 0, 1: 3 } } }
    expect(scoreFromState(half, 'reading', items)).toBe(50)
  })

  it('averages recorded writing scores and skips unscored tasks', () => {
    const st = { ...base, examWriting: { w1: { text: 'x', score: 80 }, w2: { text: '', score: 0 } } }
    expect(scoreFromState(st, 'writing', items)).toBe(80)
  })

  it('averages speaking self-scores', () => {
    const st = { ...base, examSpeaking: { s1: { score: 60, at: 0 }, s2: { score: 80, at: 0 } } }
    expect(scoreFromState(st, 'speaking', items)).toBe(70)
  })
})

describe('buildReport', () => {
  it('only reports skills that were handed in', () => {
    let s = createSession(T0)
    s = advance(s, 70, T0)
    const r = buildReport(s, emptySkill, 65)
    expect(r.rows).toHaveLength(1)
    expect(r.rows[0].skill).toBe('reading')
    expect(r.rows[0].passed).toBe(true)
  })

  it('compares against the previous best and signs the delta', () => {
    let s = createSession(T0, ['reading'])
    s = advance(s, 55, T0)
    const prev: State['skill'] = { ...emptySkill, reading: { best: 70, attempts: 2, history: [] } }
    const r = buildReport(s, prev, 65)
    expect(r.rows[0].prevBest).toBe(70)
    expect(r.rows[0].delta).toBe(-15)
    expect(r.rows[0].passed).toBe(false)
  })

  it('averages the total and names the weakest skill', () => {
    let s = createSession(T0, ['reading', 'listening', 'writing', 'speaking'])
    s = advance(s, 90, T0)
    s = advance(s, 40, T0)
    s = advance(s, 80, T0)
    s = advance(s, 70, T0)
    const r = buildReport(s, emptySkill, 65)
    expect(r.total).toBe(70)
    expect(r.passedCount).toBe(3)
    expect(r.weakest).toBe('listening')
  })

  it('returns a zero total and no weakest skill for an untouched run', () => {
    const r = buildReport(createSession(T0), emptySkill, 65)
    expect(r.total).toBe(0)
    expect(r.weakest).toBeNull()
  })
})

describe('isValidSession — guards what comes back from storage or the cloud', () => {
  it('accepts a real session', () => {
    expect(isValidSession(createSession(T0))).toBe(true)
  })

  const bad: [string, unknown][] = [
    ['null', null],
    ['a string', 'mock'],
    ['missing order', { ...createSession(T0), order: [] }],
    ['unknown skill name', { ...createSession(T0), skill: 'grammar' }],
    ['skill outside its own order', { ...createSession(T0), order: ['listening'], skill: 'reading' }],
    ['unknown skill inside order', { ...createSession(T0), order: ['reading', 'nonsense'] }],
    ['endsAt not a number', { ...createSession(T0), endsAt: 'soon' }],
    ['minutes missing', { ...createSession(T0), minutes: null }],
  ]
  for (const [label, value] of bad) {
    it(`rejects ${label}`, () => expect(isValidSession(value)).toBe(false))
  }
})
