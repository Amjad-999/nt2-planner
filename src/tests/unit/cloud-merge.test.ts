import { describe, it, expect, vi } from 'vitest'
import { mergeStates } from '@/features/cloud/merge'
import { defaultState, applyState } from '@/store/migration'
import { todayKey } from '@/lib/utils'

/**
 * Regression tests for the exam-log explosion bug: examTaken was merged by
 * plain concatenation, and since local == remote after every sync, each sync
 * cycle doubled the log (exponential growth every ~4 s for cloud users).
 */

const DAY = todayKey()

function withExam(taken: { skill: string; score: number }[]) {
  const s = defaultState()
  s.dailyHistory[DAY] = { mins: 10, tasks: 1, wordsAdded: 0, wordsLearned: 0, examTaken: taken }
  return s
}

describe('cloud merge — examTaken', () => {
  it('is idempotent: merging identical states does not duplicate entries', () => {
    const entries = [
      { skill: 'reading', score: 50 },
      { skill: 'reading', score: 50 },
      { skill: 'writing', score: 40 },
    ]
    const m = mergeStates(withExam(entries), withExam(entries))
    expect(m.dailyHistory[DAY].examTaken).toHaveLength(3)
  })

  it('keeps distinct entries from both sides', () => {
    const m = mergeStates(
      withExam([{ skill: 'reading', score: 50 }]),
      withExam([{ skill: 'listening', score: 60 }]),
    )
    expect(m.dailyHistory[DAY].examTaken).toHaveLength(2)
  })

  it('keeps the larger repeat count of an identical entry', () => {
    const m = mergeStates(
      withExam([
        { skill: 'reading', score: 50 },
        { skill: 'reading', score: 50 },
        { skill: 'reading', score: 50 },
      ]),
      withExam([{ skill: 'reading', score: 50 }]),
    )
    expect(m.dailyHistory[DAY].examTaken).toHaveLength(3)
  })

  it('stays stable across repeated sync cycles', () => {
    let m = mergeStates(
      withExam([{ skill: 'reading', score: 50 }]),
      withExam([{ skill: 'reading', score: 50 }]),
    )
    for (let i = 0; i < 5; i++) m = mergeStates(m, m)
    expect(m.dailyHistory[DAY].examTaken).toHaveLength(1)
  })
})

describe('applyState — dailyHistory sanitization', () => {
  it('caps examTaken, clamps counters, and drops malformed entries', () => {
    const taken = Array.from({ length: 500 }, () => ({ skill: 'reading', score: 50 }))
    const s = applyState({
      dailyHistory: {
        [DAY]: { mins: 1e9, tasks: -5, examTaken: [...taken, null, { bad: true }, 'x'] },
      },
    })
    const d = s.dailyHistory[DAY]
    expect(d.examTaken.length).toBeLessThanOrEqual(50)
    expect(d.examTaken.every((e) => typeof e.skill === 'string' && typeof e.score === 'number')).toBe(true)
    expect(d.mins).toBeLessThanOrEqual(1440)
    expect(d.tasks).toBe(0)
  })
})

describe('rehydrate — sanitization on the standard v6 path', () => {
  it('caps an inflated examTaken log when loading a wrapped v6 payload', async () => {
    vi.resetModules()
    localStorage.clear()
    localStorage.setItem('nt2planner_v6', JSON.stringify({
      state: {
        onboarded: true,
        dailyHistory: {
          [DAY]: { mins: 1e9, tasks: 1, wordsAdded: 0, wordsLearned: 0,
            examTaken: Array.from({ length: 500 }, () => ({ skill: 'reading', score: 50 })) },
        },
      },
      version: 6,
    }))
    const { useAppStore } = await import('@/store/useAppStore')
    const d = useAppStore.getState().dailyHistory[DAY]
    expect(d.examTaken.length).toBeLessThanOrEqual(50)
    expect(d.mins).toBeLessThanOrEqual(1440)
  })
})

describe('recordStudyMinutes — input cap', () => {
  it('clamps a single entry to 600 minutes', async () => {
    vi.resetModules()
    localStorage.clear()
    const { useAppStore } = await import('@/store/useAppStore')
    useAppStore.getState().recordStudyMinutes(99999)
    expect(useAppStore.getState().dailyHistory[DAY].mins).toBe(600)
    expect(useAppStore.getState().studySec).toBe(600 * 60)
  })
})
