import { useMemo } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useNow } from '@/hooks/useNow'
import { grammarSummary } from '@/features/grammar/progress'
import { buildTodayPlan, type TodayPlan } from '@/features/plan/todayPlan'
import { programToday } from '@/features/plan/programToday'
import { todayKey } from '@/lib/utils'

/** How many words one review sitting covers before the plan calls it enough. */
export const REVIEW_BATCH = 20

/**
 * Today's checklist, built once from the store. The home screen's "next step"
 * and the checklist under it read the same object, so they cannot disagree.
 */
export function useTodayPlan(): TodayPlan {
  const vocab = useAppStore((s) => s.vocab)
  const skill = useAppStore((s) => s.skill)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const prefs = useAppStore((s) => s.prefs)
  const mockSession = useAppStore((s) => s.mockSession)
  const grammarProgress = useAppStore((s) => s.grammarProgress)
  const studyProgram = useAppStore((s) => s.studyProgram)
  const now = useNow()
  const today = todayKey()

  // The schedule engine is the one expensive step — rebuild it only when the
  // programme or the day changes, not on every clock tick.
  const program = useMemo(() => programToday(studyProgram, today), [studyProgram, today])
  const grammar = grammarSummary(grammarProgress)

  return buildTodayPlan(
    { vocab, skill, dailyHistory, prefs, mockSession, grammarProgress },
    { now, todayKey: today, reviewBatch: REVIEW_BATCH, totalLessons: grammar.lessonsWithExercises, completedLessons: grammar.completedLessons, program },
  )
}
