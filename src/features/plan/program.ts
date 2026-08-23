import { TOTAL_LESSONS, TOTAL_LESSON_MINUTES, makeMinutesResolver } from '@/data/curriculum'
import {
  allLessonIds, buildSchedule, dayDiff, type ScheduleResult, type ScheduledDay,
} from './schedule'
import { buildDayBlocks, type DayBlockPlan } from './blocks'
import {
  computeProgress, isCovered, lessonsByDay, orderLessons, programHealth, recoverSchedule,
  remainingLessonIds, statusOf,
  type LessonBook, type ProgramHealth, type ProgressSummary, type RecoveryPlan, type StudyOrder,
} from './progress'

/**
 * نموذج العرض الكامل للبرنامج — كل ما تحتاجه الواجهة، محسوبًا مرّة واحدة.
 *
 * Pure: takes the stored program plus today's key, returns every number the UI
 * shows. Keeping this out of the components means the same figures can be
 * asserted in tests, which is the only way a plan this arithmetic-heavy stays
 * trustworthy.
 */

export interface StudyProgramState {
  /** '' يعني أنّ البرنامج لم يُفعَّل بعد. لا تواريخ يخترعها التطبيق. */
  startKey: string
  deadlineKey: string
  lessons: LessonBook
  maxLessonsPerDay: number
  /** تجاوز مدّة الدرس لكل كتاب. فارغ = المدّة الافتراضية للكتاب. */
  lessonMinutes?: Record<string, number>
  order?: StudyOrder
  /** الدقائق المتاحة فعلًا في اليوم، بالوقت الجداري. 0 = بلا فحص. */
  dailyBudgetMinutes?: number
}

export interface OverdueDay {
  dayKey: string
  lessonIds: string[]
}

export interface UpcomingReview {
  dayKey: string
  recall: number
  spaced: number
}

export interface ProgramView {
  active: boolean
  baseline: ScheduleResult
  recovery: RecoveryPlan
  live: ScheduleResult
  health: ProgramHealth
  progress: ProgressSummary
  /** يوم اليوم من الجدول الحيّ، أو null إذا خرجنا من نافذة البرنامج. */
  today: ScheduledDay | null
  todayBlocks: DayBlockPlan | null
  /** أيام مضت وبقيت دروسها غير مغطّاة. */
  overdue: OverdueDay[]
  overdueLessons: number
  upcomingReviews: UpcomingReview[]
  daysTotal: number
  daysLeft: number
  /** إجمالي دقائق البرنامج كما هو مجدول الآن، تركيزًا واستراحةً. */
  plannedFocusMinutes: number
  plannedWallMinutes: number
  /** أثقل يوم في الجدول بالوقت الجداري، ويومه. */
  heaviestDayMinutes: number
  heaviestDayKey: string
  /** أيام تتجاوز الوقت المتاح يوميًّا. فارغ = الجدول يسع اليوم. */
  overBudgetDays: number
  /** الوقت المتاح يوميًّا كما أعلنه المستخدم. 0 = لم يُفحَص. */
  dailyBudgetMinutes: number
}

const EMPTY_SCHEDULE: ScheduleResult = {
  days: [], config: { consolidateEvery: 7, tailDays: 3, rampDays: 2, rampWeight: 0.75, maxLessonsPerDay: 12, spacedGapDays: 3 },
  unscheduled: [], feasible: true, peakLessonsPerDay: 0, learningDays: 0,
}

export function isProgramActive(p: StudyProgramState | null | undefined): boolean {
  return !!p && !!p.startKey && !!p.deadlineKey && dayDiff(p.startKey, p.deadlineKey) >= 0
}

export function buildProgramView(program: StudyProgramState, todayKey: string): ProgramView {
  if (!isProgramActive(program)) {
    return {
      active: false,
      baseline: EMPTY_SCHEDULE,
      recovery: { live: EMPTY_SCHEDULE, sacrificesAr: [], shortfall: 0, verdictAr: '' },
      live: EMPTY_SCHEDULE,
      health: {
        status: 'ontrack', expectedByYesterday: 0, expectedByToday: 0, actual: 0, lag: 0,
        neededPerDay: 0, learningDaysLeft: 0, daysLeft: 0,
        headlineAr: 'البرنامج غير مفعَّل.', whyAr: 'اختر تاريخ البداية والموعد النهائي.',
      },
      progress: computeProgress({}),
      today: null,
      todayBlocks: null,
      overdue: [],
      overdueLessons: 0,
      upcomingReviews: [],
      daysTotal: 0,
      daysLeft: 0,
      plannedFocusMinutes: 0,
      plannedWallMinutes: 0,
      heaviestDayMinutes: 0,
      heaviestDayKey: '',
      overBudgetDays: 0,
      dailyBudgetMinutes: 0,
    }
  }

  const book = program.lessons ?? {}
  const order = program.order ?? 'sequential'
  /* مدّة الدرس تُحلّ مرّة واحدة هنا وتُمرَّر لكل من يحسب وقتًا، فلا يبقى
     مكانان يفترضان 20 دقيقة بينما ضبط المستخدم شيئًا آخر. */
  const minutesOf = makeMinutesResolver(program.lessonMinutes ?? {})

  const baseline = buildSchedule({
    startKey: program.startKey,
    deadlineKey: program.deadlineKey,
    lessonIds: orderLessons(allLessonIds(), order),
    minutesOf,
    config: { maxLessonsPerDay: program.maxLessonsPerDay },
  })

  /* ما دُرس فعلًا قبل اليوم — بدونه يفقد اليوم الجاري كتلتَي المراجعة كلتيهما. */
  const priorDays = lessonsByDay(book)

  const recovery = recoverSchedule({
    startKey: program.startKey,
    todayKey,
    deadlineKey: program.deadlineKey,
    lessonIds: remainingLessonIds(book, order),
    priorDays,
    maxLessonsPerDay: program.maxLessonsPerDay,
    minutesOf,
  })
  const live = recovery.live

  const health = programHealth({ baseline, live, book, todayKey, deadlineKey: program.deadlineKey })
  const progress = computeProgress(book, program.lessonMinutes ?? {})

  const today = live.days.find((d) => d.dayKey === todayKey) ?? null
  const todayBlocks = today ? buildDayBlocks(today, minutesOf) : null

  /* المتأخّر يُقاس على الجدول المرجعي: ما كان مقرّرًا في يومٍ مضى ولم يُغطَّ. */
  const overdue: OverdueDay[] = []
  for (const d of baseline.days) {
    if (dayDiff(d.dayKey, todayKey) <= 0) continue
    const missed = d.lessonIds.filter((id) => !isCovered(statusOf(book, id)))
    if (missed.length > 0) overdue.push({ dayKey: d.dayKey, lessonIds: missed })
  }

  const upcomingReviews: UpcomingReview[] = live.days
    .filter((d) => dayDiff(todayKey, d.dayKey) > 0)
    .slice(0, 5)
    .map((d) => ({ dayKey: d.dayKey, recall: d.recallLessonIds.length, spaced: d.reviewLessonIds.length }))

  /* الجدوى ليست عدّ دروس فقط: يوم من ثماني حصص يمرّ من سقف الدروس بسهولة
     وقد يستغرق سبع ساعات. الوقت هو القيد الحقيقي، فيُقاس صراحةً. */
  const budget = Math.max(0, program.dailyBudgetMinutes ?? 0)
  let plannedFocusMinutes = 0
  let plannedWallMinutes = 0
  let heaviestDayMinutes = 0
  let heaviestDayKey = ''
  let overBudgetDays = 0
  for (const d of live.days) {
    const p = buildDayBlocks(d, minutesOf)
    plannedFocusMinutes += p.focusMinutes
    plannedWallMinutes += p.totalMinutes
    if (p.totalMinutes > heaviestDayMinutes) {
      heaviestDayMinutes = p.totalMinutes
      heaviestDayKey = d.dayKey
    }
    if (budget > 0 && p.totalMinutes > budget) overBudgetDays += 1
  }

  return {
    active: true,
    baseline,
    recovery,
    live,
    health,
    progress,
    today,
    todayBlocks,
    overdue,
    overdueLessons: overdue.reduce((s, d) => s + d.lessonIds.length, 0),
    upcomingReviews,
    daysTotal: baseline.days.length,
    daysLeft: Math.max(0, dayDiff(todayKey, program.deadlineKey)),
    plannedFocusMinutes,
    plannedWallMinutes,
    heaviestDayMinutes,
    heaviestDayKey,
    overBudgetDays,
    dailyBudgetMinutes: budget,
  }
}

/* ── نصوص الحالة ── */

export const PROGRAM_STATUS_AR: Record<ProgramHealth['status'], string> = {
  ahead: 'متقدّم',
  ontrack: 'على المسار',
  behind: 'متأخّر',
  critical: 'غير قابل للتنفيذ',
  done: 'المنهج مكتمل',
}

/** رمز لكل حالة — المعنى لا يُنقل باللون وحده. */
export const PROGRAM_STATUS_ICON: Record<ProgramHealth['status'], string> = {
  ahead: '▲',
  ontrack: '✔',
  behind: '▼',
  critical: '!',
  done: '★',
}

/** متغيّر اللون لكل حالة — من tokens.css وحدها. */
export const PROGRAM_STATUS_COLOR: Record<ProgramHealth['status'], string> = {
  ahead: 'var(--blue)',
  ontrack: 'var(--green)',
  behind: 'var(--amber)',
  critical: 'var(--red)',
  done: 'var(--green)',
}

export const PROGRAM_TOTALS = {
  lessons: TOTAL_LESSONS,
  lessonMinutes: TOTAL_LESSON_MINUTES,
}
