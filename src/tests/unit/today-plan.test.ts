import { describe, it, expect } from 'vitest'
import { buildTodayPlan, dueCount, latestMockRun, weakest } from '@/features/plan/todayPlan'
import type { State, VocabWord } from '@/store/types'

const NOW = 1_700_000_000_000
const TODAY = '2026-07-30'

const skillAt = (best: Partial<Record<'reading' | 'listening' | 'writing' | 'speaking', number>>): State['skill'] => ({
  reading: { best: best.reading ?? 0, attempts: 0, history: [] },
  listening: { best: best.listening ?? 0, attempts: 0, history: [] },
  writing: { best: best.writing ?? 0, attempts: 0, history: [] },
  speaking: { best: best.speaking ?? 0, attempts: 0, history: [] },
})

const word = (over: Partial<VocabWord> = {}): VocabWord => ({
  id: Math.random().toString(36).slice(2),
  dutch: 'huis', arabic: 'بيت', example: '', level: 'B1',
  box: 1, due: NOW - 1000, reps: 1,
  ...over,
} as VocabWord)

type PlanState = Parameters<typeof buildTodayPlan>[0]

const base = (over: Partial<PlanState> = {}): PlanState => ({
  vocab: [],
  skill: skillAt({ reading: 80, listening: 40, writing: 70, speaking: 90 }),
  dailyHistory: {},
  prefs: { rate: 0.9, voiceURI: '', autoTTS: true, ttsEngine: 'auto', onlineVoice: 'x', fontSize: 15, studyDayMinutes: 60, minutesPerTask: 30 },
  mockSession: null,
  grammarProgress: {},
  ...over,
} as PlanState)

const input = { now: NOW, todayKey: TODAY, learnedBox: 4, reviewBatch: 20, totalLessons: 34 }

describe('dueCount', () => {
  it('counts only words whose time has come', () => {
    const v = [word({ due: NOW - 1 }), word({ due: NOW + 60_000 }), word({ due: NOW })]
    expect(dueCount(v, NOW, 4)).toBe(2)
  })

  it('skips words already learned', () => {
    expect(dueCount([word({ box: 4 }), word({ box: 5 }), word({ box: 1 })], NOW, 4)).toBe(1)
  })

  it('handles an empty list', () => {
    expect(dueCount([], NOW, 4)).toBe(0)
  })
})

describe('weakest', () => {
  it('picks the lowest best score', () => {
    expect(weakest(skillAt({ reading: 80, listening: 40, writing: 70, speaking: 90 }))).toBe('listening')
  })
  it('is deterministic on an all-zero record', () => {
    expect(weakest(skillAt({}))).toBe('reading')
  })
})

describe('buildTodayPlan — never invents a task', () => {
  it('omits the minute goal when the user set none', () => {
    const p = buildTodayPlan(base({ prefs: { ...base().prefs, studyDayMinutes: 0 } }), input)
    expect(p.tasks.some((t) => t.id === 'minutes')).toBe(false)
  })

  it('omits the grammar task once every lesson is done', () => {
    const all = Object.fromEntries(Array.from({ length: 34 }, (_, i) => [`l${i}`, [1]]))
    const p = buildTodayPlan(base({ grammarProgress: all }), input)
    expect(p.tasks.some((t) => t.id === 'grammar')).toBe(false)
  })

  it('shows the mock task only while a run is open', () => {
    expect(buildTodayPlan(base(), input).tasks.some((t) => t.id === 'mock')).toBe(false)
    const withRun = base({
      mockSession: {
        id: 'm1', skill: 'writing', order: ['writing'], startedAt: NOW, endsAt: NOW + 1000,
        scores: {}, minutes: { reading: 1, listening: 1, writing: 1, speaking: 1 },
      },
    })
    const p = buildTodayPlan(withRun, input)
    const mock = p.tasks.find((t) => t.id === 'mock')
    expect(mock).toBeDefined()
    expect(mock!.urgent).toBe(true)
    expect(mock!.detailAr).toContain('الكتابة')
  })
})

describe('buildTodayPlan — the numbers are real', () => {
  it('states the exact due count and caps the suggested batch', () => {
    const v = Array.from({ length: 50 }, () => word())
    const p = buildTodayPlan(base({ vocab: v }), input)
    const t = p.tasks.find((x) => x.id === 'vocab')!
    expect(t.done).toBe(false)
    expect(t.detailAr).toContain('50')
    expect(t.detailAr).toContain('20')
  })

  it('marks review done and says so when nothing is due', () => {
    const p = buildTodayPlan(base({ vocab: [word({ due: NOW + 999_999 })] }), input)
    const t = p.tasks.find((x) => x.id === 'vocab')!
    expect(t.done).toBe(true)
  })

  it('names the weakest skill and its actual score', () => {
    const p = buildTodayPlan(base(), input)
    const t = p.tasks.find((x) => x.id === 'focus')!
    expect(t.ar).toContain('الاستماع')
    expect(t.detailAr).toContain('40')
  })

  it('marks the focus task done once that skill was practised today', () => {
    const st = base({
      dailyHistory: { [TODAY]: { mins: 0, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [{ skill: 'listening', score: 55 }] } },
    })
    expect(buildTodayPlan(st, input).tasks.find((t) => t.id === 'focus')!.done).toBe(true)
  })

  it('closes the minute goal when the target is met', () => {
    const st = base({
      dailyHistory: { [TODAY]: { mins: 60, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [] } },
    })
    expect(buildTodayPlan(st, input).tasks.find((t) => t.id === 'minutes')!.done).toBe(true)
  })
})

describe('buildTodayPlan — progress and headline', () => {
  it('keeps the percentage inside range and consistent with the count', () => {
    const p = buildTodayPlan(base(), input)
    expect(p.pct).toBeGreaterThanOrEqual(0)
    expect(p.pct).toBeLessThanOrEqual(100)
    expect(p.pct).toBe(Math.round((p.doneCount / p.tasks.length) * 100))
  })

  it('lets a running exam take over the headline', () => {
    const st = base({
      mockSession: {
        id: 'm1', skill: 'reading', order: ['reading'], startedAt: NOW, endsAt: NOW + 1,
        scores: {}, minutes: { reading: 1, listening: 1, writing: 1, speaking: 1 },
      },
    })
    expect(buildTodayPlan(st, input).headlineAr).toContain('امتحان كامل')
  })

  it('announces a fully finished day', () => {
    const all = Object.fromEntries(Array.from({ length: 34 }, (_, i) => [`l${i}`, [1]]))
    const st = base({
      vocab: [],
      grammarProgress: all,
      dailyHistory: { [TODAY]: { mins: 60, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [{ skill: 'listening', score: 70 }] } },
    })
    const p = buildTodayPlan(st, input)
    expect(p.doneCount).toBe(p.tasks.length)
    expect(p.headlineAr).toContain('أنجزت مهام اليوم')
  })

  it('uses ASCII digits only, so check:digits can never fail on it', () => {
    const p = buildTodayPlan(base({ vocab: [word(), word()] }), input)
    const text = [p.headlineAr, ...p.tasks.map((t) => t.ar + t.detailAr)].join(' ')
    // Escaped on purpose: writing the range literally would itself trip check:digits.
    expect(/[\u0660-\u0669]/.test(text)).toBe(false)
  })
})

describe('latestMockRun', () => {
  const run = (id: string, finishedAt: number, total: number) => ({ id, startedAt: 0, finishedAt, scores: {}, total })

  it('returns null with no history', () => {
    expect(latestMockRun([])).toBeNull()
  })

  it('picks the run that finished last, whatever the array order', () => {
    const runs = [run('a', 300, 50), run('c', 900, 70), run('b', 600, 60)]
    expect(latestMockRun(runs)!.id).toBe('c')
  })
})
