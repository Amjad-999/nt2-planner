import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Regression guard: switching tabs must not push the whole state to the cloud.
 *
 * cloudStore subscribes to the app store to schedule a debounced sync. The
 * subscription used to fire on ANY change, and activeTab lives in that same
 * store — so a tab press queued a full read-merge-write of the entire blob.
 * save() and the persist partialize both strip activeTab; the subscription has
 * to agree with them.
 *
 * These tests drive the real subscription through the real app store, and
 * assert on whether a sync was actually scheduled.
 */

async function freshCloud() {
  vi.resetModules()
  localStorage.clear()

  vi.doMock('@/lib/supabase', () => ({
    cloudConfigured: () => true,
    CLOUD_TABLE: 'nt2_state',
    getCloud: () =>
      Promise.resolve({
        auth: {
          getSession: () => Promise.resolve({ data: { session: null } }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
        },
        from: () => ({
          select: () => ({ eq: () => ({ maybeSingle: () => Promise.resolve({ data: null, error: null }) }) }),
          upsert: () => Promise.resolve({ error: null }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }),
      }),
  }))

  const { useCloud } = await import('@/features/cloud/cloudStore')
  const { useAppStore } = await import('@/store/useAppStore')

  // init() wires the subscription; it needs the session round-trip to settle.
  useCloud.getState().init()
  await vi.advanceTimersByTimeAsync(0)
  useCloud.setState({ user: { id: 'u1' }, status: 'idle' })

  const syncNow = vi.fn(() => Promise.resolve())
  useCloud.setState({ syncNow })

  return { useCloud, useAppStore, syncNow }
}

/** Runs past the store's 4 s debounce. */
async function settleDebounce() {
  await vi.advanceTimersByTimeAsync(4500)
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
})

describe('what schedules a cloud sync', () => {
  it('does NOT sync when only the active tab changed', async () => {
    const { useAppStore, syncNow } = await freshCloud()

    useAppStore.getState().setActiveTab('vocab')
    useAppStore.getState().setActiveTab('stats')
    await settleDebounce()

    expect(useAppStore.getState().activeTab).toBe('stats')
    expect(syncNow).not.toHaveBeenCalled()
  })

  it('DOES sync when real user progress changed', async () => {
    const { useAppStore, syncNow } = await freshCloud()

    useAppStore.getState().unlockBadge('first-word')
    await settleDebounce()

    expect(useAppStore.getState().unlockedBadges).toContain('first-word')
    expect(syncNow).toHaveBeenCalled()
  })

  it('a tab change mixed in with real progress still syncs', async () => {
    const { useAppStore, syncNow } = await freshCloud()

    useAppStore.getState().setActiveTab('books')
    useAppStore.getState().toggleBookUnit('taalcompleet-a1', 3)
    await settleDebounce()

    expect(syncNow).toHaveBeenCalled()
  })
})
