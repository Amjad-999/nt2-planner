import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * Regression tests for the "State loaded from storage couldn't be migrated"
 * data-loss bug: persist options had no `version` while save() wrote
 * `{ state, version: 6 }`, so zustand discarded the persisted state on load.
 */

const SK6 = 'nt2planner_v6'

function seed(payload: unknown) {
  localStorage.setItem(SK6, JSON.stringify(payload))
}

async function freshStore() {
  vi.resetModules()
  const mod = await import('@/store/useAppStore')
  return mod.useAppStore
}

describe('persist rehydration', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('hydrates a manual-save v6 payload (data survives reload)', async () => {
    seed({
      state: { name: 'TESTUSER', onboarded: true, studySec: 4242, activeTab: 'exam' },
      version: 6,
    })
    const store = await freshStore()
    expect(store.getState().name).toBe('TESTUSER')
    expect(store.getState().onboarded).toBe(true)
    expect(store.getState().studySec).toBe(4242)
    // activeTab is per-session — must NOT be restored from storage
    expect(store.getState().activeTab).toBe('dashboard')
  })

  it('migrates a version-0 payload written by the middleware before the fix', async () => {
    seed({
      state: { name: 'ZEROVERSION', onboarded: true, studySec: 7, vocab: [] },
      version: 0,
    })
    const store = await freshStore()
    expect(store.getState().name).toBe('ZEROVERSION')
    expect(store.getState().onboarded).toBe(true)
  })

  it('migrates an original raw-S payload (no zustand wrapper)', async () => {
    seed({ name: 'RAWUSER', onboarded: true, planDay: 12, vocab: [] })
    const store = await freshStore()
    expect(store.getState().name).toBe('RAWUSER')
    expect(store.getState().planDay).toBe(12)
  })

  it('starts fresh when storage is empty', async () => {
    const store = await freshStore()
    expect(store.getState().onboarded).toBe(false)
    expect(store.getState().name).toBe('')
  })
})
