import { CORE_DICT, type DictEntry } from '@/data/coreDict'

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

async function myMemory(word: string): Promise<{ ar: string } | null> {
  try {
    const u = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(word)}&langpair=nl|ar`
    const r = await fetch(u, { cache: 'force-cache' })
    if (!r.ok) throw new Error('http ' + r.status)
    const j = await r.json()
    const ar = j?.responseData?.translatedText
    if (!ar) throw new Error('no text')
    return { ar: ar.trim() }
  } catch {
    return null
  }
}

export async function aiLookup(word: string): Promise<DictEntry & { tier: number }> {
  const key = word.trim().toLowerCase()

  // Tier 1 — built-in dictionary
  const cached = CORE_DICT[key]
  if (cached) return { ...cached, tier: 1 }

  const level = estimateCEFR(key)
  const article = guessArticle(key)
  const type = guessType(key)

  // Tier 2 — MyMemory
  if (navigator.onLine) {
    const mm = await myMemory(key)
    if (mm) {
      return { nl: key, ar: mm.ar, type, article, level, exampleNL: '', exampleAR: '', source: 'MyMemory (مجاني، بدون مفتاح)', tier: 2 }
    }
  }

  // Tier 3 — rule-based estimate
  return {
    nl: key,
    ar: '(ترجمة تقديرية — راجِع قاموسك)',
    type, article, level,
    exampleNL: 'Voorbeeldzin niet beschikbaar offline.',
    exampleAR: '',
    source: 'تقدير محلّي (بدون إنترنت)',
    tier: 3,
  }
}
