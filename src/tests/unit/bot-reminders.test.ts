import { describe, it, expect, vi } from 'vitest'
import { defaultState, applyState } from '@/store/migration'
import { mergeStates } from '@/features/cloud/merge'

async function freshStore() {
  vi.resetModules()
  localStorage.clear()
  const mod = await import('@/store/useAppStore')
  return mod.useAppStore
}

describe('botWordReminders (تذكير كلمات كاتيا)', () => {
  it('defaults to enabled', () => {
    expect(defaultState().botWordReminders).toBe(true)
  })

  it('toggle flips the flag and persists it', async () => {
    const store = await freshStore()
    expect(store.getState().botWordReminders).toBe(true)
    store.getState().toggleBotWordReminders()
    expect(store.getState().botWordReminders).toBe(false)
    const saved = JSON.parse(localStorage.getItem('nt2planner_v6')!)
    expect(saved.state.botWordReminders).toBe(false)
  })

  it('applyState sanitizes non-boolean values back to the default', () => {
    expect(applyState({ botWordReminders: 'nee' }).botWordReminders).toBe(true)
    expect(applyState({ botWordReminders: false }).botWordReminders).toBe(false)
  })

  it('cloud merge keeps the newer side (settings are newer-wins)', () => {
    const older = { ...defaultState(), botWordReminders: true, _savedAt: 1 }
    const newer = { ...defaultState(), botWordReminders: false, _savedAt: 2 }
    expect(mergeStates(older, newer).botWordReminders).toBe(false)
    expect(mergeStates(newer, older).botWordReminders).toBe(false)
  })
})
