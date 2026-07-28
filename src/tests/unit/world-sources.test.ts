import { describe, it, expect, vi, afterEach } from 'vitest'
import { defaultState } from '@/store/migration'
import { buildInsights, dueWordCount } from '@/features/mascot/appInsight'
import { todayKey } from '@/lib/utils'

/* عيّنة حقيقية من nl.wiktionary.org (explaintext) — مقصوصة، ببنيتها كما هي.
   وجودها هنا يجعل اختبار المحلّل مستقلًّا عن الشبكة. */
const LOPEN_EXTRACT = `
== Nederlands ==


===== Uitspraak =====
IPA: / ˈlopə(n) / (2 lettergrepen)


===== Woordafbreking =====
lo·pen


===== Woordherkomst en -opbouw =====
In de betekenis van 'gaan' voor het eerst aangetroffen in 901


==== Werkwoord ====
lopen

(Noord-Nederlands) ergatief stappen, gaan, wandelen
▸ Jack was een kale man die 35 jaar geleden de PCT had gelopen.
▸ Meteen liep ik naar mijn tent die was ingestort.


== Engels ==
some english section that must not leak in
`

afterEach(() => { vi.restoreAllMocks() })

/** يركّب استجابة MediaWiki التي تتوقّعها wiktionaryLookup. */
function mockWiktionary(extract: string | null) {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok: true,
    json: async () => ({
      query: { pages: { '1': extract === null ? { missing: '' } : { extract } } },
    }),
  })))
}

describe('wiktionaryLookup', () => {
  it('extracts IPA, syllables, type and real examples from the Dutch section', async () => {
    mockWiktionary(LOPEN_EXTRACT)
    const { wiktionaryLookup } = await import('@/features/world/wiktionary')
    const d = await wiktionaryLookup('lopen')

    expect(d).not.toBeNull()
    expect(d!.ipa).toBe('ˈlopə(n)')
    expect(d!.syllables).toBe('lo·pen')
    expect(d!.typeNL).toBe('Werkwoord')
    expect(d!.typeAR).toBe('فعل')
    expect(d!.examples.length).toBeGreaterThan(0)
    expect(d!.examples[0]).toContain('PCT')
  })

  it('never leaks a following language section into the result', async () => {
    mockWiktionary(LOPEN_EXTRACT)
    const { wiktionaryLookup } = await import('@/features/world/wiktionary')
    const d = await wiktionaryLookup('lopen')
    const all = JSON.stringify(d)
    expect(all).not.toContain('english section')
  })

  it('returns null for a missing page instead of throwing', async () => {
    mockWiktionary(null)
    const { wiktionaryLookup } = await import('@/features/world/wiktionary')
    expect(await wiktionaryLookup('zzzznotaword')).toBeNull()
  })

  it('returns null rather than throwing when the network fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline') }))
    const { wiktionaryLookup } = await import('@/features/world/wiktionary')
    expect(await wiktionaryLookup('fiets')).toBeNull()
  })

  it('caches a real answer but never caches a network failure', async () => {
    vi.resetModules()
    const { wiktionaryLookup } = await import('@/features/world/wiktionary')

    // 1) الشبكة ساقطة — يجب ألّا تُخزَّن النتيجة
    const failing = vi.fn(async () => { throw new Error('offline') })
    vi.stubGlobal('fetch', failing)
    expect(await wiktionaryLookup('lopen')).toBeNull()
    expect(failing).toHaveBeenCalledTimes(1)

    // 2) عاد الاتصال — لا بدّ أن يُعاد الطلب لا أن تُعاد نتيجة الفشل المخزّنة
    const ok = vi.fn(async () => ({
      ok: true,
      json: async () => ({ query: { pages: { '1': { extract: LOPEN_EXTRACT } } } }),
    }))
    vi.stubGlobal('fetch', ok)
    const first = await wiktionaryLookup('lopen')
    expect(first).not.toBeNull()
    expect(ok).toHaveBeenCalledTimes(1)

    // 3) الطلب نفسه ثانيةً — يأتي من الذاكرة بلا طلب شبكة جديد
    const second = await wiktionaryLookup('lopen')
    expect(second).toEqual(first)
    expect(ok).toHaveBeenCalledTimes(1)
  })
})

describe('appInsight', () => {
  it('counts only words that are actually due', () => {
    const now = Date.now()
    const st = {
      vocab: [
        { id: 'a', due: now - 1000, reps: 1, box: 1 },
        { id: 'b', due: now + 999999, reps: 1, box: 1 },
      ],
      examWords: [{ id: 'c', due: now - 500, reps: 0, box: 0 }],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any
    expect(dueWordCount(st, now)).toBe(2)
  })

  it('always produces at least a plan reading, even on a brand-new profile', () => {
    const lines = buildInsights(defaultState())
    expect(lines.length).toBeGreaterThan(0)
    expect(lines.every((l) => l.text.trim().length > 0)).toBe(true)
  })

  it('reports today\'s minutes against the user\'s own goal', () => {
    const s = defaultState()
    s.prefs.studyDayMinutes = 40
    s.dailyHistory[todayKey()] = { mins: 45, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [] }
    const texts = buildInsights(s).map((l) => l.text).join(' | ')
    expect(texts).toContain('45')
    expect(texts).toContain('40')
  })
})
