/**
 * بناء الجدول الزمني لليوم — كتل بأوقات مطلقة.
 *
 * لماذا 20/20/10 وليس بومودورو 25/5؟
 * الدرس وحدة غير قابلة للتجزئة مدّتها 20 دقيقة. بومودورو الكلاسيكي (25 د)
 * يقطع الدرس في منتصفه أو يترك 5 دقائق ضائعة في كل دورة. لذلك الكتلة هنا
 * = درسان (20+20) يليهما استرجاع نشط 10 دقائق = 50 دقيقة تركيز، ثم استراحة.
 * هذا يحاذي المؤقّت مع حدود المحتوى، ويضع الاسترجاع مباشرة بعد التعرّض
 * بدل تأجيله لآخر اليوم حيث يتحوّل إلى إعادة قراءة سلبية.
 */

import { LESSONS, lessonMinutesById, lessonLabel, sectionLabel, getSection, compactLessonRange } from '@/data/curriculum'
import { dayStartMs } from './dates'
import type { DayPlan, DayTimeline, ProgramConfig, TimelineBlock } from './types'

const MIN = 60_000

/** مدّة الجلسة الحرّة ليوم بلا مهامّ مجدولة. */
export const FREE_SESSION_MINUTES = 30

export function buildTimeline(day: DayPlan, config: ProgramConfig): DayTimeline {
  const startMs = dayStartMs(day.date, config.dayStart)
  const blocks: TimelineBlock[] = []
  let offset = 0

  const push = (
    kind: TimelineBlock['kind'],
    title: string,
    subtitle: string,
    minutes: number,
    opts: { lessonIds?: string[]; sectionIds?: string[]; counts?: boolean } = {},
  ) => {
    if (minutes <= 0) return
    const durationMs = minutes * MIN
    blocks.push({
      id: `${day.date}#${blocks.length}#${kind}`,
      kind,
      title,
      subtitle,
      durationMs,
      offsetMs: offset,
      plannedStartMs: startMs + offset,
      plannedEndMs: startMs + offset + durationMs,
      lessonIds: opts.lessonIds ?? [],
      sectionIds: opts.sectionIds ?? [],
      counts: opts.counts ?? true,
    })
    offset += durationMs
  }

  // ── 1) كتل الدروس الجديدة ──
  const lessons = day.lessons
  let blockNo = 0
  for (let i = 0; i < lessons.length; i += 2) {
    const pair = lessons.slice(i, i + 2)
    blockNo += 1

    for (const id of pair) {
      push('lesson', lessonLabel(id), 'درس جديد — تعرّض أول', lessonMinutesById(id, config.durationModel), { lessonIds: [id] })
    }

    // استرجاع نشط: نصف المدّة للدرس الفردي الأخير.
    const recall = pair.length === 2 ? config.recallMinutes : Math.round(config.recallMinutes / 2)
    push(
      'recall',
      'استرجاع نشط',
      pair.length === 2
        ? 'أغلق المصدر واسترجع من ذاكرتك: النقاط الأساسية، ثم افحص ما نسيته'
        : 'استرجاع سريع للدرس الأخير',
      recall,
      { lessonIds: pair },
    )

    // استراحة بين كتل الدروس فقط (لا بعد آخر كتلة).
    const isLast = i + 2 >= lessons.length
    if (!isLast) {
      const isLong = blockNo % config.blocksBeforeLongBreak === 0
      push(
        isLong ? 'longBreak' : 'shortBreak',
        isLong ? 'استراحة طويلة' : 'استراحة قصيرة',
        isLong ? 'ابتعد عن الشاشة، تحرّك، اشرب ماء' : 'قف، حرّك عينيك، لا تفتح الهاتف',
        isLong ? config.longBreak : config.shortBreak,
        { counts: false },
      )
    }
  }

  const hasTail = day.reviews.length > 0 || day.sweeps.length > 0
    || day.mockMinutes > 0 || day.weakRepairMinutes > 0

  if (hasTail && lessons.length > 0) {
    push('shortBreak', 'استراحة قصيرة', 'قبل الانتقال إلى المراجعة', config.shortBreak, { counts: false })
  }

  // ── 2) المراجعة المتباعدة ──
  for (const r of day.reviews) {
    const sec = getSection(r.sectionId)
    const stageLabel = r.stage === 1 ? 'مراجعة +1 يوم' : r.stage === 2 ? 'مراجعة +3 أيام' : 'مراجعة +7 أيام'
    push(
      'review',
      stageLabel,
      `${sectionLabel(r.sectionId)} — استرجاع بلا فتح المصدر${r.clamped ? ' (مُقدَّمة لضيق الوقت)' : ''}`,
      r.minutes,
      { sectionIds: [r.sectionId], lessonIds: sectionLessonIds(sec?.id) },
    )
  }

  // ── 3) الكنس الشامل (مرحلة التثبيت) ──
  for (const s of day.sweeps) {
    push(
      'sweep',
      'كنس شامل',
      `${sectionLabel(s.sectionId)} — أسئلة مختلطة عبر الكتب`,
      s.minutes,
      { sectionIds: [s.sectionId], lessonIds: sectionLessonIds(s.sectionId) },
    )
  }

  // ── 4) المحاكاة / الاختبار الذاتي ──
  if (day.mockMinutes > 0) {
    push('mock', 'اختبار ذاتي بالمؤقّت', 'ظروف امتحان: بلا مصادر، بلا توقّف', day.mockMinutes)
    if (day.weakRepairMinutes > 0) {
      push('shortBreak', 'استراحة قصيرة', 'قبل إصلاح النقاط الضعيفة', config.shortBreak, { counts: false })
    }
  }

  // ── 5) إصلاح النقاط الضعيفة (أو إحماء يوم الموعد) ──
  if (day.weakRepairMinutes > 0) {
    const isDeadline = day.kind === 'deadline'
    push(
      'weakRepair',
      isDeadline ? 'إحماء خفيف' : 'إصلاح النقاط الضعيفة',
      isDeadline
        ? 'تصفّح سريع لأقوى ما تعرفه فقط — لا محتوى جديد، لا امتحان تجريبي، ولا مذاكرة متأخّرة'
        : 'الدروس المعلّمة «ضعيف» أولًا — الأضعف قبل الأسهل',
      day.weakRepairMinutes,
    )
  }

  // ── 6) إغلاق اليوم ──
  // يوم الموعد لا يحتاج طقس إغلاق — الإحماء هو كل شيء.
  if (blocks.length > 0 && day.kind !== 'deadline') {
    push(
      'close',
      'إغلاق اليوم',
      'قيّم كل درس: متقن / يحتاج مراجعة / ضعيف — ثم أوقف الدراسة',
      config.closeMinutes,
    )
  }

  // ── 7) ضمان أن كل يوم قابل للتشغيل ──
  // لا يوم "مقفل": إن خلا اليوم من أي مهمّة مجدولة، يحصل على جلسة حرّة
  // بدل أن يبقى زرّ البدء بلا معنى.
  if (blocks.length === 0) {
    push(
      'free',
      'جلسة حرّة',
      'لا مهامّ مجدولة اليوم — ذاكر ما تشاء، والمؤقّت يحسب لك الوقت',
      FREE_SESSION_MINUTES,
    )
  }

  const studyMinutes = blocks.filter((b) => b.counts).reduce((a, b) => a + b.durationMs / MIN, 0)
  const breakMinutes = blocks.filter((b) => !b.counts).reduce((a, b) => a + b.durationMs / MIN, 0)

  return {
    date: day.date,
    dayStartMs: startMs,
    dayEndMs: startMs + offset,
    blocks,
    studyMinutes: Math.round(studyMinutes),
    breakMinutes: Math.round(breakMinutes),
    wallMinutes: Math.round(offset / MIN),
  }
}

/** فهرس دروس كل قسم — يُبنى مرّة واحدة عند تحميل الوحدة. */
const LESSON_IDS_BY_SECTION: Record<string, string[]> = (() => {
  const map: Record<string, string[]> = {}
  for (const l of LESSONS) (map[l.sectionId] ??= []).push(l.id)
  return map
})()

function sectionLessonIds(sectionId: string | undefined): string[] {
  if (!sectionId) return []
  return LESSON_IDS_BY_SECTION[sectionId] ?? []
}

/** ملخّص نصّي مختصر لليوم — يُستخدم في الجدول الكامل. */
export function dayLessonSummary(day: DayPlan): string {
  return compactLessonRange(day.lessons)
}
