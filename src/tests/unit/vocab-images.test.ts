import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const idbStore = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: vi.fn((k: string) => Promise.resolve(idbStore.get(k))),
  set: vi.fn((k: string, v: unknown) => { idbStore.set(k, v); return Promise.resolve() }),
}))

async function freshModule() {
  vi.resetModules()
  idbStore.clear()
  return import('@/features/vocab/images')
}

const onLineDescriptor = Object.getOwnPropertyDescriptor(window.navigator, 'onLine')
function setOnline(value: boolean) {
  Object.defineProperty(window.navigator, 'onLine', { configurable: true, value })
}

function jsonResponse(body: unknown, status = 200): Response {
  return { ok: status < 400, status, json: async () => body } as Response
}

describe('word meaning photos (Pixabay)', () => {
  beforeEach(() => setOnline(true))
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
    if (onLineDescriptor) Object.defineProperty(window.navigator, 'onLine', onLineDescriptor)
  })

  it('does nothing without an API key configured', async () => {
    vi.stubEnv('VITE_PIXABAY_API_KEY', '')
    const { getWordImage } = await freshModule()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const url = await getWordImage('de fiets')
    expect(url).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('searches by the bare noun — article and parenthetical suffix stripped', async () => {
    vi.stubEnv('VITE_PIXABAY_API_KEY', 'k')
    const { getWordImage } = await freshModule()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ hits: [{ webformatURL: 'https://cdn.pixabay.com/x.jpg' }] }))
    await getWordImage('de beslissing (nemen)')
    const calledUrl = String(fetchSpy.mock.calls[0][0])
    expect(calledUrl).toContain(`q=${encodeURIComponent('beslissing')}`)
  })

  it('caches a found photo and never asks Pixabay for that word again', async () => {
    vi.stubEnv('VITE_PIXABAY_API_KEY', 'k')
    const { getWordImage } = await freshModule()
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValue(jsonResponse({ hits: [{ webformatURL: 'https://cdn.pixabay.com/fiets.jpg' }] }))
    const first = await getWordImage('de fiets')
    const second = await getWordImage('de fiets')
    expect(first).toBe('https://cdn.pixabay.com/fiets.jpg')
    expect(second).toBe('https://cdn.pixabay.com/fiets.jpg')
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('caches "no photo" permanently when Pixabay has no hits', async () => {
    vi.stubEnv('VITE_PIXABAY_API_KEY', 'k')
    const { getWordImage } = await freshModule()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(jsonResponse({ hits: [] }))
    const first = await getWordImage('ondanks')
    const second = await getWordImage('ondanks')
    expect(first).toBeNull()
    expect(second).toBeNull()
    expect(fetchSpy).toHaveBeenCalledTimes(1)
  })

  it('does not cache a network failure, so it can retry later', async () => {
    vi.stubEnv('VITE_PIXABAY_API_KEY', 'k')
    const { getWordImage } = await freshModule()
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(new Error('offline'))
    const first = await getWordImage('huis')
    fetchSpy.mockResolvedValueOnce(jsonResponse({ hits: [{ webformatURL: 'https://cdn.pixabay.com/huis.jpg' }] }))
    const second = await getWordImage('huis')
    expect(first).toBeNull()
    expect(second).toBe('https://cdn.pixabay.com/huis.jpg')
  })

  it('skips the network entirely while offline', async () => {
    vi.stubEnv('VITE_PIXABAY_API_KEY', 'k')
    const { getWordImage } = await freshModule()
    setOnline(false)
    const fetchSpy = vi.spyOn(globalThis, 'fetch')
    const url = await getWordImage('school')
    expect(url).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
