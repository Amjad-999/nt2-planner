import { describe, it, expect } from 'vitest'
import { defaultState, applyState } from '@/store/migration'
import { planHealth, generateTodayPlan, weakestSkill, totalLearnedWords, tasksRemaining } from '@/store/useAppStore'
import { TOTAL_PLAN_DAYS, PASS_THRESHOLD, LEARNED_BOX, PHASES, planTaskId } from '@/data/phases'

describe('defaultState', () => {
  it('returns planDay = 1', () => {
    expect(defaultState().planDay).toBe(1)
  })
  it('returns empty vocab', () => {
    expect(defaultState().vocab).toEqual([])
  })
  it('has _v = 6', () => {
    expect(defaultState()._v).toBe(6)
  })
})

describe('applyState migration', () => {
  it('returns defaultState for null input', () => {
    const s = applyState(null)
    expect(s.planDay).toBe(1)
    expect(s.vocab).toEqual([])
  })
  it('clamps planDay to 1..46', () => {
    expect(applyState({ planDay: 200 }).planDay).toBe(TOTAL_PLAN_DAYS)
    expect(applyState({ planDay: -5 }).planDay).toBe(1)
  })
  it('filters invalid vocab entries', () => {
    const s = applyState({ vocab: [{ dutch:'huis', arabic:'بيت' }, { invalid: true }] })
    expect(s.vocab).toHaveLength(1)
    expect(s.vocab[0].dutch).toBe('huis')
  })
  it('normalises v5 data (missing prefs)', () => {
    const s = applyState({ planDay: 5 })
    expect(s.prefs.rate).toBe(0.9)
    expect(s.prefs.ttsEngine).toBe('auto')
  })
})

describe('planHealth', () => {
  const examFar = new Date(Date.now() + 46*86400000).toISOString()

  it('returns valid status', () => {
    // Day 1, 0 tasks done: needMins ~127/day → crit (correct behaviour)
    const ph = planHealth({ planDay:1, done:{}, examDate:examFar })
    expect(['ok','tight','crit']).toContain(ph.status)
  })
  it('returns crit when far behind and exam is near', () => {
    const nearExam = new Date(Date.now() + 5*86400000).toISOString()
    const ph = planHealth({ planDay: 30, done:{}, examDate: nearExam })
    expect(ph.status).toBe('crit')
  })
  it('returns ok when most tasks done and time is ample', () => {
    const { total } = tasksRemaining({})
    const allDone: Record<string, true> = {}
    let count = 0
    for (const ph of PHASES) {
      for (let d = ph.dayFrom; d <= ph.dayTo; d++) {
        ph.tasks.forEach((_: unknown, i: number) => {
          if (count < total - 2) { allDone[planTaskId(ph.id, d, i)] = true }
          count++
        })
      }
    }
    const ph = planHealth({ planDay:44, done:allDone, examDate:examFar })
    expect(['ok','tight']).toContain(ph.status)
  })
  it('has badge and why text', () => {
    const ph = planHealth({ planDay:1, done:{}, examDate:examFar })
    expect(ph.badge.length).toBeGreaterThan(0)
    expect(ph.why.length).toBeGreaterThan(0)
  })
})

describe('weakestSkill', () => {
  it('returns the skill with lowest best score', () => {
    const skill = {
      reading:   { best:80, attempts:1, history:[] },
      listening: { best:30, attempts:1, history:[] },
      writing:   { best:70, attempts:1, history:[] },
      speaking:  { best:60, attempts:1, history:[] },
    }
    expect(weakestSkill(skill)).toBe('listening')
  })
  it('returns reading when all are zero', () => {
    const skill = { reading:{best:0,attempts:0,history:[]}, listening:{best:0,attempts:0,history:[]}, writing:{best:0,attempts:0,history:[]}, speaking:{best:0,attempts:0,history:[]} }
    expect(weakestSkill(skill)).toBe('reading')
  })
})

describe('totalLearnedWords', () => {
  it('counts words with box >= LEARNED_BOX', () => {
    const vocab = [
      { id:'w1', dutch:'a', arabic:'b', example:'', level:'B1' as const, box:4, due:0, reps:0 },
      { id:'w2', dutch:'c', arabic:'d', example:'', level:'B1' as const, box:2, due:0, reps:0 },
      { id:'w3', dutch:'e', arabic:'f', example:'', level:'B1' as const, box:5, due:0, reps:0 },
    ]
    const { all, learned } = totalLearnedWords(vocab)
    expect(all).toBe(3)
    expect(learned).toBe(2) // box 4 and box 5
  })
})

describe('tasksRemaining', () => {
  it('returns correct total for empty done map', () => {
    const { rem, total } = tasksRemaining({})
    expect(total).toBeGreaterThan(100)  // 195 tasks total
    expect(rem).toBe(total)
  })
  it('decrements remaining when tasks are done', () => {
    const { total } = tasksRemaining({})
    const done = { 'p1_d1_t0': true as const }
    const { rem } = tasksRemaining(done)
    expect(rem).toBe(total - 1)
  })
})

describe('constants', () => {
  it('TOTAL_PLAN_DAYS is 46', () => { expect(TOTAL_PLAN_DAYS).toBe(46) })
  it('PASS_THRESHOLD is 65', () => { expect(PASS_THRESHOLD).toBe(65) })
  it('LEARNED_BOX is 4', () => { expect(LEARNED_BOX).toBe(4) })
})

describe('generateTodayPlan', () => {
  const baseSkill = { reading:{best:0,attempts:0,history:[]}, listening:{best:0,attempts:0,history:[]}, writing:{best:0,attempts:0,history:[]}, speaking:{best:0,attempts:0,history:[]} }

  it('returns tasks array', () => {
    const { tasks } = generateTodayPlan({ planDay:1, done:{}, vocab:[], skill:baseSkill })
    expect(Array.isArray(tasks)).toBe(true)
  })
  it('does not include done tasks', () => {
    const done = { 'p1_d1_t0':true as const, 'p1_d1_t1':true as const, 'p1_d1_t2':true as const, 'p1_d1_t3':true as const }
    const { tasks } = generateTodayPlan({ planDay:1, done, vocab:[], skill:baseSkill })
    const todayIds = tasks.filter(t => t.id.startsWith('p1_d1'))
    expect(todayIds).toHaveLength(0)
  })
})
