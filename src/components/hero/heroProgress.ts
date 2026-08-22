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

/**
 * Once-per-day gate for the daily-goal celebration — pure so the whole
 * lifecycle (fire → consumed → re-armed next day) is unit-testable without
 * mounting the hero.
 *  'fire'    — live below→met crossing on an unconsumed day: confetti + pulse.
 *  'consume' — goal already met when first observed (mount with stale news,
 *              or a target lowered mid-session): mark the day silently.
 *  'skip'    — goal not met, or this day was already consumed.
 */
export type GoalCelebrationDecision = 'fire' | 'consume' | 'skip'

export function shouldCelebrateGoal(args: {
  prevMins: number | null
  todayMins: number
  targetMins: number
  celebratedOn: string
  today: string
}): GoalCelebrationDecision {
  const { prevMins, todayMins, targetMins, celebratedOn, today } = args
  if (deriveHeroProgress(todayMins, targetMins) !== 'goal-met') return 'skip'
  if (celebratedOn === today) return 'skip'
  if (prevMins === null || prevMins >= targetMins) return 'consume'
  return 'fire'
}
