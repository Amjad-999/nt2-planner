import { normalise } from '@/features/speaking/similarity'
import type { BuildExercise, ExpressionSeed, TypedResult, RetellPoint } from './types'

/* ── Answer evaluation — deterministic, explainable, never a "score" ──────
   Each function returns a category the UI can explain in one sentence.
   Nothing here pretends to understand free speech or free writing; free text
   is only checked for things a rule can see (the expression is present, the
   sentence is not a copy of one on screen, a keyword appears). */

/** Normalise for comparison: lowercase, no diacritics/punctuation, single spaces. */
export function norm(s: string): string {
  return normalise(String(s ?? ''))
}

export function words(s: string): string[] {
  return norm(s).split(' ').filter(Boolean)
}

function editDistance(a: string, b: string): number {
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  const dp = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const t = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = t
    }
  }
  return dp[n]
}

/**
 * Typed recall of a word or short expression.
 * correct — identical after normalising
 * close   — one small typo (two for long answers): shown as right, with the spelling
 * wrong   — anything else; '' — nothing typed yet
 */
export function checkTyped(typed: string, answer: string): TypedResult {
  const a = norm(typed), b = norm(answer)
  if (!a) return ''
  if (a === b) return 'correct'
  const allowed = b.length >= 8 ? 2 : b.length >= 4 ? 1 : 0
  return editDistance(a, b) <= allowed ? 'close' : 'wrong'
}

/* ── Sentence building (tap-to-order tiles) ── */

/** Stable, non-trivial display order: never equal to the answer order. */
export function tileOrder(ex: BuildExercise): number[] {
  const n = ex.tokens.length
  let seed = 0
  for (const ch of ex.id) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  const idx = Array.from({ length: n }, (_, i) => i)
  for (let i = n - 1; i > 0; i--) {
    seed = (seed * 1103515245 + 12345) >>> 0
    const j = seed % (i + 1)
    ;[idx[i], idx[j]] = [idx[j], idx[i]]
  }
  if (idx.every((v, i) => v === i)) idx.push(idx.shift()!)
  return idx
}

export interface BuildResult {
  correct: boolean
  /** Per placed tile: is it in a position that matches an accepted order? */
  positions: boolean[]
  /** Which rule the mistake is about, when the finite verb is misplaced. */
  hint: 'verb-second' | 'verb-final' | 'order' | ''
}

export function checkBuild(order: number[], ex: BuildExercise): BuildResult {
  const accepted = [ex.tokens.map((_, i) => i), ...ex.accept]
  const complete = order.length === ex.tokens.length
  const exact = complete && accepted.some((acc) => acc.every((v, i) => order[i] === v))
  // Position feedback against the closest accepted order.
  let best = accepted[0], bestHits = -1
  for (const acc of accepted) {
    const hits = order.filter((v, i) => acc[i] === v).length
    if (hits > bestHits) { best = acc; bestHits = hits }
  }
  const positions = order.map((v, i) => best[i] === v)
  let hint: BuildResult['hint'] = ''
  if (!exact && complete) {
    const verbAt = order.indexOf(ex.verbIndex)
    const expectedAt = best.indexOf(ex.verbIndex)
    if (verbAt !== expectedAt) hint = ex.rule === 'v2' ? 'verb-second' : 'verb-final'
    else hint = 'order'
  }
  return { correct: exact, positions, hint }
}

export function buildSentence(order: number[], ex: BuildExercise): string {
  const body = order.map((i) => ex.tokens[i]).join(' ')
  const s = [ex.prefix, body].filter(Boolean).join(' ')
  return s ? s + '.' : ''
}

/* ── Expression use in free text ── */

/** True when every stem of at least one match-set starts some word of `text`. */
export function usesExpression(text: string, seed: Pick<ExpressionSeed, 'match'>): boolean {
  const ws = words(text)
  if (!ws.length) return false
  const joined = ' ' + ws.join(' ') + ' '
  return seed.match.some((set) => set.every((stem) => {
    const s = norm(stem)
    if (!s) return false
    if (s.includes(' ')) return joined.includes(' ' + s)
    return ws.some((w) => w.startsWith(s))
  }))
}

function jaccard(a: string[], b: string[]): number {
  const A = new Set(a), B = new Set(b)
  if (!A.size && !B.size) return 1
  let inter = 0
  for (const w of A) if (B.has(w)) inter++
  return inter / new Set([...A, ...B]).size
}

/** Share of the learner's words that also appear, in the same order-ish, in a
 *  sentence that was on screen. High overlap = a copy, not production. */
export function copySimilarity(text: string, shown: string[]): number {
  const w = words(text)
  let best = 0
  // Compare sentence by sentence: a copied sentence hides inside a long paragraph otherwise.
  const pieces = shown.flatMap((s) => String(s).split(/(?<=[.!?])\s+/)).filter(Boolean)
  for (const s of pieces) {
    const sw = words(s)
    if (!sw.length) continue
    const j = jaccard(w, sw)
    const e = 1 - editDistance(norm(text), norm(s)) / Math.max(norm(text).length, norm(s).length, 1)
    best = Math.max(best, 0.6 * j + 0.4 * e)
  }
  return best
}

export type OwnResult = 'independent' | 'copied' | 'missing' | 'too-short'

/**
 * Classify a learner-written sentence for one expression.
 * Only 'independent' counts toward "used independently": the expression must
 * be present, the sentence must be a sentence (≥ expression + 2 words), and it
 * must not reproduce anything that was displayed (example, cloze, model).
 */
export function classifyOwnSentence(text: string, seed: Pick<ExpressionSeed, 'match' | 'nl'>, shown: string[]): OwnResult {
  const w = words(text)
  if (w.length < Math.max(3, words(seed.nl).length + 2)) return 'too-short'
  if (!usesExpression(text, seed)) return 'missing'
  if (copySimilarity(text, shown) >= 0.72) return 'copied'
  return 'independent'
}

/* ── Retell: which key points does a typed retelling mention? ── */
export function retellCoverage(text: string, points: RetellPoint[]): number[] {
  const t = ' ' + words(text).join(' ') + ' '
  const hits: number[] = []
  points.forEach((p, i) => {
    if (p.any.some((k) => {
      const nk = norm(k)
      return nk.includes(' ') ? t.includes(' ' + nk) : t.split(' ').some((w) => w.startsWith(nk))
    })) hits.push(i)
  })
  return hits
}

export function wordCount(text: string): number {
  return words(text).length
}
