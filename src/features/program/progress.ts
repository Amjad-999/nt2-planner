/**
 * حساب التقدّم — من البيانات، لا بالتقدير.
 *
 * «نسبة الدروس المنجزة» وحدها مضلّلة: مشاهدة 164 درسًا لا تعني إتقانها.
 * لذلك نُخرج رقمين منفصلين:
 *  - completionPct: نسبة التغطية (كم درسًا مررتَ عليه)
 *  - masteryPct:    نسبة الإتقان الموزونة بحالة كل درس
 * والفارق بينهما هو بالضبط «وهم الإتقان» الذي نريد إظهاره بدل إخفائه.
 */

import { LESSONS, SECTIONS, TOTAL_LESSONS, avgLessonMinutes, sumLessonMinutes } from '@/data/curriculum'
import type { DurationModel } from '@/data/curriculum'
import type { DayPlan, LessonStatus } from './types'
import type { ProgramPlan } from './schedule'
import { dayWallMinutes, dayHasWork, MAX_LESSONS_PER_DAY } from './schedule'

/** وزن كل حالة في حساب الإتقان. */
export const STATUS_WEIGHT: Record<LessonStatus, number> = {
  new: 0,
  active: 0.30,
  done: 0.60,
  review: 0.60,   // نفس المعرفة كـ done — «حان موعد المراجعة» ليس تراجعًا
  weak: 0.40,     // دليل فشل استرجاع ⇒ أقلّ من done
  mastered: 1.00,
}

export const STATUS_AR: Record<LessonStatus, string> = {
  new: 'لم يبدأ',
  active: 'قيد الدراسة',
  done: 'مكتمل',
  review: 'يحتاج مراجعة',
  weak: 'ضعيف',
  mastered: 'متقن',
}

export const STATUS_COLOR: Record<LessonStatus, string> = {
  new: 'var(--muted2)',
  active: 'var(--blue)',
  done: 'var(--green)',
  review: 'var(--amber)',
  weak: 'var(--red)',
  mastered: 'var(--orange)',
}

export type StatusMap = Record<string, LessonStatus>

export function statusOf(map: StatusMap, lessonId: string): LessonStatus {
  return map[lessonId] ?? 'new'
}

export interface ProgressSummary {
  total: number
  counts: Record<LessonStatus, number>
  /** عدد الدروس التي تجاوزت التعرّض الأول. */
  covered: number
  /** الدروس المتبقّية بلا تعرّض. */
  remaining: number
  completionPct: number
  masteryPct: number
  /** الفجوة بين التغطية والإتقان — مؤشّر «وهم الإتقان». */
  illusionGapPct: number
  /** دقائق الدروس المتبقّية (تعرّض أول فقط). */
  remainingLessonMinutes: number
}

export function summarize(map: StatusMap, model: DurationModel = 'flat'): ProgressSummary {
  const counts: Record<LessonStatus, number> = {
    new: 0, active: 0, done: 0, review: 0, weak: 0, mastered: 0,
  }
  let weighted = 0
  for (const l of LESSONS) {
    const st = statusOf(map, l.id)
    counts[st] += 1
    weighted += STATUS_WEIGHT[st]
  }
  const covered = TOTAL_LESSONS - counts.new
  const completionPct = pct(covered, TOTAL_LESSONS)
  const masteryPct = pct(weighted, TOTAL_LESSONS)

  return {
    total: TOTAL_LESSONS,
    counts,
    covered,
    remaining: counts.new,
    completionPct,
    masteryPct,
    illusionGapPct: Math.max(0, completionPct - masteryPct),
    remainingLessonMinutes: sumLessonMinutes(LESSONS.filter((l) => statusOf(map, l.id) === 'new').map((l) => l.id), model),
  }
}

/** تقدّم قسم واحد. */
export function sectionProgress(map: StatusMap, sectionId: string) {
  const lessons = LESSONS.filter((l) => l.sectionId === sectionId)
  let weighted = 0, covered = 0, weak = 0, mastered = 0
  for (const l of lessons) {
    const st = statusOf(map, l.id)
    weighted += STATUS_WEIGHT[st]
    if (st !== 'new') covered += 1
    if (st === 'weak') weak += 1
    if (st === 'mastered') mastered += 1
  }
  return {
    size: lessons.length,
    covered,
    weak,
    mastered,
    completionPct: pct(covered, lessons.length),
    masteryPct: pct(weighted, lessons.length),
  }
}

/** كل الأقسام مرتّبة حسب الضعف — مصدر أولويات «إصلاح النقاط الضعيفة». */
export function weakestSections(map: StatusMap, limit = 5) {
  return SECTIONS
    .map((s) => ({ section: s, ...sectionProgress(map, s.id) }))
    .filter((s) => s.covered > 0)
    .sort((a, b) => a.masteryPct - b.masteryPct || b.weak - a.weak)
    .slice(0, limit)
}

/** الدروس المعلّمة «ضعيف» أو «يحتاج مراجعة»، بالترتيب المنهجي. */
export function lessonsNeedingWork(map: StatusMap): { weak: string[]; review: string[] } {
  const weak: string[] = [], review: string[] = []
  for (const l of LESSONS) {
    const st = statusOf(map, l.id)
    if (st === 'weak') weak.push(l.id)
    else if (st === 'review') review.push(l.id)
  }
  return { weak, review }
}

export interface DayProgress {
  date: string
  plannedLessons: number
  doneLessons: number
  pct: number
  /** دقائق العمل المخطّطة لهذا اليوم على الساعة. */
  plannedWallMinutes: number
}

/** إنجاز يوم واحد = نسبة دروسه التي غادرت حالة «لم يبدأ». */
export function dayProgress(day: DayPlan, map: StatusMap, plan: ProgramPlan): DayProgress {
  const done = day.lessons.filter((id) => statusOf(map, id) !== 'new').length
  return {
    date: day.date,
    plannedLessons: day.lessons.length,
    doneLessons: done,
    pct: day.lessons.length === 0 ? (dayHasWork(day) ? 0 : 100) : pct(done, day.lessons.length),
    plannedWallMinutes: dayWallMinutes(day, plan.config),
  }
}

export type PaceStatus = 'ahead' | 'onTrack' | 'behind' | 'critical'

export interface PaceReport {
  status: PaceStatus
  label: string
  /** كم درسًا كان يجب إنجازه حتى نهاية أمس/اليوم حسب الخطّة. */
  expected: number
  /** كم درسًا أُنجز فعلًا. */
  actual: number
  /** الفارق (موجب = متأخّر). */
  lag: number
  /** الأيام المتبقّية القابلة للتعلّم. */
  learnDaysLeft: number
  /** متوسّط الدروس المطلوب يوميًا من الآن لإنهاء المنهج. */
  requiredPerDay: number
  /** دقائق على الساعة يوميًا مطلوبة من الآن. */
  requiredWallMinutes: number
  note: string
}

/**
 * حالة الإيقاع.
 *
 * «المتوقّع» = مجموع دروس الأيام **السابقة** لليوم الحالي فقط.
 * لا نحتسب دروس اليوم الجاري لأنه لم ينتهِ بعد — احتسابها يجعل البرنامج
 * يعلن أنك «متأخّر» في صباح اليوم الأول قبل أن تفتح درسًا واحدًا.
 */
export function assessPace(
  plan: ProgramPlan,
  map: StatusMap,
  todayKey: string,
  capacityMinutes: number,
): PaceReport {
  let expected = 0
  for (const d of plan.days) {
    if (d.date < todayKey) expected += d.lessons.length
  }
  const summary = summarize(map, plan.config.durationModel)
  const actual = summary.covered
  const lag = expected - actual

  // أيام التعلّم المتبقّية: اليوم وما بعده. الأيام الاحتياطية تُحتسب لأنها
  // قابلة للاستيعاب عند التأخّر — وهذا بالضبط سبب وجودها.
  const futureDays = plan.days.filter((d) => d.date >= todayKey)
  const absorbable = futureDays.filter((d) => d.kind === 'learn' || d.kind === 'buffer')
  const learnDaysLeft = absorbable.length

  const remaining = summary.remaining
  const requiredPerDay = learnDaysLeft > 0 ? remaining / learnDaysLeft : remaining

  // الوقت المطلوب يوميًا: دروس + استرجاع + متوسّط مراجعة يومية متبقّية.
  const futureReviewMin = futureDays.reduce(
    (a, d) => a + d.reviews.reduce((x, r) => x + r.minutes, 0) + d.sweeps.reduce((x, s) => x + s.minutes, 0),
    0,
  )
  const avgMin = avgLessonMinutes(plan.config.durationModel)
  const recallRatio = plan.config.recallMinutes / (2 * avgMin)
  const perDayLessonMin = requiredPerDay * avgMin * (1 + recallRatio)
  const perDayReviewMin = futureDays.length > 0 ? futureReviewMin / futureDays.length : 0
  // تقدير الاستراحات: استراحة لكل كتلة درسين، بمتوسّط بين القصيرة والطويلة.
  const avgBreak = (plan.config.shortBreak * 2 + plan.config.longBreak) / 3
  const blocks = Math.max(0, Math.ceil(requiredPerDay / 2) - 1)
  const requiredWallMinutes = Math.round(
    perDayLessonMin + perDayReviewMin + blocks * avgBreak + plan.config.closeMinutes,
  )

  let status: PaceStatus

  /*
   * الحالة تُحسم بما **يتبقّى**، لا بحجم التأخّر التاريخي.
   *
   * المنطق السابق كان يعلن «حرج — غير قابلة للتنفيذ» لمجرّد أن التأخّر تجاوز
   * 12% من المنهج، حتى حين تُظهر أرقامه نفسها أن العمل المتبقّي يسع الوقت
   * المتبقّي (317 د مطلوبة مقابل 330 د متاحة). التأخّر الكبير الذي ما زال
   * قابلًا للتعويض ليس حالة حرجة — الحالة الحرجة أن يتجاوز المطلوب الطاقة
   * أو السقف الآمن للدروس اليومية.
   */
  const overCapacity = requiredWallMinutes > capacityMinutes
  const overDailyCap = requiredPerDay > MAX_LESSONS_PER_DAY

  if (lag <= -5) status = 'ahead'
  else if (lag <= 2 && !overCapacity && !overDailyCap) status = 'onTrack'
  else if (overCapacity || overDailyCap) status = 'critical'
  else status = 'behind'

  const label = status === 'ahead' ? 'متقدّم على الخطّة'
    : status === 'onTrack' ? 'على المسار'
    : status === 'behind' ? 'متأخّر — قابل للتعويض'
    : 'حرج — الخطّة الحالية غير قابلة للتنفيذ'

  let note: string
  if (status === 'ahead') {
    note = `أنجزتَ ${-lag} درسًا فوق المخطّط. استثمر الفائض في الاسترجاع لا في المزيد من الدروس الجديدة.`
  } else if (status === 'onTrack') {
    note = `متبقّي ${remaining} درسًا على ${learnDaysLeft} يومًا — بمعدّل ${requiredPerDay.toFixed(1)} درس/يوم.`
  } else if (status === 'behind') {
    note = `متأخّر ${lag} درسًا، لكنّ التعويض ممكن: ${requiredPerDay.toFixed(1)} درس/يوم `
      + `(~${requiredWallMinutes} د على الساعة) ضمن طاقتك ${capacityMinutes} د.`
  } else if (overDailyCap) {
    note = `متأخّر ${lag} درسًا. المطلوب ${requiredPerDay.toFixed(1)} درس/يوم — فوق السقف الآمن `
      + `(${MAX_LESSONS_PER_DAY} درسًا) الذي يبقى معه وقت لاسترجاع حقيقي. لن ينجح دون تقليص المحتوى أو تمديد الموعد.`
  } else {
    note = `متأخّر ${lag} درسًا. المطلوب ${requiredPerDay.toFixed(1)} درس/يوم (~${requiredWallMinutes} د) `
      + `مقابل طاقتك ${capacityMinutes} د — عجز ${requiredWallMinutes - capacityMinutes} د يوميًا. `
      + `لن ينجح دون رفع الطاقة أو تقليص المحتوى أو تمديد الموعد.`
  }

  return {
    status, label, expected, actual, lag,
    learnDaysLeft,
    requiredPerDay: Math.round(requiredPerDay * 10) / 10,
    requiredWallMinutes,
    note,
  }
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 1000) / 10
}
