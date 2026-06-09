import { useMemo, useState, useEffect, useRef } from 'react'
import Fuse, { type IFuseOptions, type FuseResult } from 'fuse.js'

const DEBOUNCE_MS = 150

/**
 * Generic fuzzy-search hook backed by Fuse.js.
 *
 * - Rebuilds the index only when `list` reference changes.
 * - Debounces the query by 150 ms so keystrokes don't block the main thread.
 * - Returns the full FuseResult array when there is a query (ranked by score),
 *   or `null` when the query is blank (caller decides what "no query" means).
 */
export function useFuzzySearch<T>(
  list: ReadonlyArray<T>,
  options: IFuseOptions<T>,
  query: string,
): FuseResult<T>[] | null {
  const [debounced, setDebounced] = useState(query)

  // Debounce
  useEffect(() => {
    if (!query.trim()) { setDebounced(''); return }
    const t = setTimeout(() => setDebounced(query), DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [query])

  // Memoised index — rebuilds only when list identity changes
  const fuse = useMemo(
    () => new Fuse(list as T[], options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [list],
  )

  return useMemo(() => {
    const q = debounced.trim()
    if (!q) return null
    return fuse.search(q)
  }, [fuse, debounced])
}

/**
 * Highlight matched ranges in a string.
 * Returns an array of { text, highlight } segments — safe to render as React nodes.
 */
export function highlightRanges(
  text: string,
  indices?: ReadonlyArray<readonly [number, number]>,
): { text: string; highlight: boolean }[] {
  if (!indices || !indices.length) return [{ text, highlight: false }]

  const segs: { text: string; highlight: boolean }[] = []
  let cursor = 0

  for (const [start, end] of indices) {
    if (start > cursor) segs.push({ text: text.slice(cursor, start), highlight: false })
    segs.push({ text: text.slice(start, end + 1), highlight: true })
    cursor = end + 1
  }
  if (cursor < text.length) segs.push({ text: text.slice(cursor), highlight: false })
  return segs
}

/** Stable empty-array reference so downstream useMemo deps don't thrash. */
const EMPTY_INDICES: ReadonlyArray<readonly [number, number]> = []

/**
 * Extract the match-indices for a specific key from a FuseResult.
 * Used by the highlight helper.
 */
export function getMatchIndices(
  result: FuseResult<unknown>,
  key: string,
): ReadonlyArray<readonly [number, number]> {
  const m = result.matches?.find(x => x.key === key)
  return (m?.indices as ReadonlyArray<readonly [number, number]> | undefined) ?? EMPTY_INDICES
}

/**
 * Convenience: debounce a value with a ref-based timer (for use outside hooks).
 * Exposed for testing.
 */
export function useDebounce<T>(value: T, ms = DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setDebounced(value), ms)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [value, ms])

  return debounced
}
