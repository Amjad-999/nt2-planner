import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mergeStates } from '@/features/cloud/merge'
import { applyState, defaultState } from '@/store/migration'
import { startSession } from '@/features/observatory/session'
import { findItem } from '@/data/observatory/items'

/* The observatory field rides the existing persistence and sync paths.
   These pin the four-file contract (types · migration · merge · store). */

async function freshStore() {
  vi.resetModules()
  localStorage.clear()
  const mod = await import('@/store/useAppStore')
  return mod.useAppStore
}

beforeEach(() => { localStorage.clear() })

describe('observatory in the store', () => {
  it('has a default, survives applyState, and junk is sanitised', () => {
    expect(defaultState().observatory.settings.skin).toBe('observatory')
    const s = applyState({ observatory: { settings: { motion: 'expressive' }, history: 'nope' } })
    expect(s.observatory.settings.motion).toBe('expressive')
    expect(s.observatory.history).toEqual([])
  })

  it('updateObservatory persists immediately (reload keeps a live session)', async () => {
    const store = await freshStore()
    store.getState().updateObservatory((o) => startSession(o, findItem('obs-werk')!, [], Date.now(), '2026-09-23'))
    const raw = JSON.parse(localStorage.getItem('nt2planner_v6')!)
    expect(raw.state.observatory.session.itemId).toBe('obs-werk')
  })

  it('cloud merge keeps the field (not silently dropped)', () => {
    const a = defaultState()
    const b = { ...defaultState(), _savedAt: 10 }
    b.observatory = { ...b.observatory, notes: [{ id: 'n', text: 'x', ref: '', createdAt: 1, updatedAt: 1, deleted: false }] }
    expect(mergeStates(a, b).observatory.notes).toHaveLength(1)
  })
})

describe('import is validated before anything is replaced', () => {
  it('rejects an unrelated JSON file and leaves current data untouched', async () => {
    const store = await freshStore()
    store.getState().saveSettings({ name: 'Amal' })
    expect(store.getState().importData('{"foo":1,"bar":2}')).toBe(false)
    expect(store.getState().importData('{}')).toBe(false)
    expect(store.getState().name).toBe('Amal')
  })

  it('imports a real backup and can undo it', async () => {
    const store = await freshStore()
    store.getState().saveSettings({ name: 'Amal' })
    const backup = JSON.stringify({ state: { ...defaultState(), name: 'Other', vocab: [], dailyHistory: {} }, version: 6 })
    expect(store.getState().importData(backup)).toBe(true)
    expect(store.getState().name).toBe('Other')
    expect(store.getState().undoImport()).toBe(true)
    expect(store.getState().name).toBe('Amal')
  })
})

describe('landing', () => {
  it('opens on Today by default', async () => {
    const store = await freshStore()
    expect(store.getState().activeTab).toBe('today')
  })
})
