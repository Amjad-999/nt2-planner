import { CURRICULUM_LESSONS, TOTAL_LESSONS, makeMinutesResolver } from '@/data/curriculum'
import { AR_DAY, AR_LESSON, countAr } from '@/lib/arabicCount'
import { todayKey } from '@/lib/utils'
import {
  buildSchedule, dayDiff, type ScheduleConfig, type ScheduleResult, type ScheduledDay,
} from './schedule'

/**
 * حالة كل درس، نسبة التقدّم الحقيقية، وصحّة البرنامج مقابل الجدول المرجعي.
 *
 * Every number here is counted from stored lesson records — nothing is an
 * estimate. A progress bar that guesses is worse than none, because the learner
 * calibrates their effort against it.
 */

export type LessonStatus = 'new' | 'learning' | 'done' | 'review' | 'weak' | 'mastered'

export interface LessonRecord {
  s: LessonStatus
  /** epoch ms لآخر تغيير حالة. */
  at: number
  /** عدد مرّات المراجعة المسجّلة. */
  reps: number
}

export type LessonBook = Record<string, LessonRecord>

export const LESSON_STATUS_AR: Record<LessonStatus, string> = {
  new: 'لم يبدأ',
  learning: 'قيد الدراسة',
  done: 'مكتمل',
  review: 'يحتاج مراجعة',
  weak: 'ضعيف',
  mastered: 'متقن',
}

/** أيقونة لكل حالة — اللون وحده لا يكفي لنقل المعنى. */
export const LESSON_STATUS_ICON: Record<LessonStatus, string> = {
  new: '○',
  learning: '◐',
  done: '✔',
  review: '↻',
  weak: '!',
  mastered: '★',
}

export const LESSON_STATUSES: LessonStatus[] = ['new', 'learning', 'done', 'review', 'weak', 'mastered']

/** وزن كل حالة في نسبة الإتقان. مجموع مرجّح، لا عدّ خام. */
const MASTERY_WEIGHT: Record<LessonStatus, number> = {
  new: 0,
  learning: 0.15,
  weak: 0.3,
  review: 0.5,
  done: 0.7,
  mastered: 1,
}

/** درس "مغطّى" = درسه المستخدم فعلًا مرّة على الأقل. */
export function isCovered(s: LessonStatus): boolean {
  return s !== 'new' && s !== 'learning'
}

export function statusOf(book: LessonBook, id: string): LessonStatus {
  return book[id]?.s ?? 'new'
}

export interface ProgressSummary {
  counts: Record<LessonStatus, number>
  total: number
  covered: number
  remaining: number
  /** نسبة التغطية: كم درسًا أُنجز من 164. */
  coveredPct: number
  /** نسبة الإتقان المرجّحة — أدقّ من التغطية لأنها تعاقب الدروس الضعيفة. */
  masteryPct: number
  /** الدقائق المتبقّية من الدروس غير المغطّاة. */
  minutesRemaining: number
  weakIds: string[]
  reviewIds: string[]
}

export function computeProgress(book: LessonBook, minuteOverrides: Record<string, number> = {}): ProgressSummary {
  const minutesOf = makeMinutesResolver(minuteOverrides)
  const counts: Record<LessonStatus, number> = { new: 0, learning: 0, done: 0, review: 0, weak: 0, mastered: 0 }
  const weakIds: string[] = []
  const reviewIds: string[] = []
  let weighted = 0

  for (const lesson of CURRICULUM_LESSONS) {
    const s = statusOf(book, lesson.id)
    counts[s] += 1
    weighted += MASTERY_WEIGHT[s]
    if (s === 'weak') weakIds.push(lesson.id)
    if (s === 'review') reviewIds.push(lesson.id)
  }

  const covered = counts.done + counts.review + counts.weak + counts.mastered
  const remaining = TOTAL_LESSONS - covered
  /* الدقائق المتبقّية تُجمع من مدّة كل درس على حدة، لا من عدد × 20:
     دروس B1 قد تكون أطول، وضربٌ واحد كان سيُخفي ذلك تمامًا. */
  const minutesRemaining = CURRICULUM_LESSONS
    .filter((l) => !isCovered(statusOf(book, l.id)))
    .reduce((s, l) => s + minutesOf(l.id), 0)

  return {
    counts,
    total: TOTAL_LESSONS,
    covered,
    remaining,
    coveredPct: TOTAL_LESSONS ? Math.round((covered / TOTAL_LESSONS) * 100) : 0,
    masteryPct: TOTAL_LESSONS ? Math.round((weighted / TOTAL_LESSONS) * 100) : 0,
    minutesRemaining,
    weakIds,
    reviewIds,
  }
}

/** ترتيب الدراسة: تسلسلي كما رُتّبت الكتب، أو دروس B1 أوّلًا. */
export type StudyOrder = 'sequential' | 'examFirst'

/** الكتب التي يقيسها امتحان B1 مباشرةً. */
const EXAM_BOOKS = new Set(['b1d1', 'b1d2'])

/**
 * يعيد ترتيب الدروس حسب الاستراتيجية، مع الحفاظ على الترتيب داخل كل كتاب.
 *
 * `examFirst` exists for the case where the window is too short for everything:
 * the exam tests B1, so when something has to be dropped it should be the tail
 * of the A2 book, not the B1 material. Sequential stays the default because
 * skipping the A2 foundation is a real cost, not a free optimisation.
 */
export function orderLessons(ids: string[], order: StudyOrder = 'sequential'): string[] {
  if (order !== 'examFirst') return ids
  const index = new Map(CURRICULUM_LESSONS.map((l, i) => [l.id, i]))
  const bookOfId = new Map(CURRICULUM_LESSONS.map((l) => [l.id, l.bookId]))
  const exam: string[] = []
  const rest: string[] = []
  for (const id of ids) (EXAM_BOOKS.has(bookOfId.get(id) ?? '') ? exam : rest).push(id)
  const bySeq = (a: string, b: string) => (index.get(a) ?? 0) - (index.get(b) ?? 0)
  return [...exam.sort(bySeq), ...rest.sort(bySeq)]
}

/**
 * ما دُرس فعلًا في كل يوم مضى: مفتاح اليوم إلى معرّفات دروسه.
 *
 * Grouped by the day the lesson's status was actually recorded, not by the day
 * the plan expected it — the recall block should quiz what the learner really
 * did yesterday, not what they were supposed to do.
 */
export function lessonsByDay(book: LessonBook): Record<string, string[]> {
  const out: Record<string, string[]> = {}
  for (const l of CURRICULUM_LESSONS) {
    const rec = book[l.id]
    if (!rec || !isCovered(rec.s) || !rec.at) continue
    const key = todayKey(new Date(rec.at))
    ;(out[key] ??= []).push(l.id)
  }
  return out
}

/** الدروس التي ما زالت تحتاج جدولة، بترتيب المنهج أو بأولوية الامتحان. */
export function remainingLessonIds(book: LessonBook, order: StudyOrder = 'sequential'): string[] {
  const ids = CURRICULUM_LESSONS.filter((l) => !isCovered(statusOf(book, l.id))).map((l) => l.id)
  return orderLessons(ids, order)
}

/* ── صحّة البرنامج ── */

export type ProgramStatus = 'ahead' | 'ontrack' | 'behind' | 'critical' | 'done'

export interface ProgramHealth {
  status: ProgramStatus
  /** كم درسًا كان يُفترض إنجازه حتى نهاية أمس. */
  expectedByYesterday: number
  expectedByToday: number
  actual: number
  /** موجب = متأخّر بهذا العدد من الدروس. */
  lag: number
  /** الدروس المطلوبة يوميًّا من الآن حتى الموعد النهائي. */
  neededPerDay: number
  /** أيام التعلّم المتبقّية في الجدول الحيّ. */
  learningDaysLeft: number
  daysLeft: number
  headlineAr: string
  whyAr: string
}

function sumLessonsUpTo(days: ScheduledDay[], lastKeyInclusive: string): number {
  let n = 0
  for (const d of days) {
    if (dayDiff(d.dayKey, lastKeyInclusive) >= 0) n += d.lessonIds.length
  }
  return n
}

export interface HealthInput {
  baseline: ScheduleResult
  live: ScheduleResult
  book: LessonBook
  todayKey: string
  deadlineKey: string
}

export function programHealth(input: HealthInput): ProgramHealth {
  const { baseline, live, book, todayKey, deadlineKey } = input
  const progress = computeProgress(book)
  const actual = progress.covered

  const yesterday = baseline.days.length ? sumLessonsUpTo(baseline.days, shiftKey(todayKey, -1)) : 0
  const today = baseline.days.length ? sumLessonsUpTo(baseline.days, todayKey) : 0
  const lag = Math.max(0, yesterday - actual)

  const daysLeft = Math.max(0, dayDiff(todayKey, deadlineKey))
  const learningDaysLeft = live.days.filter((d) => d.lessonIds.length > 0).length
  const neededPerDay = learningDaysLeft > 0 ? Math.ceil(progress.remaining / learningDaysLeft) : progress.remaining

  let status: ProgramStatus
  if (progress.remaining === 0) status = 'done'
  else if (!live.feasible) status = 'critical'
  else if (lag > 0) status = 'behind'
  else if (actual > today) status = 'ahead'
  else status = 'ontrack'

  const headlineAr =
    status === 'done' ? 'كل دروس المنهج مغطّاة. الوقت المتبقّي كلّه للمراجعة.'
    : status === 'critical' ? 'الجدول لم يعد قابلًا للتنفيذ كما هو.'
    : status === 'behind' ? `متأخّر بـ ${countAr(lag, AR_LESSON)} عن الجدول المرجعي.`
    : status === 'ahead' ? `متقدّم على الجدول بـ ${countAr(actual - today, AR_LESSON)}.`
    : 'على المسار.'

  const whyAr =
    status === 'critical'
      ? `${countAr(live.unscheduled.length, AR_LESSON)} بلا يوم متاح حتى الموعد النهائي.`
      : `${countAr(progress.remaining, AR_LESSON)} متبقٍّ على ${countAr(learningDaysLeft, AR_DAY)} للتعلّم = ${countAr(neededPerDay, AR_LESSON)} يوميًّا.`

  return {
    status,
    expectedByYesterday: yesterday,
    expectedByToday: today,
    actual,
    lag,
    neededPerDay,
    learningDaysLeft,
    daysLeft,
    headlineAr,
    whyAr,
  }
}

function shiftKey(key: string, n: number): string {
  const t = Date.parse(key + 'T00:00:00Z')
  if (isNaN(t)) return key
  return new Date(t + n * 86_400_000).toISOString().slice(0, 10)
}

/* ── التعافي من التأخير ── */

export interface RecoveryPlan {
  live: ScheduleResult
  /** ما الذي ضحّينا به لجعل الجدول ممكنًا، بالترتيب. فارغ = لم نضحِّ بشيء. */
  sacrificesAr: string[]
  /** دروس لا تجد مكانًا حتى بعد كل التنازلات. */
  shortfall: number
  /** توصية صريحة عندما يستحيل الجدول. */
  verdictAr: string
}

/**
 * سلّم التنازلات — يُجرَّب بالترتيب من الأقل ضررًا إلى الأكثر.
 *
 * The order matters and is a pedagogical judgement, not an arbitrary one:
 * shrinking the pre-exam tail costs the least, dropping the weekly
 * consolidation days costs real retention, and raising the daily cap costs
 * sleep — so it comes last. Review time is protected as long as possible.
 */
const LADDER: { patch: Partial<ScheduleConfig>; costAr: string }[] = [
  { patch: {}, costAr: '' },
  { patch: { tailDays: 2 }, costAr: 'تقليص أيام ما قبل الامتحان من 3 إلى 2.' },
  { patch: { tailDays: 2, rampDays: 0 }, costAr: 'إلغاء أيام البداية المخفّفة.' },
  { patch: { tailDays: 2, rampDays: 0, consolidateEvery: 0 }, costAr: 'إلغاء أيام التثبيت الأسبوعية — هذا يكلّف تثبيتًا حقيقيًّا.' },
  { patch: { tailDays: 1, rampDays: 0, consolidateEvery: 0 }, costAr: 'لم يبقَ إلا يوم واحد قبل الامتحان بلا دروس جديدة.' },
]

export interface RecoveryInput {
  startKey: string
  todayKey: string
  deadlineKey: string
  lessonIds: string[]
  /** ما دُرس فعلًا في الأيام السابقة — يغذّي مراجعات اليوم. */
  priorDays?: Record<string, string[]>
  /** أقصى ما يقبله المستخدم من دروس في اليوم. */
  maxLessonsPerDay?: number
  /** مدّة الدرس — تُمرَّر للموزّع حتى تتوازن الأيام بالدقائق لا بالعدد. */
  minutesOf?: (id: string) => number
}

export function recoverSchedule(input: RecoveryInput): RecoveryPlan {
  const sacrificesAr: string[] = []
  let last: ScheduleResult | null = null

  for (const step of LADDER) {
    const patch: Partial<ScheduleConfig> = { ...step.patch }
    if (input.maxLessonsPerDay) patch.maxLessonsPerDay = input.maxLessonsPerDay
    const live = buildSchedule({
      startKey: input.startKey,
      fromKey: input.todayKey,
      deadlineKey: input.deadlineKey,
      lessonIds: input.lessonIds,
      priorDays: input.priorDays,
      minutesOf: input.minutesOf,
      config: patch,
    })
    last = live
    if (live.feasible) {
      return {
        live,
        sacrificesAr,
        shortfall: 0,
        verdictAr: sacrificesAr.length === 0
          ? 'الجدول قابل للتنفيذ بلا تنازلات.'
          : 'الجدول قابل للتنفيذ بعد التنازلات المذكورة.',
      }
    }
    if (step.costAr) sacrificesAr.push(step.costAr)
  }

  const shortfall = last?.unscheduled.length ?? input.lessonIds.length
  const daysLeft = Math.max(1, dayDiff(input.todayKey, input.deadlineKey))
  return {
    live: last!,
    sacrificesAr,
    shortfall,
    verdictAr:
      `غير قابل للتنفيذ: ${countAr(shortfall, AR_LESSON)} بلا مكان في ${countAr(daysLeft, AR_DAY)} متبقٍّ. ` +
      'الخيار الواقعي الوحيد هو تغطية أقل بجودة أعلى: أسقِط الدروس الأقل صلة بالامتحان ' +
      'بدل محاولة إنهاء الكل سطحيًّا.',
  }
}
