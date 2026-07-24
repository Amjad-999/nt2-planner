/**
 * Time-of-day phase for the JourneyHero scene. Boundaries deliberately line
 * up with SmartGreeting's getPeriod() (5 / 9 / 17 / 21) so the sky never
 * contradicts the greeting text ("مساء المراجعة" under a night sky, etc.).
 */
export type DayPhase = 'dawn' | 'day' | 'dusk' | 'night'

/** Phase boundaries as local hours: dawn starts 5:00, day 9:00, dusk 17:00, night 21:00. */
export const PHASE_BOUNDARIES = [5, 9, 17, 21] as const

export function phaseOfHour(hour: number): DayPhase {
  if (hour >= 5 && hour < 9) return 'dawn'
  if (hour >= 9 && hour < 17) return 'day'
  if (hour >= 17 && hour < 21) return 'dusk'
  return 'night'
}

/**
 * Milliseconds from `now` (epoch ms) to the next phase boundary in local
 * time — used to arm one timer per crossing instead of polling. Clamped to
 * ≥1s so a call landing exactly on a boundary can never arm a 0ms loop.
 */
export function msToNextBoundary(now: number): number {
  const d = new Date(now)
  const next = PHASE_BOUNDARIES.find((b) => b > d.getHours())
  const target = next == null
    ? new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, PHASE_BOUNDARIES[0])
    : new Date(d.getFullYear(), d.getMonth(), d.getDate(), next)
  return Math.max(1000, target.getTime() - now)
}
