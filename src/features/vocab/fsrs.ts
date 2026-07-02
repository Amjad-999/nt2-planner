import { fsrs as makeFsrs, Rating, State, createEmptyCard } from 'ts-fsrs'
import type { Card, Grade } from 'ts-fsrs'

export const f = makeFsrs({
  request_retention: 0.9,
  maximum_interval: 365,
  enable_fuzz: true,
  enable_short_term: true,
})

// 4 quality values → FSRS ratings
export type FsrsQuality = 0 | 1 | 2 | 3

const QUALITY_TO_RATING: Record<FsrsQuality, Grade> = {
  0: Rating.Again as Grade,
  1: Rating.Hard  as Grade,
  2: Rating.Good  as Grade,
  3: Rating.Easy  as Grade,
}

export interface FsrsFields {
  fsrs_stability?: number
  fsrs_difficulty?: number
  fsrs_state?: number          // State enum: 0=New 1=Learning 2=Review 3=Relearning
  fsrs_last_review?: number    // epoch ms
  fsrs_lapses?: number
  fsrs_scheduled_days?: number
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

// A word is "learned" once it reaches Review state with ≥21 days stability (~3 weeks)
export const LEARNED_STABILITY = 21

export function isFsrsLearned(w: FsrsFields): boolean {
  return w.fsrs_state === State.Review && (w.fsrs_stability ?? 0) >= LEARNED_STABILITY
}

// Estimate FSRS fields from legacy Leitner box for migration
const BOX_STABILITY = [0, 1, 3, 7, 14, 30] as const

export function boxToFsrsFields(box: number, due: number): FsrsFields {
  if (box <= 0) return {}
  const stability = BOX_STABILITY[Math.min(box, 5)]
  const state = box >= 2 ? State.Review : State.Learning
  return {
    fsrs_stability: stability,
    fsrs_difficulty: 5,
    fsrs_state: state,
    fsrs_last_review: due - stability * 86400000,
    fsrs_lapses: 0,
    fsrs_scheduled_days: stability,
  }
}

// Format interval in Arabic for display after grading
export function formatIntervalAr(days: number): string {
  if (days < 1) return 'قريبًا'
  const n = Math.round(days)
  if (n === 1) return 'بعد يوم'
  if (n === 2) return 'بعد يومين'
  return `بعد ${n} أيام`
}
