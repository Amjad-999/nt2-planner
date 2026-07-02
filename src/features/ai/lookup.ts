import { CORE_DICT, type DictEntry } from '@/data/coreDict'

/** A bilingual example sentence used to understand a word in context. */
export interface Example { nl: string; ar: string }

/** Result of a lookup: dictionary entry + which tier answered + example sentences. */
export type LookupResult = DictEntry & { tier: number; examples: Example[] }

export function estimateCEFR(word: string): string {
  const w = word.toLowerCase()
  if (CORE_DICT[w]) return CORE_DICT[w].level
  if (w.length <= 4) return 'A2'
  if (w.length <= 7) return 'B1'
  if (/(ing|heid|tion|isme|ische|baar|loos)$/.test(w)) return 'B2'
  if (w.length <= 10) return 'B1'
  return 'B2'
}

function guessArticle(w: string): string {
  const x = w.toLowerCase()
  if (/(je|ke|isme|ment|um|al|sel|aat)$/.test(x)) return 'het'
  if (/(ing|heid|teit|tie|sie|nis|schap|ie)$/.test(x)) return 'de'
  return ''
}

function guessType(w: string): string {
  const x = w.toLowerCase()
  if (/^(ge[a-z]+|[a-z]+en)$/.test(x) && x.length > 4) return 'ww'
  if (/(lijk|baar|loos|ig|isch)$/.test(x)) return 'bijv'
  return 'znw'
}

/** True if the string contains any Arabic-script character (U+0600..U+06FF). */
function hasArabic(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i)
    if (c >= 0x0600 && c <= 0x06ff) return true
  }
  return false
}

interface MMMatch { segment?: string; translation?: string; match?: number | string }
interface MMResponse { responseData?: { translatedText?: string }; matches?: MMMatch[] }

/** One free, keyless, CORS-enabled call: returns the top translation AND raw TM matches. */
async function myMemory(word: string): Promise<{ ar: string; matches: MMMatch[] } | null> {
  try {
    const u = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=nl|ar`
    const r = await fetch(u, { cache: 'force-cache' })
    if (!r.ok) throw new Error('http ' + r.status)
    const j: MMResponse = await r.json()
    const ar = j?.responseData?.translatedText
    if (!ar) throw new Error('no text')
    return { ar: ar.trim(), matches: Array.isArray(j.matches) ? j.matches : [] }
  } catch {
    return null
  }
}

/** Turn MyMemory translation-memory matches into clean Dutch-Arabic example sentences. */
function examplesFromMatches(word: string, matches: MMMatch[]): Example[] {
  const w = word.toLowerCase()
  const stem = w.length > 5 ? w.slice(0, w.length - 2) : w
  const seen = new Set<string>()
  const out: Example[] = []
  const sorted = [...matches].sort((a, b) => (Number(b.match) || 0) - (Number(a.match) || 0))
  for (const m of sorted) {
    const nl = (m.segment || '').trim()
    const ar = (m.translation || '').trim()
    if (!nl || !ar) continue
    if (hasArabic(nl)) continue
    if (!hasArabic(ar)) continue
    const low = nl.toLowerCase()
    if (low === w) continue
    if (!low.includes(w) && !low.includes(stem)) continue
    if (nl.split(/\s+/).length < 2) continue
    if (nl.length < 6 || nl.length > 170) continue
    if (/[<>=]|https?:/i.test(nl)) continue
    const key = low.replace(/\s+/g, ' ')
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ nl, ar })
    if (out.length >= 3) break
  }
  return out
}

/** A guaranteed sentence so the user always gets context, even offline. */
function fallbackExample(word: string, ar?: string): Example {
  const meaning = (ar || '').trim()
  if (meaning && meaning.charAt(0) !== '(') {
    return { nl: `Het woord "${word}" betekent: ${meaning}.`, ar: `الكلمة الهولندية "${word}" تعني: ${meaning}` }
  }
  return { nl: `Ik wil het woord "${word}" goed leren.`, ar: `أريد أن أتعلّم هذه الكلمة الهولندية جيدًا: ${word}` }
}

export async function aiLookup(word: string): Promise<LookupResult> {
  const key = word.trim().toLowerCase()

  // Tier 1 - built-in dictionary (instant, offline). Enrich with live examples when online.
  const cached = CORE_DICT[key]
  if (cached) {
    const examples: Example[] = []
    if (cached.exampleNL) examples.push({ nl: cached.exampleNL, ar: cached.exampleAR || '' })
    if (navigator.onLine) {
      const mm = await myMemory(key)
      if (mm) {
        for (const ex of examplesFromMatches(key, mm.matches)) {
          if (!examples.some((e) => e.nl.toLowerCase() === ex.nl.toLowerCase())) examples.push(ex)
          if (examples.length >= 3) break
        }
      }
    }
    if (examples.length === 0) examples.push(fallbackExample(key, cached.ar))
    return { ...cached, tier: 1, examples }
  }

  const level = estimateCEFR(key)
  const article = guessArticle(key)
  const type = guessType(key)

  // Tier 2 - MyMemory: translation + real example sentences for the word.
  if (navigator.onLine) {
    const mm = await myMemory(key)
    if (mm) {
      let examples = examplesFromMatches(key, mm.matches)
      if (examples.length === 0) examples = [fallbackExample(key, mm.ar)]
      return {
        nl: key, ar: mm.ar, type, article, level,
        exampleNL: examples[0].nl, exampleAR: examples[0].ar,
        source: 'MyMemory (مجاني، بدون مفتاح)', tier: 2, examples,
      }
    }
  }

  // Tier 3 - offline estimate. Still hand back a usable sentence.
  const fb = fallbackExample(key)
  return {
    nl: key,
    ar: '(ترجمة تقديرية - راجِع قاموسك)',
    type, article, level,
    exampleNL: fb.nl, exampleAR: fb.ar,
    source: 'تقدير محلّي (بدون إنترنت)',
    tier: 3,
    examples: [fb],
  }
}
