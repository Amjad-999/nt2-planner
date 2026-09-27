import { get, set } from 'idb-keyval'
import { splitArticle } from '@/features/vocab/article'

const CACHE_PREFIX = 'vocab-img:'
// Pixabay's free key allows ~100 requests/60s; this keeps every word lookup
// well under that without a per-request counter.
const MIN_GAP_MS = 700

interface PixabayHit { webformatURL?: string }
interface PixabayResponse { hits?: PixabayHit[] }

let lastRequestAt = 0
// One 429 means the day's quota is gone — stop asking for the rest of the session.
let quotaExceeded = false
const inflight = new Map<string, Promise<string | null>>()

function cleanQuery(nl: string): string {
  const withoutParens = nl.replace(/\([^)]*\)/g, '').trim()
  return splitArticle(withoutParens).word
}

function cacheKey(query: string): string {
  return CACHE_PREFIX + query.toLowerCase()
}

async function throttle(): Promise<void> {
  const now = Date.now()
  const from = Math.max(now, lastRequestAt)
  const wait = from - now
  lastRequestAt = from + MIN_GAP_MS
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
}

async function queryPixabay(query: string, apiKey: string): Promise<string | null> {
  await throttle()
  const url = `https://pixabay.com/api/?key=${apiKey}&q=${encodeURIComponent(query)}&lang=nl&image_type=photo&safesearch=true&per_page=3`
  const res = await fetch(url)
  if (res.status === 429) quotaExceeded = true
  if (!res.ok) throw new Error(`pixabay http ${res.status}`)
  const data: PixabayResponse = await res.json()
  return data.hits?.[0]?.webformatURL ?? null
}

/** Resolve once, cache forever — a network failure is not cached, so it can retry later. */
async function resolveAndCache(key: string, query: string, apiKey: string): Promise<string | null> {
  try {
    const url = await queryPixabay(query, apiKey)
    await set(key, url ?? '').catch(() => {})
    return url
  } catch {
    return null
  }
}

/**
 * A photo for a word's meaning, or null when there is none (yet, or ever).
 * Every word is looked up at most once for the lifetime of the app — the
 * result (including "no photo found") lives in IndexedDB.
 */
export async function getWordImage(nl: string): Promise<string | null> {
  const query = cleanQuery(nl)
  if (!query) return null

  const apiKey = import.meta.env.VITE_PIXABAY_API_KEY as string | undefined
  if (!apiKey) return null

  const key = cacheKey(query)
  const cached = await get(key).catch(() => undefined)
  if (typeof cached === 'string') return cached || null

  if (!navigator.onLine || quotaExceeded) return null

  const running = inflight.get(key)
  if (running) return running

  const p = resolveAndCache(key, query, apiKey).finally(() => inflight.delete(key))
  inflight.set(key, p)
  return p
}
