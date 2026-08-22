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
