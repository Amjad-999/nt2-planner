import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'

/**
 * Regression guard: a cloud request that never settles must not disable
 * syncing for the rest of the session.
 *
 * syncNow() refuses to start while status is already 'syncing'. Before the
 * timeout was added, a stalled request left that status set forever, so every
 * later sync — the 4 s debounce, the visibilitychange handler, a manual
 * press — returned immediately and did nothing until the page was reloaded.
 *
 * @/lib/supabase is snapshotted by cloudStore at module-evaluation time, so it
 * has to be mocked before the first import — same technique as auth-bar and
 * auth-gate.
 */

/** A promise that is deliberately never resolved nor rejected. */
function neverSettles<T>(): Promise<T> {
  return new Promise<T>(() => {})
}

async function freshCloud(behaviour: 'hangs' | 'answers') {
  vi.resetModules()
  localStorage.clear()

  const select = () => ({
    eq: () => ({
      maybeSingle: () =>
        behaviour === 'hangs'
          ? neverSettles<{ data: { data: unknown } | null; error: null }>()
          : Promise.resolve({ data: null, error: null }),
    }),
  })

  vi.doMock('@/lib/supabase', () => ({
    cloudConfigured: () => true,
    CLOUD_TABLE: 'nt2_state',
    getCloud: () =>
      Promise.resolve({
        auth: {},
        from: () => ({
          select,
          upsert: () => Promise.resolve({ error: null }),
          delete: () => ({ eq: () => Promise.resolve({ error: null }) }),
        }),
      }),
  }))

  const { useCloud } = await import('@/features/cloud/cloudStore')
  useCloud.setState({ user: { id: 'u1' }, status: 'idle', message: '' })
  return useCloud
}

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
})

describe('cloud sync timeout', () => {
  it('recovers from a request that never settles instead of wedging on "syncing"', async () => {
    const useCloud = await freshCloud('hangs')

    const pending = useCloud.getState().syncNow()
    // Let the getCloud() microtask chain run so the request is actually in flight.
    await vi.advanceTimersByTimeAsync(0)
    expect(useCloud.getState().status).toBe('syncing')

    // Push past the ceiling. The request itself still never settles.
    await vi.advanceTimersByTimeAsync(20_000)
    await pending

    expect(useCloud.getState().status).toBe('error')
    expect(useCloud.getState().message).toMatch(/انتهت مهلة المزامنة/)
  })

  it('a later sync still runs after a timeout — the guard is released, not stuck', async () => {
    const useCloud = await freshCloud('hangs')

    const first = useCloud.getState().syncNow()
    await vi.advanceTimersByTimeAsync(20_000)
    await first
    expect(useCloud.getState().status).toBe('error')

    // The whole point: this second attempt must get past the re-entrancy guard.
    const second = useCloud.getState().syncNow()
    await vi.advanceTimersByTimeAsync(0)
    expect(useCloud.getState().status).toBe('syncing')
    await vi.advanceTimersByTimeAsync(20_000)
    await second
    expect(useCloud.getState().status).toBe('error')
  })

  it('a request that answers in time still syncs normally', async () => {
    const useCloud = await freshCloud('answers')

    const run = useCloud.getState().syncNow()
    await vi.advanceTimersByTimeAsync(0)
    await run

    expect(useCloud.getState().status).toBe('synced')
    expect(useCloud.getState().message).toBe('')
    expect(useCloud.getState().lastSyncedAt).toBeTypeOf('number')
  })
})
