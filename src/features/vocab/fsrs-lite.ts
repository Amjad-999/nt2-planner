/* الجزء الخفيف من طبقة FSRS — بلا استيراد ts-fsrs إطلاقًا.
   يُستهلك في مسار الإقلاع (المخزن، الترحيل، الواجهات) حيث كان استيراد
   المحرك كاملًا (~59KB مصدر) لأجل ثوابت ومقارنات بسيطة.
   قيم State مطابقة لتعداد ts-fsrs: 0=New 1=Learning 2=Review 3=Relearning
   (موثقة في تعليق FsrsFields أدناه ومثبتة باختبار في fsrs.test). */

const STATE_LEARNING = 1
const STATE_REVIEW = 2

// 4 quality values → FSRS ratings
export type FsrsQuality = 0 | 1 | 2 | 3

export interface FsrsFields {
  fsrs_stability?: number
  fsrs_difficulty?: number
  fsrs_state?: number          // State enum: 0=New 1=Learning 2=Review 3=Relearning
  fsrs_last_review?: number    // epoch ms
  fsrs_lapses?: number
  fsrs_scheduled_days?: number
}

// A word is "learned" once it reaches Review state with ≥21 days stability (~3 weeks)
export const LEARNED_STABILITY = 21

export function isFsrsLearned(w: FsrsFields): boolean {
  return w.fsrs_state === STATE_REVIEW && (w.fsrs_stability ?? 0) >= LEARNED_STABILITY
}

// Estimate FSRS fields from legacy Leitner box for migration
const BOX_STABILITY = [0, 1, 3, 7, 14, 30] as const

export function boxToFsrsFields(box: number, due: number): FsrsFields {
  if (box <= 0) return {}
  const stability = BOX_STABILITY[Math.min(box, 5)]
  const state = box >= 2 ? STATE_REVIEW : STATE_LEARNING
  return {
    fsrs_stability: stability,
    fsrs_difficulty: 5,
    fsrs_state: state,
    fsrs_last_review: due - stability * 86400000,
    fsrs_lapses: 0,
    fsrs_scheduled_days: stability,
  }
}

/* Counted nouns after «بعد» take the genitive dual («بعد يومين», not «يومان»),
   and 11+ takes the singular («بعد 14 يومًا», not «14 أيام»). CLDR buckets. */
interface AfterForms { one: string; two: string; few: string; many: string; other: string }
const AFTER_MINUTE: AfterForms = { one: 'دقيقة', two: 'دقيقتين', few: 'دقائق', many: 'دقيقة', other: 'دقيقة' }
const AFTER_HOUR: AfterForms = { one: 'ساعة', two: 'ساعتين', few: 'ساعات', many: 'ساعة', other: 'ساعة' }
const AFTER_DAY: AfterForms = { one: 'يوم', two: 'يومين', few: 'أيام', many: 'يومًا', other: 'يوم' }
const AFTER_MONTH: AfterForms = { one: 'شهر', two: 'شهرين', few: 'أشهر', many: 'شهرًا', other: 'شهر' }

function after(n: number, f: AfterForms): string {
  const tail = n % 100
  if (n === 1) return `بعد ${f.one}`
  if (n === 2) return `بعد ${f.two}`
  if (tail >= 3 && tail <= 10) return `بعد ${n} ${f.few}`
  if (tail >= 11 && tail <= 99) return `بعد ${n} ${f.many}`
  return `بعد ${n} ${f.other}`
}

// Format interval in Arabic for display after grading
export function formatIntervalAr(days: number): string {
  if (days < 1) return 'قريبًا'
  const n = Math.round(days)
  return n < 45 ? after(n, AFTER_DAY) : after(Math.round(n / 30), AFTER_MONTH)
}

/**
 * How long until a card returns, from milliseconds — used to label each
 * rating button before it is pressed, so the learner sees what "صعبة" or
 * "سهلة" will actually do. Short-term learning steps are minutes, not days.
 */
export function formatWaitAr(ms: number): string {
  const minutes = Math.max(1, Math.round(ms / 60000))
  if (minutes < 60) return after(minutes, AFTER_MINUTE)
  const hours = Math.round(minutes / 60)
  if (hours < 24) return after(hours, AFTER_HOUR)
  return formatIntervalAr(Math.round(hours / 24))
}
