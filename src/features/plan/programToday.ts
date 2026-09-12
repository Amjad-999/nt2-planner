import type { StudyProgramState } from '@/store/types'
import { buildProgramView, isProgramActive } from './program'
import { isCovered, statusOf } from './progress'
import type { ProgramToday } from './todayPlan'

/**
 * How many of today's scheduled programme lessons are done.
 *
 * Kept apart from todayPlan so the pure checklist stays free of the schedule
 * engine; the dashboard builds this once (memoised) and hands it in.
 * Returns null when no programme is active or today schedules no new lessons
 * — the checklist then simply has no programme row, rather than a fake one.
 */
export function programToday(program: StudyProgramState, todayKey: string): ProgramToday | null {
  if (!isProgramActive(program)) return null
  const today = buildProgramView(program, todayKey).today
  const ids = today?.lessonIds ?? []
  if (ids.length === 0) return null
  const book = program.lessons ?? {}
  const done = ids.filter((id) => isCovered(statusOf(book, id))).length
  return { total: ids.length, done }
}
