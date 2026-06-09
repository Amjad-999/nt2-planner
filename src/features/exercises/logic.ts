/** Pure, side-effect-free logic for all three exercise types — unit-testable. */

export interface Pair { id: string; nl: string; ar: string }
export interface SortWord { id: string; word: string }
export interface Chip { id: string; word: string }

export interface MatchExercise {
  pairs: Pair[]        // correct answer key: p.id matches both nl and ar slots
  nlShuffled: Pair[]
  arShuffled: Pair[]
}

export interface SortExercise {
  sentence: string
  words: SortWord[]    // shuffled words to order
  correctIds: string[] // word ids in the correct order
}

export interface GapExercise {
  before: string      // sentence fragment before the blank
  after: string       // sentence fragment after the blank
  answer: string      // display text of the correct answer
  answerId: string    // id of the correct chip ('ans')
  chips: Chip[]       // shuffled chips (correct + distractors)
}

// ── Deterministic LCG shuffle for testability ──────────────────────────────
export function shuffle<T>(arr: T[], seed?: number): T[] {
  const a = [...arr]
  let s = seed !== undefined ? (seed | 0) || 1 : Math.floor(Math.random() * 0x7fffffff) + 1
  for (let i = a.length - 1; i > 0; i--) {
    s = (Math.imul(s, 1664525) + 1013904223) & 0x7fffffff
    const j = s % (i + 1);
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// ── Matching ────────────────────────────────────────────────────────────────
export function buildMatchExercise(
  words: { nl: string; ar: string }[],
  count = 5,
  seed?: number,
): MatchExercise {
  const selected = shuffle(words, seed).slice(0, Math.min(count, words.length))
  const pairs: Pair[] = selected.map((w, i) => ({ id: `p${i}`, nl: w.nl, ar: w.ar }))
  return {
    pairs,
    nlShuffled: shuffle([...pairs], seed !== undefined ? seed + 1 : undefined),
    arShuffled: shuffle([...pairs], seed !== undefined ? seed + 2 : undefined),
  }
}

/**
 * Check matching answers.
 * userMap: nlId → arId the user placed the NL word on
 * Correct when userMap[p.id] === p.id (because nl and ar share the same pair id).
 */
export function checkMatching(
  userMap: Record<string, string>,
  pairs: Pair[],
): { correct: number; total: number; results: Record<string, boolean> } {
  const results: Record<string, boolean> = {}
  let correct = 0
  for (const p of pairs) {
    const ok = userMap[p.id] === p.id
    results[p.id] = ok
    if (ok) correct++
  }
  return { correct, total: pairs.length, results }
}

// ── Sentence ordering ────────────────────────────────────────────────────────
export function buildSortExercise(sentence: string, seed?: number): SortExercise {
  const raw = sentence.trim().split(/\s+/).filter(Boolean)
  const words: SortWord[] = raw.map((w, i) => ({ id: `w${i}`, word: w }))
  return {
    sentence,
    words: shuffle(words, seed),
    correctIds: words.map(w => w.id),
  }
}

export function checkSortOrder(userIds: string[], correctIds: string[]): boolean {
  if (userIds.length !== correctIds.length) return false
  return userIds.every((id, i) => id === correctIds[i])
}

// ── Fill the gap ─────────────────────────────────────────────────────────────
export function buildGapExercise(
  sentence: string,
  answer: string,
  distractors: string[],
  seed?: number,
): GapExercise {
  const idx = sentence.indexOf(answer)
  const before = idx >= 0 ? sentence.slice(0, idx) : sentence + ' '
  const after  = idx >= 0 ? sentence.slice(idx + answer.length) : ''
  const chips: Chip[] = [
    { id: 'ans', word: answer },
    ...distractors.slice(0, 3).map((w, i) => ({ id: `d${i}`, word: w })),
  ]
  return { before, after, answer, answerId: 'ans', chips: shuffle(chips, seed) }
}

export function checkGap(placedId: string | null, answerId: string): boolean {
  return placedId === answerId
}
