/* Pure countdown maths for ExamCountdownRing — kept out of the component file
   so it is unit-testable without a DOM (same split as hero/heroProgress.ts). */

const DAY_MS = 86400000

export interface Ring {
  /** Whole days remaining, rounded up. null until the user picks a date —
   *  never a number the app invented. */
  daysLeft: number | null
  /** Share of the planStart→examDate window already spent, 0…1. */
  elapsed: number
  phase: 'unset' | 'counting' | 'today' | 'past'
}

/** Whole calendar days from `from` to `to`, in LOCAL time — "how many days
 *  until my exam?" is a question about the user's wall calendar, not about
 *  elapsed milliseconds (same reasoning as todayKey in lib/utils). Both ends
 *  are normalised to local midnight and the quotient is rounded, which also
 *  absorbs the ±1h a daylight-saving switch inside the window would add.
 *
 *  This is why a raw hours-based count was wrong here: picking a date five
 *  days out showed "5" in the afternoon and "6" in the morning, because the
 *  saved time-of-day (09:00) sat on either side of the current clock. */
function calendarDaysBetween(from: number, to: number): number {
  const a = new Date(from); a.setHours(0, 0, 0, 0)
  const b = new Date(to); b.setHours(0, 0, 0, 0)
  return Math.round((b.getTime() - a.getTime()) / DAY_MS)
}

/** `now` is always supplied by the caller (useNow) — the clock is never read
 *  during render. */
export function ringState(examDate: string, planStart: string, now: number): Ring {
  const target = new Date(examDate).getTime()
  if (!examDate || isNaN(target)) return { daysLeft: null, elapsed: 0, phase: 'unset' }

  const days = calendarDaysBetween(now, target)
  const start = new Date(planStart).getTime()
  const span = isNaN(start) ? 0 : target - start
  const elapsed = span > 0 ? Math.min(1, Math.max(0, (now - start) / span)) : 1

  /* An exam timed 09:00 is still "today" at 14:00 — a raw `target < now`
     comparison would already call that past. */
  if (days === 0) return { daysLeft: 0, elapsed: 1, phase: 'today' }
  if (days < 0) return { daysLeft: 0, elapsed: 1, phase: 'past' }
  return { daysLeft: days, elapsed, phase: 'counting' }
}
