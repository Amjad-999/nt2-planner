import { describe, it, expect, vi } from 'vitest'
import { reconcileInburgeringExams, DEFAULT_INBURGERING_EXAMS } from '@/data/inburgering'
import { defaultState, applyState } from '@/store/migration'
import { mergeStates } from '@/features/cloud/merge'
import type { State } from '@/store/types'

const IDS = ['lezen', 'luisteren', 'schrijven', 'spreken', 'knm']

describe('reconcileInburgeringExams', () => {
  it('returns the 5 canonical defaults when nothing is saved', () => {
    const r = reconcileInburgeringExams(null)
    expect(r.map((e) => e.id)).toEqual(IDS)
    expect(r.every((e) => !e.passed && e.examDate === null)).toBe(true)
    expect(r.find((e) => e.id === 'lezen')!.daysLeft).toBe(57)
    expect(r.find((e) => e.id === 'knm')!.daysLeft).toBe(25)
  })

  it('overlays saved passed + examDate but keeps names and day-seed from code', () => {
    const saved = [{ id: 'lezen', nameNL: 'HACKED', nameAR: 'x', daysLeft: 999, passed: true, examDate: '2026-09-01T09:00:00.000Z' }]
    const lezen = reconcileInburgeringExams(saved).find((e) => e.id === 'lezen')!
    expect(lezen.passed).toBe(true)
    expect(lezen.examDate).toBe('2026-09-01T09:00:00.000Z')
    expect(lezen.nameNL).toBe('Lezen')   // from code, not the saved blob
    expect(lezen.daysLeft).toBe(57)       // seed from code, not the saved blob
  })

  it('drops an invalid examDate to null and tolerates malformed entries', () => {
    const r = reconcileInburgeringExams([
      { id: 'lezen', passed: 1, examDate: 'not-a-date' },
      null, 'x', 42, { noId: true },
    ])
    const lezen = r.find((e) => e.id === 'lezen')!
    expect(lezen.passed).toBe(true)       // coerced from truthy 1
    expect(lezen.examDate).toBeNull()     // invalid date rejected
    expect(r).toHaveLength(5)             // still all 5 canonical
  })

  it('ignores a saved id that is not one of the canonical five', () => {
    const r = reconcileInburgeringExams([{ id: 'ghost', passed: true }])
    expect(r.map((e) => e.id)).toEqual(DEFAULT_INBURGERING_EXAMS.map((e) => e.id))
  })
})

describe('migration — inburgeringExams', () => {
  it('defaultState seeds the 5 exams', () => {
    expect(defaultState().inburgeringExams).toHaveLength(5)
  })

  it('applyState reconstructs user state from a saved blob', () => {
    const s = applyState({ inburgeringExams: [{ id: 'knm', passed: true, examDate: null }] })
    expect(s.inburgeringExams.find((e) => e.id === 'knm')!.passed).toBe(true)
    expect(s.inburgeringExams.find((e) => e.id === 'lezen')!.passed).toBe(false)
  })

  it('applyState with the field absent falls back to defaults', () => {
    const s = applyState({ name: 'x' })
    expect(s.inburgeringExams).toHaveLength(5)
    expect(s.inburgeringExams.every((e) => !e.passed)).toBe(true)
  })
})

describe('cloud merge — inburgeringExams', () => {
  function withExams(saved: unknown, savedAt: number): State {
    const s = defaultState()
    s.inburgeringExams = reconcileInburgeringExams(saved)
    s._savedAt = savedAt
    return s
  }

  it('the newer state wins for a shared exam', () => {
    const older = withExams([{ id: 'lezen', passed: false }], 100)
    const newer = withExams([{ id: 'lezen', passed: true }], 200)
    // order-independent: newer must win whichever side it is passed as
    expect(mergeStates(older, newer).inburgeringExams.find((e) => e.id === 'lezen')!.passed).toBe(true)
    expect(mergeStates(newer, older).inburgeringExams.find((e) => e.id === 'lezen')!.passed).toBe(true)
  })

  it('stays at 5 exams and does not duplicate across repeated sync cycles', () => {
    let m = mergeStates(defaultState(), defaultState())
    for (let i = 0; i < 5; i++) m = mergeStates(m, m)
    expect(m.inburgeringExams).toHaveLength(5)
    expect(m.inburgeringExams.map((e) => e.id)).toEqual(IDS)
  })
})

describe('store actions — inburgering', () => {
  async function freshStore() {
    vi.resetModules()
    localStorage.clear()
    const mod = await import('@/store/useAppStore')
    return mod.useAppStore
  }

  it('setInburgeringExamPassed toggles state and persists to localStorage', async () => {
    const store = await freshStore()
    store.getState().setInburgeringExamPassed('lezen', true)
    expect(store.getState().inburgeringExams.find((e) => e.id === 'lezen')!.passed).toBe(true)

    const saved = JSON.parse(localStorage.getItem('nt2planner_v6')!)
    const lezen = saved.state.inburgeringExams.find((e: { id: string }) => e.id === 'lezen')
    expect(lezen.passed).toBe(true)
  })

  it('setInburgeringExamDate stores and clears the exam date', async () => {
    const store = await freshStore()
    store.getState().setInburgeringExamDate('spreken', '2026-09-01T09:00:00.000Z')
    expect(store.getState().inburgeringExams.find((e) => e.id === 'spreken')!.examDate).toBe('2026-09-01T09:00:00.000Z')

    store.getState().setInburgeringExamDate('spreken', null)
    expect(store.getState().inburgeringExams.find((e) => e.id === 'spreken')!.examDate).toBeNull()
  })

  it('only touches the targeted exam', async () => {
    const store = await freshStore()
    store.getState().setInburgeringExamPassed('knm', true)
    const others = store.getState().inburgeringExams.filter((e) => e.id !== 'knm')
    expect(others.every((e) => !e.passed)).toBe(true)
  })
})
