/**
 * محرّك بناء البرنامج.
 *
 * دالة نقيّة واحدة `buildProgram(config)` تُخرج الجدول كاملًا.
 * لا شيء في الواجهة يحسب أرقامًا بنفسه — كلّه يقرأ من هنا.
 *
 * مبادئ التصميم المطبَّقة:
 *  1. الدروس الجديدة تسير بالترتيب (المنهج تراكمي: A2 → B1-1 → B1-2)،
 *     والتشبيك (interleaving) يُطبَّق على المراجعة لا على التعرّض الأول.
 *  2. تناقص تدريجي في حمل الدروس الجديدة (10 → 9 → 8) لأن حمل المراجعة
 *     المتباعدة يتزايد مع الوقت؛ المجموع يجب أن يبقى محتملًا.
 *  3. أيام احتياطية مجدولة صراحةً — الهامش الذي لا يُجدوَل لا ينجو.
 *  4. المراجعة المتباعدة على مستوى القسم (+1، +3، +7 يوم) ثم كنس شامل
 *     في مرحلة التثبيت.
 */

import {
  LESSONS, SECTIONS, TOTAL_LESSONS, sumLessonMinutes, lessonMinutesById,
  type CurriculumSection, type DurationModel,
} from '@/data/curriculum'
import { addDays, dateRange, diffDays } from './dates'
import { FREE_SESSION_MINUTES } from './timeline'
import type { DayPlan, ProgramConfig, ReviewItem, SweepItem, FeasibilityReport } from './types'

/** الإعدادات الافتراضية — مشتقّة من بيانات المستخدم الفعلية. */
export const DEFAULT_CONFIG: ProgramConfig = {
  startDate: '2026-08-21',
  deadline: '2026-09-16',
  dayStart: '08:30',
  bufferDays: 2,
  consolidationDays: 5,
  recallMinutes: 10,
  shortBreak: 10,
  longBreak: 20,
  blocksBeforeLongBreak: 3,
  closeMinutes: 10,
  dailyCapacityMinutes: 330, // 5س 30د على الساعة
  durationModel: 'flat',       // تقدير المستخدم: 20 دقيقة لكل درس
}

/** السقف الآمن للدروس الجديدة في يوم واحد (مُعرَّف هنا لتفادي دورة استيراد مع recovery). */
export const MAX_LESSONS_PER_DAY = 12

/** فترات المراجعة المتباعدة بالأيام بعد إتمام القسم. */
export const REVIEW_OFFSETS = [1, 3, 7] as const

/** دقائق مراجعة القسم حسب الحجم والمرحلة — تتصاعد لأن الاسترجاع يتعمّق. */
export function reviewMinutes(size: number, stage: 1 | 2 | 3): number {
  // ~0.85 / 1.0 / 1.15 دقيقة لكل درس داخل القسم، بحدّ أدنى معقول.
  const factor = stage === 1 ? 0.85 : stage === 2 ? 1.0 : 1.15
  return Math.max(6, Math.round(size * factor))
}

/** دقائق الكنس الشامل للقسم في مرحلة التثبيت. */
export function sweepMinutes(size: number): number {
  return Math.max(10, Math.round(size * 1.3))
}

/**
 * قوّة التناقص: نصف المدى بين أثقل يوم وأخفّ يوم (بالدروس).
 * 1 يعني أن اليوم الأول ≈ المتوسّط + 1 والأخير ≈ المتوسّط − 1.
 */
export const TAPER_DELTA = 1

/**
 * توزيع الدروس على أيام التعلّم بتناقص تدريجي.
 *
 * السبب: حمل المراجعة المتباعدة يتزايد يومًا بعد يوم (كل قسم يُنجَز يضيف
 * ثلاث مراجعات لاحقة)، فيجب أن ينقص حمل الدروس الجديدة بالمقابل حتى يبقى
 * إجمالي اليوم مستقرًّا بدل أن ينفجر في الأسبوع الأخير.
 *
 * ضمانات هذه الدالة (يتحقّق منها الاختبار):
 *  - الطول = learnDays بالضبط
 *  - المجموع = totalLessons بالضبط
 *  - كل يوم ≥ 1 درس
 *  - المصفوفة غير متزايدة (تناقص فعلي)
 */
export function taperLoads(totalLessons: number, learnDays: number): number[] {
  if (learnDays <= 0) return []
  if (learnDays === 1) return [totalLessons]

  const avg = totalLessons / learnDays

  // 1) منحنى خطّي متناقص حول المتوسّط.
  const loads: number[] = []
  for (let i = 0; i < learnDays; i++) {
    const t = 1 - (2 * i) / (learnDays - 1)      // +1 عند البداية، −1 عند النهاية
    loads.push(Math.max(1, Math.round(avg + TAPER_DELTA * t)))
  }

  // 2) تصحيح المجموع بدقّة: التقريب قد يزيد أو ينقص وحدات.
  let diff = totalLessons - loads.reduce((a, b) => a + b, 0)
  for (let guard = 0; diff !== 0 && guard < learnDays * 8; guard++) {
    if (diff > 0) {
      // أضف للأيام الأثقل أوّلًا (تحميل أمامي) — أقلّ إخلالًا بالتناقص.
      let idx = 0
      for (let i = 1; i < learnDays; i++) if (loads[i] > loads[idx]) idx = i
      loads[idx] += 1
      diff -= 1
    } else {
      // اخصم من الأيام الأخفّ أوّلًا، مع احترام الحدّ الأدنى 1.
      let idx = -1
      for (let i = 0; i < learnDays; i++) {
        if (loads[i] <= 1) continue
        if (idx === -1 || loads[i] < loads[idx]) idx = i
      }
      if (idx === -1) break   // كل الأيام عند الحدّ الأدنى — لا مجال للخصم
      loads[idx] -= 1
      diff += 1
    }
  }

  // 3) الترتيب تنازليًا يضمن التناقص دون تغيير المجموع (نفس المتعدّدة).
  loads.sort((a, b) => b - a)
  return loads
}

/**
 * قوّة التناقص النسبية في التوزيع بالدقائق: 0.1 = اليوم الأول أثقل بـ10%
 * من المتوسّط والأخير أخفّ بـ10%.
 */
export const TAPER_STRENGTH = 0.1

/**
 * توزيع الدروس على أيام التعلّم **موازنةً بالدقائق لا بعدد الدروس**.
 *
 * السبب: دروس B1 تساوي ضعف دروس A2 حجمًا. التوزيع بعدد الدروس يجعل يومًا
 * فيه 10 دروس من B1 أثقل بساعتين من يوم فيه 11 درسًا من A2 — وهو ما كان
 * ينتج ذروة 8س32د في النموذج الموزون. الموازنة بالدقائق تُسوّي الأيام فعليًا.
 *
 * ضمانات (يتحقّق منها الاختبار):
 *  - كل الدروس موزّعة، بالترتيب التراكمي، بلا تكرار ولا نقص
 *  - كل يوم تعلّم يحصل على درس واحد على الأقل
 *  - لا يوم يتجاوز `maxPerDay`
 */
export function distributeByMinutes(
  lessonIds: readonly string[],
  learnDays: number,
  model: DurationModel,
  maxPerDay: number,
): string[][] {
  const out: string[][] = Array.from({ length: Math.max(0, learnDays) }, () => [])
  if (learnDays <= 0) return out
  if (learnDays === 1) return [[...lessonIds]]

  // معامل التناقص لليوم i — متناقص خطّيًا حول 1.
  const factor = (i: number) => 1 + TAPER_STRENGTH * (1 - (2 * i) / (learnDays - 1))

  /**
   * هدف اليوم بالدقائق، مُعاد حسابه من **المتبقّي فعلًا**.
   *
   * الأهداف الثابتة المحسوبة مرّة واحدة تفشل هنا: سقف الدروس اليومي يجعل
   * أيام A2 (دروس قصيرة) تُغلَق دون بلوغ هدفها، فيتراكم العجز ويُلقى كلّه
   * على اليوم الأخير. إعادة الحساب في كل يوم تُصحّح الانحراف ذاتيًا.
   */
  const targetFor = (d: number, remainingMinutes: number) => {
    let s = 0
    for (let i = d; i < learnDays; i++) s += factor(i)
    return s > 0 ? (remainingMinutes * factor(d)) / s : remainingMinutes
  }

  let day = 0
  let acc = 0
  let remainMin = sumLessonMinutes(lessonIds, model)
  let target = targetFor(0, remainMin)

  for (let k = 0; k < lessonIds.length; k++) {
    const id = lessonIds[k]
    const m = lessonMinutesById(id, model)
    const remainingLessons = lessonIds.length - k
    const remainingDays = learnDays - day

    const dayFull = out[day].length >= maxPerDay
    // انتقل عندما يتجاوز اليوم هدفه (بتقريب نصف درس لتقليل الانحراف).
    const overTarget = out[day].length > 0 && acc + m / 2 > target
    // اترك درسًا واحدًا على الأقل لكل يوم متبقٍّ.
    const mustLeaveOne = out[day].length > 0 && remainingLessons <= remainingDays - 1
    // لا تنتقل إن كانت الأيام الباقية لا تتّسع لما تبقّى (السقف مصون دائمًا:
    // ما دام العدد الكلّي ≤ learnDays×maxPerDay، يصبح هذا صحيحًا فور امتلاء اليوم).
    const fitsAfterAdvance = remainingLessons <= (remainingDays - 1) * maxPerDay

    if (day < learnDays - 1 && fitsAfterAdvance && (dayFull || overTarget || mustLeaveOne)) {
      remainMin -= acc
      day += 1
      acc = 0
      target = targetFor(day, remainMin)
    }

    out[day].push(id)
    acc += m
  }

  return out
}

/** اختيار الأيام الاحتياطية: موزّعة بانتظام داخل نافذة التعلّم. */
export function pickBufferDates(learnWindow: string[], count: number): string[] {
  if (count <= 0 || learnWindow.length <= count + 1) return []
  const out: string[] = []
  const step = learnWindow.length / (count + 1)
  for (let i = 1; i <= count; i++) {
    // لا نضع احتياطيًا في أول يوم أو آخر يوم من نافذة التعلّم.
    const idx = Math.min(learnWindow.length - 2, Math.max(1, Math.round(i * step) - 1))
    const key = learnWindow[idx]
    if (!out.includes(key)) out.push(key)
  }
  return out
}

export interface ProgramPlan {
  config: ProgramConfig
  /** كل أيام النافذة بالترتيب. */
  days: DayPlan[]
  byDate: Record<string, DayPlan>
  /** تاريخ إتمام كل قسم (مفتاح يوم) — يُشتق من التوزيع. */
  sectionCompletion: Record<string, string>
  /** إجماليات مُحتسبة، لا مكتوبة يدويًا. */
  totals: {
    windowDays: number
    learnDays: number
    bufferDays: number
    consolidationDays: number
    taperDays: number
    totalLessons: number
    lessonMinutes: number
    recallMinutes: number
    spacedReviewMinutes: number
    sweepMinutes: number
    mockMinutes: number
    weakRepairMinutes: number
    closeMinutes: number
    breakMinutes: number
    /** كل ما يُحتسب دراسة فعلية. */
    studyMinutes: number
    /** الدراسة + الاستراحات. */
    wallMinutes: number
  }
}

export function buildProgram(config: ProgramConfig = DEFAULT_CONFIG): ProgramPlan {
  const window = dateRange(config.startDate, config.deadline)
  const windowDays = window.length

  // ── تقسيم النافذة ──
  // آخر يومين: تخفيف + يوم الموعد. قبلهما: مرحلة التثبيت. الباقي: تعلّم.
  const taperCount = Math.min(2, windowDays)
  const consolCount = Math.min(
    Math.max(0, config.consolidationDays),
    Math.max(0, windowDays - taperCount - 1),
  )
  const learnWindowLen = windowDays - taperCount - consolCount

  const learnWindow = window.slice(0, learnWindowLen)
  const consolWindow = window.slice(learnWindowLen, learnWindowLen + consolCount)
  const taperWindow = window.slice(learnWindowLen + consolCount)

  const bufferDates = pickBufferDates(learnWindow, config.bufferDays)
  const learnDates = learnWindow.filter((k) => !bufferDates.includes(k))

  // ── توزيع الدروس (موازنة بالدقائق) ──
  const buckets = distributeByMinutes(
    LESSONS.map((l) => l.id),
    learnDates.length,
    config.durationModel,
    MAX_LESSONS_PER_DAY,
  )
  const lessonsByDate: Record<string, string[]> = {}
  learnDates.forEach((key, i) => { lessonsByDate[key] = buckets[i] ?? [] })

  // ── تاريخ إتمام كل قسم ──
  const sectionCompletion: Record<string, string> = {}
  {
    let seen = 0
    for (const key of learnDates) {
      seen += lessonsByDate[key].length
      for (const s of SECTIONS) {
        if (sectionCompletion[s.id] === undefined && seen >= s.lastGlobal) {
          sectionCompletion[s.id] = key
        }
      }
    }
    // احتياط: أي قسم لم يُغطَّ (نافذة أقصر من المنهج) يُنسب لآخر يوم تعلّم.
    const lastLearn = learnDates[learnDates.length - 1] ?? config.startDate
    for (const s of SECTIONS) if (!sectionCompletion[s.id]) sectionCompletion[s.id] = lastLearn
  }

  // ── المراجعة المتباعدة ──
  // آخر يوم يقبل مراجعة متباعدة = آخر يوم من مرحلة التثبيت.
  const reviewCap = consolWindow[consolWindow.length - 1]
    ?? learnWindow[learnWindow.length - 1]
    ?? config.deadline

  const reviewsByDate: Record<string, ReviewItem[]> = {}
  for (const s of SECTIONS) {
    const source = sectionCompletion[s.id]
    const placed = new Set<string>()
    REVIEW_OFFSETS.forEach((off, i) => {
      const stage = (i + 1) as 1 | 2 | 3
      const wanted = addDays(source, off)
      const clamped = wanted > reviewCap
      const date = clamped ? reviewCap : wanted
      // مرحلتان من نفس القسم في نفس اليوم بلا فائدة — نُبقي الأعمق.
      if (placed.has(date)) {
        const list = reviewsByDate[date] ?? []
        const existing = list.findIndex((r) => r.sectionId === s.id)
        if (existing >= 0 && list[existing].stage < stage) {
          list[existing] = { sectionId: s.id, stage, minutes: reviewMinutes(s.size, stage), sourceDate: source, clamped }
        }
        return
      }
      placed.add(date)
      ;(reviewsByDate[date] ??= []).push({
        sectionId: s.id,
        stage,
        minutes: reviewMinutes(s.size, stage),
        sourceDate: source,
        clamped,
      })
    })
  }

  // ترتيب المراجعات داخل اليوم: تشبيك عبر الكتب بدل تجميع كتاب واحد.
  for (const date of Object.keys(reviewsByDate)) {
    reviewsByDate[date] = interleaveByBook(reviewsByDate[date], (r) => r.sectionId)
  }

  // ── الكنس الشامل في مرحلة التثبيت ──
  const sweepsByDate: Record<string, SweepItem[]> = {}
  if (consolWindow.length > 0) {
    // وزّع الأقسام الـ16 على أيام التثبيت، مشبَّكة عبر الكتب.
    const ordered = interleaveByBook(SECTIONS.slice(), (s) => s.id)
    ordered.forEach((s, i) => {
      const date = consolWindow[i % consolWindow.length]
      ;(sweepsByDate[date] ??= []).push({ sectionId: s.id, minutes: sweepMinutes(s.size) })
    })
  }

  // ── تجميع الأيام ──
  const days: DayPlan[] = []
  let learnIdx = 0
  window.forEach((date, i) => {
    const isBuffer = bufferDates.includes(date)
    const isConsol = consolWindow.includes(date)
    const isTaperWin = taperWindow.includes(date)
    const isDeadline = date === config.deadline

    let kind: DayPlan['kind']
    let label: string
    let mockMinutes = 0
    let weakRepairMinutes = 0

    if (isDeadline) {
      kind = 'deadline'
      label = 'يوم الموعد — إحماء خفيف فقط'
      mockMinutes = 0
      // إحماء قصير فقط: تنشيط الذاكرة دون إجهادها. لا محتوى جديد ولا محاكاة.
      weakRepairMinutes = 20
    } else if (isTaperWin) {
      kind = 'taper'
      label = 'تخفيف — مراجعة النقاط الضعيفة ثم توقّف مبكّر'
      weakRepairMinutes = 45
    } else if (isConsol) {
      kind = 'consolidate'
      label = 'تثبيت — كنس شامل + اختبار ذاتي'
      mockMinutes = 60
      weakRepairMinutes = 30
    } else if (isBuffer) {
      kind = 'buffer'
      label = 'يوم احتياطي — تعويض ومراجعة، بلا دروس جديدة'
      weakRepairMinutes = 30
    } else {
      kind = 'learn'
      learnIdx += 1
      label = 'دروس جديدة + استرجاع + مراجعة متباعدة'
    }

    days.push({
      date,
      index: i + 1,
      kind,
      learnIndex: kind === 'learn' ? learnIdx : null,
      lessons: lessonsByDate[date] ?? [],
      reviews: reviewsByDate[date] ?? [],
      sweeps: sweepsByDate[date] ?? [],
      mockMinutes,
      weakRepairMinutes,
      label,
    })
  })

  const byDate: Record<string, DayPlan> = {}
  for (const d of days) byDate[d.date] = d

  // ── الإجماليات (محسوبة من الأيام نفسها) ──
  let lessonMinutes = 0, recallMin = 0, spacedReviewMinutes = 0
  let sweepMin = 0, mockMin = 0, weakMin = 0, closeMin = 0, breakMin = 0, freeMin = 0

  for (const d of days) {
    lessonMinutes += sumLessonMinutes(d.lessons, config.durationModel)
    recallMin += recallMinutesForDay(d.lessons.length, config)
    for (const r of d.reviews) spacedReviewMinutes += r.minutes
    for (const s of d.sweeps) sweepMin += s.minutes
    mockMin += d.mockMinutes
    weakMin += d.weakRepairMinutes
    closeMin += closeMinutesForDay(d, config)
    breakMin += breakMinutesForDay(d, config)
    // يوم بلا مهامّ يُمنَح جلسة حرّة في الجدول الزمني — تُحتسب هنا أيضًا
    // حتى تبقى الإجماليات مطابقة لما يعرضه المؤقّت فعلًا.
    if (!dayHasWork(d)) freeMin += FREE_SESSION_MINUTES
  }

  const studyMinutes = lessonMinutes + recallMin + spacedReviewMinutes + sweepMin + mockMin + weakMin + closeMin + freeMin

  return {
    config,
    days,
    byDate,
    sectionCompletion,
    totals: {
      windowDays,
      learnDays: learnDates.length,
      bufferDays: bufferDates.length,
      consolidationDays: consolWindow.length,
      taperDays: taperWindow.length,
      totalLessons: TOTAL_LESSONS,
      lessonMinutes,
      recallMinutes: recallMin,
      spacedReviewMinutes,
      sweepMinutes: sweepMin,
      mockMinutes: mockMin,
      weakRepairMinutes: weakMin,
      closeMinutes: closeMin,
      breakMinutes: breakMin,
      studyMinutes,
      wallMinutes: studyMinutes + breakMin,
    },
  }
}

/** هل لليوم أيّ عمل مجدول؟ */
export function dayHasWork(d: DayPlan): boolean {
  return d.lessons.length > 0 || d.reviews.length > 0 || d.sweeps.length > 0
    || d.mockMinutes > 0 || d.weakRepairMinutes > 0
}

/**
 * دقائق إغلاق اليوم. مصدر واحد للقاعدة حتى لا تنحرف الإجماليات عن الجدول الزمني:
 * يوم الموعد لا طقس إغلاق له، والأيام الفارغة كذلك.
 */
export function closeMinutesForDay(d: DayPlan, config: ProgramConfig): number {
  if (d.kind === 'deadline') return 0
  return dayHasWork(d) ? config.closeMinutes : 0
}

/** دقائق الاسترجاع النشط ليوم فيه n درسًا (زوج كامل = recallMinutes، فردي = نصفها). */
export function recallMinutesForDay(n: number, config: ProgramConfig): number {
  const pairs = Math.floor(n / 2)
  const odd = n % 2
  return pairs * config.recallMinutes + odd * Math.round(config.recallMinutes / 2)
}

/** عدد كتل الدروس (زوج دروس = كتلة، والدرس الفردي المتبقّي كتلة). */
export function lessonBlockCount(n: number): number {
  return Math.floor(n / 2) + (n % 2)
}

/** دقائق الاستراحة ليوم كامل. */
export function breakMinutesForDay(d: DayPlan, config: ProgramConfig): number {
  const blocks = lessonBlockCount(d.lessons.length)
  let mins = 0
  for (let b = 1; b < blocks; b++) {
    mins += b % config.blocksBeforeLongBreak === 0 ? config.longBreak : config.shortBreak
  }
  // استراحة قبل قسم المراجعة/التثبيت إذا سبقه عمل.
  const hasTail = d.reviews.length > 0 || d.sweeps.length > 0 || d.mockMinutes > 0 || d.weakRepairMinutes > 0
  if (hasTail && blocks > 0) mins += config.shortBreak
  // استراحة بين المحاكاة وإصلاح النقاط الضعيفة في أيام التثبيت.
  if (d.mockMinutes > 0 && d.weakRepairMinutes > 0) mins += config.shortBreak
  return mins
}

/** ترتيب مشبَّك: يوزّع العناصر بحيث لا تتوالى عناصر الكتاب نفسه. */
function interleaveByBook<T>(items: T[], getSectionId: (x: T) => string): T[] {
  const buckets = new Map<string, T[]>()
  for (const it of items) {
    const bookId = getSectionId(it).split('-')[0]
    const arr = buckets.get(bookId) ?? []
    arr.push(it)
    buckets.set(bookId, arr)
  }
  const lists = [...buckets.values()]
  const out: T[] = []
  let i = 0
  while (out.length < items.length) {
    let pushedThisRound = false
    for (const list of lists) {
      if (i < list.length) { out.push(list[i]); pushedThisRound = true }
    }
    if (!pushedThisRound) break
    i += 1
  }
  return out
}

/** دقائق العمل على الساعة ليوم واحد (بدون بناء الجدول الزمني الكامل). */
export function dayWallMinutes(d: DayPlan, config: ProgramConfig): number {
  const lessons = sumLessonMinutes(d.lessons, config.durationModel)
  const recall = recallMinutesForDay(d.lessons.length, config)
  const reviews = d.reviews.reduce((a, r) => a + r.minutes, 0)
  const sweeps = d.sweeps.reduce((a, s) => a + s.minutes, 0)
  const total = lessons + recall + reviews + sweeps + d.mockMinutes + d.weakRepairMinutes
    + closeMinutesForDay(d, config) + breakMinutesForDay(d, config)
  // يوم بلا مهامّ يحصل على جلسة حرّة — يجب أن تطابق الصيغةُ الجدولَ المبني.
  return total === 0 ? FREE_SESSION_MINUTES : total
}

/** تقييم واقعية الخطّة مقابل الطاقة اليومية المتاحة. */
export function assessFeasibility(plan: ProgramPlan): FeasibilityReport {
  const { config } = plan
  let peak = 0, peakDate = plan.days[0]?.date ?? config.startDate
  let learnSum = 0, learnCount = 0

  for (const d of plan.days) {
    const w = dayWallMinutes(d, config)
    if (w > peak) { peak = w; peakDate = d.date }
    if (d.kind === 'learn') { learnSum += w; learnCount += 1 }
  }

  const avgLearn = learnCount ? Math.round(learnSum / learnCount) : 0
  const deficit = peak - config.dailyCapacityMinutes
  const notes: string[] = []

  if (deficit > 0) {
    notes.push(`أثقل يوم يحتاج ${peak} دقيقة على الساعة، وطاقتك المُعلَنة ${config.dailyCapacityMinutes} دقيقة — عجز ${deficit} دقيقة.`)
  }
  if (avgLearn > config.dailyCapacityMinutes) {
    notes.push(`متوسّط يوم التعلّم (${avgLearn} د) يتجاوز طاقتك اليومية — الخطّة ستتراكم عليك من الأسبوع الأول.`)
  }
  if (plan.totals.bufferDays === 0) {
    notes.push('لا توجد أيام احتياطية — أيّ يوم مرض أو انشغال سيكسر الجدول مباشرة.')
  }
  if (plan.totals.consolidationDays < 3) {
    notes.push('أيام التثبيت أقلّ من 3 — وقت الاسترجاع النهائي غير كافٍ لتحويل «مكتمل» إلى «متقن».')
  }
  if (notes.length === 0) {
    notes.push('الخطّة ضمن الطاقة المُعلَنة، مع أيام احتياطية ومرحلة تثبيت كاملة.')
  }

  return {
    feasible: deficit <= 0 && avgLearn <= config.dailyCapacityMinutes,
    peakWallMinutes: peak,
    peakDate,
    avgLearnWallMinutes: avgLearn,
    deficitMinutes: Math.max(0, deficit),
    notes,
  }
}

/** جدول مراجعات قسم بعينه (لعرض «متى أراجع هذا الدرس»). */
export function sectionReviewSchedule(plan: ProgramPlan, section: CurriculumSection) {
  const out: { date: string; stage: number; minutes: number; kind: 'spaced' | 'sweep' }[] = []
  for (const d of plan.days) {
    for (const r of d.reviews) if (r.sectionId === section.id) out.push({ date: d.date, stage: r.stage, minutes: r.minutes, kind: 'spaced' })
    for (const s of d.sweeps) if (s.sectionId === section.id) out.push({ date: d.date, stage: 4, minutes: s.minutes, kind: 'sweep' })
  }
  return out.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** كم يومًا تبقّى حتى الموعد النهائي من يوم معيّن. */
export function daysToDeadline(plan: ProgramPlan, fromDate: string): number {
  return Math.max(0, diffDays(fromDate, plan.config.deadline))
}
