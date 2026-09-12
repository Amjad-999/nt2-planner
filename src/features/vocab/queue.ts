/**
 * The review queue — one definition for every screen that counts or opens it.
 *
 * Before this module the app had four answers to "how many words are due":
 * the dashboard and the daily plan skipped words labelled "راسخة", the review
 * session included them, and the exam word bank used the legacy Leitner box
 * even for FSRS words. A learner could read "لا شيء الآن" on the dashboard
 * and then find twelve cards waiting in the session.
 *
 * Every scheduled word counts, including mastered ones. FSRS keeps scheduling
 * those at growing intervals; skipping them when they come due retires them,
 * and a word that is never seen again is eventually forgotten. The number a
 * screen shows is therefore exactly the size of the session it opens.
 */

interface Schedulable {
  due: number
}

export function isDue(word: Schedulable, now: number): boolean {
  return (word.due ?? 0) <= now
}

/** Due words, the longest-waiting first — the order the session presents. */
export function dueWords<T extends Schedulable>(list: readonly T[], now: number): T[] {
  return list.filter((w) => isDue(w, now)).sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
}

export function dueCount(list: readonly Schedulable[], now: number): number {
  let n = 0
  for (const w of list) if (isDue(w, now)) n++
  return n
}
