import type { State } from '@/store/types'

/**
 * The hero's single source of truth for "how is today going" — shared with
 * useMascot so the mascot comments on exactly the state the hero displays,
 * instead of each deriving its own (possibly disagreeing) verdict.
 */
export type HeroProgress = 'goal-met' | 'on-track' | 'behind'

export function deriveHeroProgress(todayMins: number, targetMins: number): HeroProgress {
  if (targetMins > 0 && todayMins >= targetMins) return 'goal-met'
  if (todayMins > 0) return 'on-track'
  return 'behind'
}

/** Store-shaped convenience wrapper (used by useMascot's store reads). */
export function heroProgressFromState(
  st: Pick<State, 'dailyHistory' | 'prefs'>,
  dayKey: string,
): HeroProgress {
  return deriveHeroProgress(st.dailyHistory[dayKey]?.mins ?? 0, st.prefs?.studyDayMinutes ?? 60)
}
