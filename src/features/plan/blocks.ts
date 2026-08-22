import { lessonById, bookShortTitle, sectionTitle, LESSON_MINUTES } from '@/data/curriculum'
import { AR_LESSON, countAr } from '@/lib/arabicCount'
import type { ScheduledDay } from './schedule'

/**
 * تقسيم اليوم إلى كتل زمنية: دراسة، استرجاع، مراجعة، اختبار ذاتي، استراحات.
 *
 * Why 40-minute study blocks and not classic 25-minute pomodoros: the atomic
 * unit of this curriculum is a 20-minute lesson. A 25-minute timer cuts a
 * lesson in half on every other cycle, and an interrupted-mid-unit break is the
 * most expensive place to stop — resuming costs attention that a boundary break
 * does not. 40 minutes is exactly two lessons, so every break lands clean.
 *
 * Breaks are short (6 min) between blocks and long (15 min) once roughly 80
 * minutes of focus have accumulated, which is about where sustained-attention
 * quality starts to drop for most people.
 */

export type BlockKind =
  | 'recall'      // استرجاع دروس الأمس
  | 'new'         // دروس جديدة
  | 'review'      // مراجعة متباعدة
  | 'consolidate' // تثبيت أسبوعي
  | 'repair'      // إصلاح نقاط الضعف
  | 'mock'        // امتحان تجريبي
  | 'test'        // اختبار ذاتي مختلط
  | 'close'       // إغلاق اليوم
  | 'break'       // استراحة

export interface DayBlock {
  id: string
  kind: BlockKind
  titleAr: string
  detailAr: string
  minutes: number
  /** الدروس التي تخصّ هذه الكتلة، إن وُجدت. */
  lessonIds: string[]
}

export interface DayBlockPlan {
  dayKey: string
  blocks: DayBlock[]
  /** دقائق التركيز الفعلي — بلا استراحات. */
  focusMinutes: number
  breakMinutes: number
  totalMinutes: number
}

const SHORT_BREAK = 6
const LONG_BREAK = 15
const LONG_BREAK_AFTER = 80
/** درسان في الكتلة الواحدة: 40 دقيقة، وحدّ الكتلة يقع على حدّ درس. */
const LESSONS_PER_BLOCK = 2

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v))

/** يحلّ مدّة درس بعينه — يسمح بتجاوز المستخدم لمدّة دروس كتاب كامل. */
export type MinutesResolver = (lessonId: string) => number

const defaultMinutes: MinutesResolver = (id) => lessonById(id)?.minutes ?? LESSON_MINUTES

/**
 * تسمية مجموعة دروس بأرقامها المطبوعة وعناوينها الهولندية.
 *
 * The printed labels ("3.4") and the Dutch titles are what the learner sees on
 * the page in front of them; a generic "lessons 3-4" would force them to look up
 * which lesson the app actually means.
 */
export function describeLessons(ids: string[]): string {
  if (ids.length === 0) return 'لا دروس'
  const items = ids.map((id) => lessonById(id)).filter((l) => !!l)
  if (items.length === 0) return countAr(ids.length, AR_LESSON)
  const first = items[0]!
  const sameSection = items.every((l) => l!.sectionId === first.sectionId)
  const named = items.map((l) => `${l!.label} ${l!.title}`).join(' · ')
  if (!sameSection) return `${bookShortTitle(first.bookId)} — ${named}`
  return `${bookShortTitle(first.bookId)} · ${sectionTitle(first.sectionId)} — ${named}`
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/** كتل العمل قبل حقن الاستراحات. */
function workBlocks(day: ScheduledDay, minutesOf: MinutesResolver): DayBlock[] {
  const out: DayBlock[] = []
  const push = (b: DayBlock) => { if (b.minutes > 0) out.push(b) }

  /* يوما الامتحان واليوم الأخير محدّدان بالكامل: لا تُحقن فيهما كتل الاسترجاع
     والمراجعة العامّة. الامتحان نفسه استرجاعٌ كامل، واليوم الأخير خفيف عن قصد. */
  if (day.kind === 'mock') {
    push({
      id: `${day.dayKey}-mock`,
      kind: 'mock',
      titleAr: 'امتحان تجريبي بتوقيت حقيقي',
      detailAr: 'من صفحة الامتحان الكامل. لا توقّف المؤقّت ولا تفتح الكتاب.',
      minutes: 120,
      lessonIds: [],
    })
    push({
      id: `${day.dayKey}-errors`,
      kind: 'repair',
      titleAr: 'تحليل الأخطاء',
      detailAr: 'مرّ على كل خطأ واكتب سببه، ثم علّم الدرس المرتبط به ضعيفًا.',
      minutes: 45,
      lessonIds: [],
    })
    push({
      id: `${day.dayKey}-fix`,
      kind: 'repair',
      titleAr: 'إعادة دراسة ما سقط',
      detailAr: 'الدروس المعلَّمة ضعيفة فقط، بالترتيب من الأضعف.',
      minutes: 30,
      lessonIds: [],
    })
    push({
      id: `${day.dayKey}-close`,
      kind: 'close',
      titleAr: 'إغلاق اليوم',
      detailAr: 'حدّث حالة كل درس ظهر ضعفه في الامتحان.',
      minutes: 10,
      lessonIds: [],
    })
    return out
  }

  if (day.kind === 'final') {
    push({
      id: `${day.dayKey}-light`,
      kind: 'review',
      titleAr: 'مراجعة خفيفة أخيرة',
      detailAr: 'اقرأ ملخّصاتك ونقاط ضعفك فقط. لا دروس جديدة ولا امتحان كامل.',
      minutes: 45,
      lessonIds: day.consolidateLessonIds,
    })
    push({
      id: `${day.dayKey}-ready`,
      kind: 'close',
      titleAr: 'تجهيز يوم الامتحان',
      detailAr: 'الأوراق، الطريق، وقت النوم. أنهِ اليوم مبكّرًا.',
      minutes: 15,
      lessonIds: [],
    })
    return out
  }

  if (day.recallLessonIds.length > 0) {
    push({
      id: `${day.dayKey}-recall`,
      kind: 'recall',
      titleAr: 'استرجاع دروس الأمس',
      detailAr: `أغلق الكتاب واستخرج ما تتذكّره من ${countAr(day.recallLessonIds.length, AR_LESSON)}، ثم تحقّق.`,
      minutes: clamp(Math.ceil(day.recallLessonIds.length * 2.5), 10, 25),
      lessonIds: day.recallLessonIds,
    })
  }

  chunk(day.lessonIds, LESSONS_PER_BLOCK).forEach((ids, i) => {
    push({
      id: `${day.dayKey}-new-${i + 1}`,
      kind: 'new',
      titleAr: ids.length > 1 ? 'درسان جديدان' : 'درس جديد',
      detailAr: describeLessons(ids),
      minutes: ids.reduce((s, id) => s + minutesOf(id), 0),
      lessonIds: ids,
    })
  })

  if (day.reviewLessonIds.length > 0) {
    push({
      id: `${day.dayKey}-review`,
      kind: 'review',
      titleAr: 'مراجعة متباعدة',
      detailAr: `دروس قبل 3 أيام: ${describeLessons(day.reviewLessonIds)}.`,
      minutes: clamp(Math.ceil(day.reviewLessonIds.length * 2), 10, 25),
      lessonIds: day.reviewLessonIds,
    })
  }

  if (day.kind === 'consolidate') {
    push({
      id: `${day.dayKey}-consolidate`,
      kind: 'consolidate',
      titleAr: 'تثبيت الأسبوع',
      detailAr: `استرجاع سريع لـ ${countAr(day.consolidateLessonIds.length, AR_LESSON)} من الأيام الماضية.`,
      minutes: clamp(Math.ceil(day.consolidateLessonIds.length * 1.5), 20, 75),
      lessonIds: day.consolidateLessonIds,
    })
    push({
      id: `${day.dayKey}-repair`,
      kind: 'repair',
      titleAr: 'إصلاح نقاط الضعف',
      detailAr: 'أعد دراسة الدروس المعلَّمة ضعيفة فقط. لا شيء غيرها.',
      minutes: 40,
      lessonIds: [],
    })
    push({
      id: `${day.dayKey}-skillmock`,
      kind: 'mock',
      titleAr: 'اختبار مهارة واحدة',
      detailAr: 'اختر أضعف مهارة من صفحة الامتحان ونفّذها بتوقيت حقيقي.',
      minutes: 40,
      lessonIds: [],
    })
  }

  push({
    id: `${day.dayKey}-test`,
    kind: 'test',
    titleAr: 'اختبار ذاتي مختلط',
    detailAr: 'أسئلة من اليوم ومن الأيام السابقة معًا، بترتيب عشوائي.',
    minutes: 15,
    lessonIds: [],
  })

  push({
    id: `${day.dayKey}-close`,
    kind: 'close',
    titleAr: 'إغلاق اليوم',
    detailAr: 'علّم حالة كل درس: متقن، يحتاج مراجعة، أو ضعيف.',
    minutes: 5,
    lessonIds: day.lessonIds,
  })

  return out
}

/** يبني كتل اليوم كاملةً مع الاستراحات في مواضعها. */
export function buildDayBlocks(day: ScheduledDay, minutesOf?: MinutesResolver): DayBlockPlan {
  const work = workBlocks(day, minutesOf ?? defaultMinutes)
  const blocks: DayBlock[] = []
  let sinceLongBreak = 0

  work.forEach((b, i) => {
    blocks.push(b)
    sinceLongBreak += b.minutes
    const isLast = i === work.length - 1
    if (isLast) return
    const long = sinceLongBreak >= LONG_BREAK_AFTER
    blocks.push({
      id: `${b.id}-break`,
      kind: 'break',
      titleAr: long ? 'استراحة طويلة' : 'استراحة قصيرة',
      detailAr: long ? 'قم وتحرّك وابتعد عن الشاشة.' : 'ماء، نافذة، لا هاتف.',
      minutes: long ? LONG_BREAK : SHORT_BREAK,
      lessonIds: [],
    })
    if (long) sinceLongBreak = 0
  })

  const focusMinutes = blocks.filter((b) => b.kind !== 'break').reduce((s, b) => s + b.minutes, 0)
  const breakMinutes = blocks.filter((b) => b.kind === 'break').reduce((s, b) => s + b.minutes, 0)

  return { dayKey: day.dayKey, blocks, focusMinutes, breakMinutes, totalMinutes: focusMinutes + breakMinutes }
}

export const BLOCK_KIND_AR: Record<BlockKind, string> = {
  recall: 'استرجاع',
  new: 'درس جديد',
  review: 'مراجعة',
  consolidate: 'تثبيت',
  repair: 'إصلاح ضعف',
  mock: 'امتحان',
  test: 'اختبار ذاتي',
  close: 'إغلاق',
  break: 'استراحة',
}
