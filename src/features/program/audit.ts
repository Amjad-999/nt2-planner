/**
 * تدقيق منطقي مستقل للخطّة.
 *
 * هذه الوحدة لا تثق ببقيّة المحرّك: تُعيد حساب كل شيء من الصفر من مخرجات
 * `buildProgram` وتقارنه بالمنهج الأصلي. تعمل كاختبار وحدة *وكذلك* داخل
 * التطبيق (لوحة «تدقيق الخطّة») حتى يرى المستخدم أن الأرقام مُتحقّق منها.
 */

import { LESSONS, SECTIONS, TOTAL_LESSONS, totalLessonMinutes, sumLessonMinutes } from '@/data/curriculum'
import type { ProgramPlan } from './schedule'
import { dayHasWork, recallMinutesForDay, breakMinutesForDay, closeMinutesForDay, dayWallMinutes } from './schedule'
import { buildTimeline } from './timeline'
import { dateRange, diffDays } from './dates'
import { MAX_LESSONS_PER_DAY } from './schedule'

export interface AuditCheck {
  id: string
  label: string
  pass: boolean
  detail: string
}

export interface AuditResult {
  pass: boolean
  passed: number
  total: number
  checks: AuditCheck[]
}

export function auditProgram(plan: ProgramPlan): AuditResult {
  const checks: AuditCheck[] = []
  const add = (id: string, label: string, pass: boolean, detail: string) =>
    checks.push({ id, label, pass, detail })

  const scheduled = plan.days.flatMap((d) => d.lessons)
  const unique = new Set(scheduled)

  // 1) كل درس مجدول مرّة واحدة بالضبط
  add(
    'coverage',
    'كل الدروس موزّعة',
    scheduled.length === TOTAL_LESSONS && unique.size === TOTAL_LESSONS,
    `${unique.size}/${TOTAL_LESSONS} درسًا مجدولًا (${scheduled.length} إدخالًا).`,
  )

  // 2) لا تكرار
  const dupes = scheduled.length - unique.size
  add('noDupes', 'لا يوجد درس مكرّر', dupes === 0, dupes === 0 ? 'صفر تكرار.' : `${dupes} درسًا مكرّرًا.`)

  // 3) لا درس مفقود
  const missing = LESSONS.filter((l) => !unique.has(l.id))
  add(
    'noMissing',
    'لا يوجد درس مفقود',
    missing.length === 0,
    missing.length === 0 ? 'كل درس في المنهج له يوم.' : `${missing.length} درسًا بلا يوم: ${missing.slice(0, 5).map((l) => l.id).join('، ')}…`,
  )

  // 4) كل الكتب والأقسام ممثَّلة
  const bookIds = new Set(LESSONS.filter((l) => unique.has(l.id)).map((l) => l.bookId))
  const sectionIds = new Set(LESSONS.filter((l) => unique.has(l.id)).map((l) => l.sectionId))
  add(
    'allUnits',
    'كل الكتب والأقسام موجودة',
    bookIds.size === 3 && sectionIds.size === SECTIONS.length,
    `${bookIds.size}/3 كتب، ${sectionIds.size}/${SECTIONS.length} أقسام.`,
  )

  // 5) الترتيب المنهجي محفوظ (تراكمي)
  let ordered = true
  let lastGlobal = 0
  const byId = new Map(LESSONS.map((l) => [l.id, l]))
  for (const id of scheduled) {
    const g = byId.get(id)?.global ?? -1
    if (g !== lastGlobal + 1) { ordered = false; break }
    lastGlobal = g
  }
  add('order', 'الترتيب التراكمي محفوظ', ordered, ordered ? `الدروس تسير 1 → ${TOTAL_LESSONS} بلا قفز.` : 'تسلسل الدروس مكسور.')

  // 6) مجموع الدقائق صحيح — يُعاد جمعه درسًا درسًا من المنهج
  const model = plan.config.durationModel
  const recomputedLessonMin = sumLessonMinutes(scheduled, model)
  const expectedLessonMin = totalLessonMinutes(model)
  add(
    'lessonMinutes',
    'مجموع دقائق الدروس صحيح',
    recomputedLessonMin === expectedLessonMin && plan.totals.lessonMinutes === expectedLessonMin,
    `${recomputedLessonMin} دقيقة = ${Math.floor(recomputedLessonMin / 60)}س ${recomputedLessonMin % 60}د (المتوقّع ${expectedLessonMin}، نموذج «${model === 'pages' ? 'موزون بالصفحات' : 'ثابت 20د'}»).`,
  )

  // 7) الإجماليات المُعلَنة تطابق إعادة الحساب من الأيام
  let recRecall = 0, recReview = 0, recSweep = 0, recMock = 0, recWeak = 0, recClose = 0, recBreak = 0
  for (const d of plan.days) {
    recRecall += recallMinutesForDay(d.lessons.length, plan.config)
    recReview += d.reviews.reduce((a, r) => a + r.minutes, 0)
    recSweep += d.sweeps.reduce((a, s) => a + s.minutes, 0)
    recMock += d.mockMinutes
    recWeak += d.weakRepairMinutes
    recClose += closeMinutesForDay(d, plan.config)
    recBreak += breakMinutesForDay(d, plan.config)
  }
  const totalsMatch =
    recRecall === plan.totals.recallMinutes &&
    recReview === plan.totals.spacedReviewMinutes &&
    recSweep === plan.totals.sweepMinutes &&
    recMock === plan.totals.mockMinutes &&
    recWeak === plan.totals.weakRepairMinutes &&
    recClose === plan.totals.closeMinutes &&
    recBreak === plan.totals.breakMinutes
  add(
    'totals',
    'الإجماليات تطابق إعادة الحساب',
    totalsMatch,
    `استرجاع ${recRecall}د · مراجعة ${recReview}د · كنس ${recSweep}د · محاكاة ${recMock}د · نقاط ضعف ${recWeak}د · إغلاق ${recClose}د · استراحات ${recBreak}د.`,
  )

  // 8) عدد الأيام يطابق المدّة الفعلية
  const expectedWindow = dateRange(plan.config.startDate, plan.config.deadline).length
  const partsSum = plan.totals.learnDays + plan.totals.bufferDays
    + plan.totals.consolidationDays + plan.totals.taperDays
  add(
    'windowDays',
    'عدد الأيام يطابق المدّة الفعلية',
    plan.days.length === expectedWindow && partsSum === expectedWindow,
    `${plan.days.length} يومًا في النافذة = ${plan.totals.learnDays} تعلّم + ${plan.totals.bufferDays} احتياطي + ${plan.totals.consolidationDays} تثبيت + ${plan.totals.taperDays} تخفيف (المتوقّع ${expectedWindow}).`,
  )

  // 9) لا يوم خارج النافذة، والتواريخ متتابعة بلا فجوات
  let contiguous = true
  for (let i = 1; i < plan.days.length; i++) {
    if (diffDays(plan.days[i - 1].date, plan.days[i].date) !== 1) { contiguous = false; break }
  }
  add(
    'contiguous',
    'التواريخ متتابعة بلا فجوات',
    contiguous && plan.days[0]?.date === plan.config.startDate
      && plan.days[plan.days.length - 1]?.date === plan.config.deadline,
    contiguous ? `من ${plan.config.startDate} إلى ${plan.config.deadline} بلا فجوات.` : 'توجد فجوة في التواريخ.',
  )

  // 10) لكل قسم مراجعة واحدة على الأقل
  const reviewed = new Set<string>()
  for (const d of plan.days) {
    for (const r of d.reviews) reviewed.add(r.sectionId)
    for (const s of d.sweeps) reviewed.add(s.sectionId)
  }
  add(
    'reviewExists',
    'كل قسم له مراجعة مجدولة',
    reviewed.size === SECTIONS.length,
    `${reviewed.size}/${SECTIONS.length} قسمًا لها مراجعة أو كنس.`,
  )

  // 11) المراجعة تأتي بعد التعلّم دائمًا (لا مراجعة لقسم قبل إتمامه)
  let reviewAfterLearn = true
  for (const d of plan.days) {
    for (const r of d.reviews) {
      if (d.date <= plan.sectionCompletion[r.sectionId]) { reviewAfterLearn = false; break }
    }
  }
  add(
    'reviewOrder',
    'لا مراجعة قبل إتمام القسم',
    reviewAfterLearn,
    reviewAfterLearn ? 'كل مراجعة تلي تاريخ إتمام قسمها.' : 'مراجعة مجدولة قبل إتمام قسمها.',
  )

  // 12) هامش أمان موجود
  add(
    'safetyMargin',
    'يوجد هامش أمان',
    plan.totals.bufferDays > 0 && plan.totals.consolidationDays >= 3,
    `${plan.totals.bufferDays} يوم احتياطي + ${plan.totals.consolidationDays} أيام تثبيت + ${plan.totals.taperDays} يوم تخفيف.`,
  )

  // 13) اليوم الأخير منطقي — لا دروس جديدة ولا محاكاة ثقيلة
  const last = plan.days[plan.days.length - 1]
  const lastOk = !!last && last.lessons.length === 0 && last.mockMinutes === 0 && last.reviews.length === 0
  add(
    'lastDaySane',
    'اليوم الأخير بلا مهام غير منطقية',
    lastOk,
    lastOk ? 'يوم الموعد: إحماء خفيف فقط، بلا دروس ولا محاكاة.' : 'يوم الموعد يحمل مهامّ ثقيلة.',
  )

  // 14) المؤقّتات متوافقة مع الجدول: مجموع مدد الكتل = وقت اليوم على الساعة
  let timersOk = true
  let timerDetail = ''
  for (const d of plan.days) {
    if (!dayHasWork(d)) continue
    const tl = buildTimeline(d, plan.config)
    const sum = tl.blocks.reduce((a, b) => a + b.durationMs, 0)
    const span = tl.dayEndMs - tl.dayStartMs
    // كل كتلة تبدأ عند نهاية سابقتها بالضبط
    let chained = true
    for (let i = 1; i < tl.blocks.length; i++) {
      if (tl.blocks[i].plannedStartMs !== tl.blocks[i - 1].plannedEndMs) { chained = false; break }
    }
    if (sum !== span || !chained || tl.studyMinutes + tl.breakMinutes !== tl.wallMinutes) {
      timersOk = false
      timerDetail = `خلل في يوم ${d.date}: مجموع الكتل ${Math.round(sum / 60000)}د مقابل مدى اليوم ${Math.round(span / 60000)}د.`
      break
    }
  }
  add(
    'timersAligned',
    'المؤقّتات متوافقة مع الجدول',
    timersOk,
    timersOk ? 'كل كتلة تبدأ عند نهاية سابقتها بالضبط، ومجموع المدد = مدى اليوم.' : timerDetail,
  )

  // 15) الجدول الزمني المُولَّد يطابق الإجماليات المُعلَنة
  // (هذا الفحص يمسك أيّ انحراف بين ما تقوله الأرقام وما يعرضه المؤقّت فعلًا)
  let tlStudy = 0, tlBreak = 0, tlWall = 0, wallFormulaMismatch = ''
  for (const d of plan.days) {
    const tl = buildTimeline(d, plan.config)
    tlStudy += tl.studyMinutes
    tlBreak += tl.breakMinutes
    tlWall += tl.wallMinutes
    // الصيغة المختصرة dayWallMinutes يجب أن تطابق الجدول المبني فعليًا
    if (!wallFormulaMismatch && dayWallMinutes(d, plan.config) !== tl.wallMinutes) {
      wallFormulaMismatch = `يوم ${d.date}: الصيغة ${dayWallMinutes(d, plan.config)}د مقابل الجدول ${tl.wallMinutes}د.`
    }
  }
  const timelineMatches = tlStudy === plan.totals.studyMinutes
    && tlBreak === plan.totals.breakMinutes
    && tlWall === plan.totals.wallMinutes
    && wallFormulaMismatch === ''
  add(
    'timelineTotals',
    'الجدول الزمني يطابق الإجماليات',
    timelineMatches,
    timelineMatches
      ? `دراسة ${tlStudy}د + استراحات ${tlBreak}د = ${tlWall}د على الساعة — مطابق تمامًا.`
      : `انحراف: جدول ${tlStudy}/${tlBreak}/${tlWall} مقابل إجماليات ${plan.totals.studyMinutes}/${plan.totals.breakMinutes}/${plan.totals.wallMinutes}. ${wallFormulaMismatch}`,
  )

  // 16) لا يوم يتجاوز السقف الآمن للدروس
  const overloaded = plan.days.filter((d) => d.lessons.length > MAX_LESSONS_PER_DAY)
  add(
    'dayLoadSane',
    'لا يوم يتجاوز السقف الآمن',
    overloaded.length === 0,
    overloaded.length === 0
      ? `أثقل يوم ${Math.max(...plan.days.map((d) => d.lessons.length), 0)} دروس (السقف ${MAX_LESSONS_PER_DAY}).`
      : `${overloaded.length} يومًا فوق ${MAX_LESSONS_PER_DAY} درسًا.`,
  )

  const passed = checks.filter((c) => c.pass).length
  return { pass: passed === checks.length, passed, total: checks.length, checks }
}
