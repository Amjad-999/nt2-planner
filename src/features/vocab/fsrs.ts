import { fsrs as makeFsrs, Rating, State, createEmptyCard } from 'ts-fsrs'
import type { Card, Grade } from 'ts-fsrs'
import type { FsrsFields, FsrsQuality } from './fsrs-lite'

/* الجزء الثقيل: محرك الجدولة نفسه. يُستورد ديناميكيًا من gradeFlash فقط —
   لا يدخل حزمة الإقلاع. الثوابت والمساعدات الخفيفة في fsrs-lite،
   ويعاد تصديرها هنا لتوافق الاختبارات والمستهلكين القدامى. */
export * from './fsrs-lite'

export const f = makeFsrs({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: true,
})

const QUALITY_TO_RATING: Record<FsrsQuality, Grade> = {
  0: Rating.Again as Grade,
  1: Rating.Hard  as Grade,
  2: Rating.Good  as Grade,
  3: Rating.Easy  as Grade,
}

export function wordToCard(w: FsrsFields & { due: number; reps: number }): Card {
  if (w.fsrs_state !== undefined && w.fsrs_stability !== undefined) {
    return {
      due: new Date(w.due),
      stability: w.fsrs_stability,
      difficulty: w.fsrs_difficulty ?? 5,
      elapsed_days: 0,
      scheduled_days: w.fsrs_scheduled_days ?? 0,
      learning_steps: 0,
      reps: w.reps,
      lapses: w.fsrs_lapses ?? 0,
      state: w.fsrs_state as State,
      last_review: w.fsrs_last_review ? new Date(w.fsrs_last_review) : undefined,
    }
  }
  return createEmptyCard(new Date())
}

export function scheduleCard(
  w: FsrsFields & { due: number; reps: number },
  quality: FsrsQuality,
): { due: number; intervalDays: number; fsrsFields: FsrsFields } {
  const card = wordToCard(w)
  const now = new Date()
  const { card: next } = f.next(card, now, QUALITY_TO_RATING[quality])

  return {
    due: next.due.getTime(),
    intervalDays: next.scheduled_days,
    fsrsFields: {
      fsrs_stability: next.stability,
      fsrs_difficulty: next.difficulty,
      fsrs_state: next.state,
      fsrs_last_review: now.getTime(),
      fsrs_lapses: next.lapses,
      fsrs_scheduled_days: next.scheduled_days,
    },
  }
}
