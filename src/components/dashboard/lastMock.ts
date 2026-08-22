import type { SkillKey, State } from '@/store/types'

/** The four NT2 exam parts under their official Dutch names. */
export const SKILL_NL: Record<SkillKey, string> = {
  reading: 'Lezen',
  listening: 'Luisteren',
  writing: 'Schrijven',
  speaking: 'Spreken',
}

/** Most recent simulation across all four parts, or null if none was ever
 *  taken. History rows carry a dayKey, so same-day ties resolve to the later
 *  array position — which is chronological within a day (see recordExam). */
export function lastMockScore(
  skill: State['skill'],
): { score: number; skill: SkillKey; date: string } | null {
  let latest: { score: number; skill: SkillKey; date: string } | null = null
  for (const k of Object.keys(SKILL_NL) as SkillKey[]) {
    for (const h of skill[k]?.history ?? []) {
      if (!latest || h.date >= latest.date) latest = { score: h.score, skill: k, date: h.date }
    }
  }
  return latest
}

/**
 * The headline number for the dashboard card.
 *
 * A completed four-part run wins over any single-skill attempt, because that is
 * the only figure comparable to a real exam sitting. Falls back to the
 * single-skill history so a user who has never run a full mock still sees
 * something real instead of an empty card.
 */
export function headlineMock(
  skill: State['skill'],
  runs: State['mockRuns'],
): { score: number; label: string; full: boolean } | null {
  const last = (runs ?? []).reduce<State['mockRuns'][number] | null>(
    (best, r) => (!best || (r.finishedAt ?? 0) >= (best.finishedAt ?? 0) ? r : best),
    null,
  )
  if (last) {
    const parts = Object.keys(last.scores ?? {}).length
    return { score: last.total, label: `امتحان كامل · ${parts} مهارات`, full: true }
  }
  const single = lastMockScore(skill)
  if (!single) return null
  return { score: single.score, label: `${SKILL_NL[single.skill]} · ${single.date}`, full: false }
}
