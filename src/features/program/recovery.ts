/**
 * التعافي من التأخير — إعادة بناء الجدول بدل انهياره.
 *
 * القواعد التي يلتزم بها هذا المحرّك:
 *  1. لا يُنشئ يومًا مستحيلًا: هناك سقف صريح للدروس اليومية.
 *  2. لا يأكل وقت المراجعة أولًا — المراجعة آخر ما يُضحّى به.
 *  3. الأيام الاحتياطية هي أول ما يُستهلك عند التأخّر (لهذا وُجدت).
 *  4. عند تجاوز كل الوسائل، يُعلن بصراحة أن الخطّة غير قابلة للتنفيذ
 *     ويقترح خيارات واقعية بدل تكديس المستحيل.
 */

import { LESSONS, SECTIONS, TOTAL_LESSONS, avgLessonMinutes, getLesson } from '@/data/curriculum'

/** فهرس الدروس بالمعرّف — يُبنى مرّة واحدة. */
const lessonById = new Map(LESSONS.map((l) => [l.id, l]))
import type { ProgramPlan } from './schedule'
import { buildProgram, dayWallMinutes, recallMinutesForDay, reviewMinutes, REVIEW_OFFSETS, MAX_LESSONS_PER_DAY } from './schedule'
import { statusOf, type StatusMap } from './progress'
import type { DayPlan, ReviewItem, SweepItem } from './types'
import { addDays } from './dates'

/** السقف المطلق للدروس الجديدة في يوم واحد — يُعاد تصديره من schedule. */
export { MAX_LESSONS_PER_DAY } from './schedule'


export type RecoveryAction =
  | 'none'
  | 'absorbBuffers'    // استخدام الأيام الاحتياطية
  | 'raiseDailyLoad'   // رفع الحمل اليومي ضمن السقف
  | 'consumeConsolidation' // اقتطاع من مرحلة التثبيت (ثمن حقيقي)
  | 'infeasible'       // لا مخرج ضمن القيود

export interface RecoveryPlan {
  action: RecoveryAction
  /** الجدول بعد إعادة البناء — أيام من اليوم الحالي فصاعدًا فقط. */
  days: DayPlan[]
  /** الدروس التي أُعيد توزيعها. */
  redistributed: number
  /** أثقل يوم ناتج على الساعة. */
  peakWallMinutes: number
  /** هل بقي وقت المراجعة سليمًا؟ */
  reviewPreserved: boolean
  /** كم يومًا من التثبيت اضطررنا لاستهلاكه. */
  consolidationDaysUsed: number
  headline: string
  detail: string
  /** خيارات واقعية عند الاستحالة. */
  options: string[]
}

/**
 * إعادة توزيع الدروس غير المُنجَزة على الأيام المتبقّية.
 *
 * ملاحظة تصميمية: لا نُعيد ترتيب المنهج. الدروس تراكمية، فالدرس 40 يجب أن
 * يسبق الدرس 41 حتى لو تأخّرنا. ما نُعيد حسابه هو *كم* درسًا في اليوم، لا *أيّها*.
 */
export function rebuildFrom(
  plan: ProgramPlan,
  map: StatusMap,
  todayKey: string,
): RecoveryPlan {
  // 1) الدروس المتبقّية بالترتيب المنهجي.
  const pending = LESSONS.filter((l) => statusOf(map, l.id) === 'new').map((l) => l.id)

  // 2) الأيام المتاحة من اليوم فصاعدًا.
  const future = plan.days.filter((d) => d.date >= todayKey)
  const learnable = future.filter((d) => d.kind === 'learn')
  const buffers = future.filter((d) => d.kind === 'buffer')
  const consolidation = future.filter((d) => d.kind === 'consolidate')

  if (pending.length === 0) {
    return {
      action: 'none',
      days: future,
      redistributed: 0,
      peakWallMinutes: peakOf(future, plan),
      reviewPreserved: true,
      consolidationDaysUsed: 0,
      headline: 'لا تأخير — كل الدروس مغطّاة',
      detail: 'المتبقّي هو الاسترجاع والتثبيت فقط. لا حاجة لإعادة توزيع.',
      options: [],
    }
  }

  // 3) المستوى الأول: أيام التعلّم وحدها.
  let pool = learnable
  let action: RecoveryAction = 'none'
  let consolidationUsed = 0

  let capacityPerDay = pool.length > 0 ? pending.length / pool.length : Infinity

  if (capacityPerDay > MAX_LESSONS_PER_DAY) {
    // المستوى الثاني: استهلك الأيام الاحتياطية.
    pool = [...learnable, ...buffers].sort(byDate)
    action = 'absorbBuffers'
    capacityPerDay = pool.length > 0 ? pending.length / pool.length : Infinity
  } else if (pending.length > sumLessons(learnable)) {
    action = 'raiseDailyLoad'
  }

  if (capacityPerDay > MAX_LESSONS_PER_DAY) {
    // المستوى الثالث: اقتطع من مرحلة التثبيت — بثمن معلن.
    const needed = Math.ceil(pending.length / MAX_LESSONS_PER_DAY) - pool.length
    const take = Math.max(0, Math.min(needed, Math.max(0, consolidation.length - 2)))
    consolidationUsed = take
    pool = [...pool, ...consolidation.slice(0, take)].sort(byDate)
    action = take > 0 ? 'consumeConsolidation' : 'infeasible'
    capacityPerDay = pool.length > 0 ? pending.length / pool.length : Infinity
  }

  const infeasible = capacityPerDay > MAX_LESSONS_PER_DAY || pool.length === 0

  // 4) وزّع الدروس بالترتيب، بتناقص طفيف (الأثقل مبكّرًا).
  const poolDates = new Set(pool.map((d) => d.date))
  const loads = distribute(pending.length, pool.length)
  const newLessonsByDate: Record<string, string[]> = {}
  let cursor = 0
  pool.forEach((d, i) => {
    const n = Math.min(loads[i] ?? 0, MAX_LESSONS_PER_DAY)
    newLessonsByDate[d.date] = pending.slice(cursor, cursor + n)
    cursor += n
  })
  const redistributed = cursor

  // 5) ابنِ الأيام الجديدة بالدروس المُعاد توزيعها.
  const withLessons: DayPlan[] = future.map((d) => {
    if (!poolDates.has(d.date)) {
      return { ...d, lessons: [] }
    }
    const lessons = newLessonsByDate[d.date] ?? []
    const wasBuffer = d.kind === 'buffer'
    const wasConsol = d.kind === 'consolidate'
    return {
      ...d,
      lessons,
      // اليوم الاحتياطي الذي استُهلك يفقد صفته الاحتياطية.
      kind: lessons.length > 0 && (wasBuffer || wasConsol) ? 'learn' : d.kind,
      label: lessons.length > 0 && wasBuffer
        ? 'يوم احتياطي مُستهلَك — تعويض دروس متأخّرة'
        : lessons.length > 0 && wasConsol
          ? 'يوم تثبيت مُقتطَع — تعويض دروس متأخّرة'
          : d.label,
    }
  })

  // 6) أعِد جدولة المراجعات على مواعيد الإتمام الجديدة.
  //
  // إبقاء المراجعات في أماكنها الأصلية بعد إزاحة الدروس كان يُنتج مراجعات
  // لأقسام لم تُدرَس بعد (قياس فعلي: 76 حالة، أسوأها بـ4 أيام سبقًا).
  // المراجعة تتبع الدرس دائمًا، لا العكس.
  const days = rescheduleReviews(withLessons, plan, map)

  const peak = peakOf(days, plan)
  const reviewPreserved = consolidationUsed === 0

  const headline = infeasible
    ? 'الخطّة الحالية غير قابلة للتنفيذ'
    : action === 'absorbBuffers'
      ? 'أُعيد التوزيع باستخدام الأيام الاحتياطية'
      : action === 'consumeConsolidation'
        ? 'أُعيد التوزيع — بثمن من وقت التثبيت'
        : action === 'raiseDailyLoad'
          ? 'أُعيد التوزيع برفع الحمل اليومي'
          : 'أُعيد التوزيع ضمن الأيام المتاحة'

  const detail = infeasible
    ? `متبقّي ${pending.length} درسًا على ${pool.length} يومًا = ${capacityPerDay.toFixed(1)} درس/يوم، فوق السقف الآمن (${MAX_LESSONS_PER_DAY}). لن أعطيك جدولًا يبدو منظّمًا وهو مستحيل.`
    : `وُزِّع ${redistributed} درسًا على ${pool.length} يومًا (بحدّ أقصى ${Math.max(...loads, 0)} درسًا/يوم، أثقل يوم ${peak} دقيقة على الساعة).${
        consolidationUsed > 0 ? ` استُهلك ${consolidationUsed} من أيام التثبيت — هذا يقلّل فرصة تحويل «مكتمل» إلى «متقن».` : ' وقت المراجعة لم يُمَسّ.'
      }`

  const options = infeasible ? buildOptions(plan, pending.length, pool.length) : []

  return {
    action: infeasible ? 'infeasible' : action,
    days,
    redistributed,
    peakWallMinutes: peak,
    reviewPreserved,
    consolidationDaysUsed: consolidationUsed,
    headline,
    detail,
    options,
  }
}

/**
 * إعادة جدولة المراجعات والكنس بعد إزاحة الدروس.
 *
 * القاعدة الثابتة: لا مراجعة لقسم قبل أن يكتمل. تُعاد المواعيد من تاريخ
 * الإتمام **الجديد** + (1، 3، 7) أيام، مقصوصةً على آخر يوم متاح. القسم
 * الذي أُنجزت كل دروسه سابقًا يحتفظ بتاريخ إتمامه الأصلي.
 */
function rescheduleReviews(days: DayPlan[], plan: ProgramPlan, map: StatusMap): DayPlan[] {
  if (days.length === 0) return days

  // (أ) تاريخ الإتمام الجديد لكل قسم.
  const completion: Record<string, string> = {}
  const pendingBySection = new Map<string, number>()
  for (const l of LESSONS) {
    if (statusOf(map, l.id) === 'new') {
      pendingBySection.set(l.sectionId, (pendingBySection.get(l.sectionId) ?? 0) + 1)
    }
  }
  const placed = new Map<string, number>()
  for (const d of days) {
    for (const id of d.lessons) {
      const l = lessonById.get(id) ?? getLesson(id)
      if (!l) continue
      const n = (placed.get(l.sectionId) ?? 0) + 1
      placed.set(l.sectionId, n)
      if (n === pendingBySection.get(l.sectionId)) completion[l.sectionId] = d.date
    }
  }
  // أقسام بلا دروس متبقّية ⇒ اكتملت سابقًا.
  for (const s of SECTIONS) {
    if (!completion[s.id]) completion[s.id] = plan.sectionCompletion[s.id] ?? days[0].date
  }

  // (ب) آخر يوم يقبل مراجعة = آخر يوم قبل التخفيف، أو آخر يوم متاح.
  const usable = days.filter((d) => d.kind !== 'taper' && d.kind !== 'deadline')
  const cap = (usable[usable.length - 1] ?? days[days.length - 1]).date

  // (ج) أعد بناء المراجعات من الصفر على الشبكة الجديدة.
  const reviewsByDate: Record<string, ReviewItem[]> = {}
  const sweepsByDate: Record<string, SweepItem[]> = {}
  const dateSet = new Set(days.map((d) => d.date))

  for (const s of SECTIONS) {
    const source = completion[s.id]
    const used = new Set<string>()
    REVIEW_OFFSETS.forEach((off, i) => {
      const stage = (i + 1) as 1 | 2 | 3
      const wanted = addDays(source, off)
      // اقصص على آخر يوم متاح، وتخطَّ ما يقع خارج النافذة المتبقّية.
      const date = wanted > cap ? cap : wanted
      if (date <= source || !dateSet.has(date) || used.has(date)) return
      used.add(date)
      ;(reviewsByDate[date] ??= []).push({
        sectionId: s.id,
        stage,
        minutes: reviewMinutes(s.size, stage),
        sourceDate: source,
        clamped: wanted > cap,
      })
    })
  }

  // (د) الكنس الشامل يبقى في أيام التثبيت، لكن بعد الإتمام دائمًا.
  for (const d of days) {
    for (const sw of d.sweeps) {
      const done = completion[sw.sectionId]
      const target = d.date > done ? d.date : (cap > done ? cap : null)
      if (target) (sweepsByDate[target] ??= []).push(sw)
    }
  }

  return days.map((d) => ({
    ...d,
    reviews: reviewsByDate[d.date] ?? [],
    sweeps: sweepsByDate[d.date] ?? [],
  }))
}

/** خيارات واقعية عند استحالة الجدول — أرقام لا شعارات. */
function buildOptions(plan: ProgramPlan, pending: number, days: number): string[] {
  const out: string[] = []

  // أ) كم يومًا إضافيًا نحتاج؟
  const neededDays = Math.ceil(pending / MAX_LESSONS_PER_DAY)
  const extra = Math.max(0, neededDays - days)
  if (extra > 0) {
    out.push(`مدّد الموعد ${extra} يومًا: يجعل الحمل ${MAX_LESSONS_PER_DAY} درسًا/يوم وهو أقصى ما يحتمله الاسترجاع الجادّ.`)
  }

  // ب) كم درسًا يجب إسقاطه؟
  const capacity = days * MAX_LESSONS_PER_DAY
  const drop = Math.max(0, pending - capacity)
  if (drop > 0) {
    out.push(`أسقِط ${drop} درسًا من الأقلّ أولوية (آخر أقسام الكتاب الثالث عادةً) وركّز على إتقان الباقي — تغطية 100% بلا إتقان تساوي صفرًا في الامتحان.`)
  }

  // ج) رفع الطاقة اليومية.
  const needMins = Math.round((pending / days) * avgLessonMinutes(plan.config.durationModel) * 1.25)
  if (needMins > plan.config.dailyCapacityMinutes) {
    out.push(`ارفع الطاقة اليومية إلى ${needMins} دقيقة على الأقل — إن لم يكن ذلك واقعيًا فالخياران أعلاه هما الحلّ الحقيقي.`)
  }

  out.push('لا تُلغِ المراجعة لتوفير وقت: إسقاط الاسترجاع يوفّر ساعات ويكلّفك المحتوى كلّه.')
  return out
}

/** توزيع n عنصرًا على d يومًا بتناقص طفيف ومجموع مضبوط. */
function distribute(n: number, d: number): number[] {
  if (d <= 0) return []
  const base = Math.floor(n / d)
  let rem = n - base * d
  const out = new Array<number>(d).fill(base)
  for (let i = 0; i < d && rem > 0; i++) { out[i] += 1; rem -= 1 }
  return out
}

function sumLessons(days: DayPlan[]): number {
  return days.reduce((a, d) => a + d.lessons.length, 0)
}

function peakOf(days: DayPlan[], plan: ProgramPlan): number {
  return days.reduce((max, d) => Math.max(max, dayWallMinutes(d, plan.config)), 0)
}

function byDate(a: DayPlan, b: DayPlan) {
  return a.date < b.date ? -1 : a.date > b.date ? 1 : 0
}

/**
 * ماذا لو أنجز المستخدم أكثر من المخطّط؟
 * لا نُقدّم دروسًا جديدة تلقائيًا — نُرجع الفائض إلى الاسترجاع.
 */
export function surplusAdvice(surplusLessons: number, minutesFreed: number): string {
  if (surplusLessons <= 0) return ''
  return `أنجزتَ ${surplusLessons} درسًا فوق خطّة اليوم (~${minutesFreed} دقيقة فائضة). `
    + 'الأفضل استثمارها في استرجاع أقسام سابقة لا في دروس إضافية: '
    + 'التعرّض الأول رخيص، والاسترجاع هو ما يثبّت.'
}

/** إعادة بناء كاملة عند تغيير الإعدادات (تاريخ، طاقة، أيام احتياطية). */
export function rebuildWithConfig(overrides: Partial<ProgramPlan['config']>, base: ProgramPlan): ProgramPlan {
  return buildProgram({ ...base.config, ...overrides })
}

/**
 * كم درسًا يجب إنجازه اليوم للبقاء على المسار.
 *
 * هو الأكبر بين: ما جدولته الخطّة لهذا اليوم، ومعدّل التعويض المطلوب.
 * أخذ معدّل التعويض وحده يعطي رقمًا أقلّ من جدول اليوم نفسه (لأنه يوزّع
 * المتبقّي على كل الأيام بالتساوي)، فيتناقض الهدف مع الجدول المعروض.
 */
export function todayTarget(plan: ProgramPlan, map: StatusMap, todayKey: string): number {
  const pending = TOTAL_LESSONS - LESSONS.filter((l) => statusOf(map, l.id) !== 'new').length
  if (pending === 0) return 0

  const scheduledToday = plan.byDate[todayKey]?.lessons.length ?? 0
  const future = plan.days.filter((d) => d.date >= todayKey && (d.kind === 'learn' || d.kind === 'buffer'))
  if (future.length === 0) return Math.min(MAX_LESSONS_PER_DAY, pending)

  const catchUpRate = Math.ceil(pending / future.length)
  return Math.min(MAX_LESSONS_PER_DAY, Math.max(scheduledToday, catchUpRate))
}

/** دقائق العمل المتوقّعة لهدف اليوم (دروس + استرجاع). */
export function targetMinutes(lessons: number, plan: ProgramPlan): number {
  return Math.round(lessons * avgLessonMinutes(plan.config.durationModel)) + recallMinutesForDay(lessons, plan.config)
}
