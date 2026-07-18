/** Detects the moment an exam passage transitions from incomplete to complete.
 *
 * Returns the score (0–100) when answering question `qi` with option `oi`
 * completes the passage, and null otherwise. A passage that is already
 * complete returns null, so changing an answer afterwards never records a
 * second attempt — resetting the passage (empty `prev`) starts a fresh one. */
export function completionPct(
  prev: Record<number, number>,
  qi: number,
  oi: number,
  questions: readonly { correct: number }[],
): number | null {
  if (questions.length === 0) return null
  const wasComplete = Object.keys(prev).length >= questions.length
  const next = { ...prev, [qi]: oi }
  if (wasComplete || Object.keys(next).length < questions.length) return null
  const correct = questions.reduce((n, q, i) => n + (next[i] === q.correct ? 1 : 0), 0)
  return Math.round((correct / questions.length) * 100)
}
