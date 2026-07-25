import { describe, it, expect, vi } from 'vitest'
import { defaultState, applyState } from '@/store/migration'
import { mergeStates } from '@/features/cloud/merge'
import { deriveHeroProgress, shouldCelebrateGoal } from '@/components/hero/heroProgress'
import { todayKey } from '@/lib/utils'

describe('goalCelebratedOn — defaults & sanitization', () => {
  it('defaults to empty (never celebrated)', () => {
    expect(defaultState().goalCelebratedOn).toBe('')
  })

  it('applyState keeps a valid dayKey', () => {
    expect(applyState({ goalCelebratedOn: '2026-07-20' }).goalCelebratedOn).toBe('2026-07-20')
  })

  it('applyState clears junk that would out-sort every real date', () => {
    // 'zzz' > any 'YYYY-MM-DD' lexicographically — if it survived, the merge
    // max would keep it forever and celebrations would be permanently muted.
    expect(applyState({ goalCelebratedOn: 'zzz' }).goalCelebratedOn).toBe('')
  })

  it('applyState clears non-strings and absence', () => {
    expect(applyState({ goalCelebratedOn: 42 }).goalCelebratedOn).toBe('')
    expect(applyState({}).goalCelebratedOn).toBe('')
  })
})

describe('goalCelebratedOn — cloud merge', () => {
  const withGoal = (day: string, savedAt: number) => ({ ...defaultState(), goalCelebratedOn: day, _savedAt: savedAt })

  it('takes the lexicographic max in both directions', () => {
    const older = withGoal('2026-07-19', 1)
    const newer = withGoal('2026-07-20', 2)
    expect(mergeStates(older, newer).goalCelebratedOn).toBe('2026-07-20')
    expect(mergeStates(newer, older).goalCelebratedOn).toBe('2026-07-20')
  })

  it('a device that already celebrated today beats one that has not — even if the empty side saved later', () => {
    const celebrated = withGoal('2026-07-25', 1)
    const silent = withGoal('', 999)
    expect(mergeStates(celebrated, silent).goalCelebratedOn).toBe('2026-07-25')
    expect(mergeStates(silent, celebrated).goalCelebratedOn).toBe('2026-07-25')
  })
})

describe('markGoalCelebrated — store action', () => {
  async function freshStore() {
    vi.resetModules()
    localStorage.clear()
    const mod = await import('@/store/useAppStore')
    return mod.useAppStore
  }

  it('sets the flag and persists it to localStorage', async () => {
    const store = await freshStore()
    const day = todayKey()
    store.getState().markGoalCelebrated(day)
    expect(store.getState().goalCelebratedOn).toBe(day)

    const saved = JSON.parse(localStorage.getItem('nt2planner_v6')!)
    expect(saved.state.goalCelebratedOn).toBe(day)
  })

  it('is idempotent for the same day', async () => {
    const store = await freshStore()
    const day = todayKey()
    store.getState().markGoalCelebrated(day)
    store.getState().markGoalCelebrated(day)
    expect(store.getState().goalCelebratedOn).toBe(day)
  })
})

describe('shouldCelebrateGoal — the once-per-day lifecycle', () => {
  const TODAY = '2026-07-25'
  const TOMORROW = '2026-07-26'

  it('fires exactly once: a live crossing on an unconsumed day', () => {
    expect(shouldCelebrateGoal({ prevMins: 30, todayMins: 60, targetMins: 60, celebratedOn: '', today: TODAY }))
      .toBe('fire')
  })

  it('after firing (flag = today), every further evaluation skips', () => {
    // same session, more minutes logged
    expect(shouldCelebrateGoal({ prevMins: 60, todayMins: 90, targetMins: 60, celebratedOn: TODAY, today: TODAY }))
      .toBe('skip')
    // simulated remount: fresh component, prevMins reset to null, flag persisted
    expect(shouldCelebrateGoal({ prevMins: null, todayMins: 90, targetMins: 60, celebratedOn: TODAY, today: TODAY }))
      .toBe('skip')
  })

  it('a remount that discovers an already-met goal on an unconsumed day consumes silently, never fires', () => {
    expect(shouldCelebrateGoal({ prevMins: null, todayMins: 60, targetMins: 60, celebratedOn: '', today: TODAY }))
      .toBe('consume')
    // yesterday's flag does not protect today — but a mount is still not a crossing
    expect(shouldCelebrateGoal({ prevMins: null, todayMins: 60, targetMins: 60, celebratedOn: TODAY, today: TOMORROW }))
      .toBe('consume')
  })

  it('a new day key re-arms it: yesterday consumed, today crosses live → fire', () => {
    expect(shouldCelebrateGoal({ prevMins: 30, todayMins: 60, targetMins: 60, celebratedOn: TODAY, today: TOMORROW }))
      .toBe('fire')
  })

  it('never does anything while the goal is unmet', () => {
    expect(shouldCelebrateGoal({ prevMins: 0, todayMins: 59, targetMins: 60, celebratedOn: '', today: TODAY }))
      .toBe('skip')
  })
})

describe('deriveHeroProgress', () => {
  it('classifies goal-met / on-track / behind', () => {
    expect(deriveHeroProgress(60, 60)).toBe('goal-met')
    expect(deriveHeroProgress(90, 60)).toBe('goal-met')
    expect(deriveHeroProgress(1, 60)).toBe('on-track')
    expect(deriveHeroProgress(59, 60)).toBe('on-track')
    expect(deriveHeroProgress(0, 60)).toBe('behind')
  })

  it('a zero-minute target never counts as met', () => {
    expect(deriveHeroProgress(0, 0)).toBe('behind')
    expect(deriveHeroProgress(30, 0)).toBe('on-track')
  })
})
