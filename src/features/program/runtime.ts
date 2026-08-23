/**
 * منطق المؤقّت — دوال نقيّة، مثبّتة على الزمن المطلق.
 *
 * القاعدة الأساسية: لا يوجد أيّ `setInterval` ينقص عدّادًا.
 * الحالة المحفوظة هي «متى بدأت الكتلة الحالية» (epoch ms)، والمتبقّي
 * يُحسب دائمًا = المدّة − (الآن − نقطة البداية − وقت التوقّف المؤقّت).
 * النتيجة: إعادة التحميل، إغلاق التبويب، تعليق الجهاز — كلّها لا تُفسد الحساب،
 * لأن مصدر الحقيقة هو ساعة النظام لا عدّاد في الذاكرة.
 */

import type { DayTimeline, RunState, TimelineBlock } from './types'

/** تجاوز أكبر من هذا الحدّ بعد غياب يعني أن الجلسة «قديمة» وتحتاج قرار المستخدم. */
export const STALE_THRESHOLD_MS = 10 * 60_000

/** إذا غاب التطبيق أطول من هذا، لا نتقدّم تلقائيًا مهما كان. */
export const ABSENCE_THRESHOLD_MS = 5 * 60_000

export interface RunView {
  status: 'idle' | 'running' | 'paused' | 'stale' | 'finished'
  block: TimelineBlock | null
  next: TimelineBlock | null
  index: number
  total: number
  /** المتبقّي في الكتلة الحالية (ms) — قد يكون سالبًا عند التجاوز. */
  remainingMs: number
  /** المنقضي في الكتلة الحالية (ms). */
  elapsedMs: number
  /** نسبة إنجاز الكتلة الحالية 0..1. */
  blockProgress: number
  /** المتبقّي حتى بدء الكتلة التالية (ms). */
  untilNextMs: number
  /** إجمالي المتبقّي من دراسة اليوم (ms) — الكتل المحتسَبة فقط. */
  remainingStudyMs: number
  /** إجمالي المتبقّي على الساعة حتى نهاية اليوم (ms). */
  remainingWallMs: number
  /** الوقت المطلق المتوقّع لانتهاء اليوم. */
  projectedEndMs: number
  /** فرق الجلسة عن الجدول المخطّط (موجب = متأخّر عن الساعة المخطّطة). */
  scheduleDriftMs: number
}

/** إنشاء جلسة جديدة تبدأ من كتلة معيّنة. */
export function startRun(timeline: DayTimeline, nowMs: number, cursor = 0): RunState {
  const idx = clampCursor(cursor, timeline)
  return {
    date: timeline.date,
    cursor: idx,
    anchorMs: nowMs,
    pausedAtMs: null,
    driftMs: 0,
    lastSeenMs: nowMs,
    startedAtMs: nowMs,
    completed: timeline.blocks.slice(0, idx).map((b) => b.id),
  }
}

export function clampCursor(cursor: number, timeline: DayTimeline): number {
  if (timeline.blocks.length === 0) return 0
  return Math.min(timeline.blocks.length - 1, Math.max(0, Math.round(cursor)))
}

/** المنقضي داخل الكتلة الحالية. */
export function elapsedInBlock(run: RunState, nowMs: number): number {
  const ref = run.pausedAtMs ?? nowMs
  return Math.max(0, ref - run.anchorMs - run.driftMs)
}

/** إيقاف مؤقّت — نسجّل اللحظة فقط، لا نُجمّد شيئًا. */
export function pauseRun(run: RunState, nowMs: number): RunState {
  if (run.pausedAtMs !== null) return run
  return { ...run, pausedAtMs: nowMs, lastSeenMs: nowMs }
}

/** استئناف — نضيف مدّة التوقّف إلى الانحراف حتى لا تُحتسب ضمن الكتلة. */
export function resumeRun(run: RunState, nowMs: number): RunState {
  if (run.pausedAtMs === null) return run
  const pausedFor = Math.max(0, nowMs - run.pausedAtMs)
  return { ...run, pausedAtMs: null, driftMs: run.driftMs + pausedFor, lastSeenMs: nowMs }
}

/**
 * الانتقال إلى الكتلة التالية.
 * `chain = true` يربط بداية الكتلة التالية بنهاية الحالية بالضبط
 * (شبكة زمنية مطلقة بلا انزلاق تراكمي)، و`false` يبدأها من الآن
 * (عند التخطّي اليدوي المبكّر).
 */
export function advanceRun(
  run: RunState,
  timeline: DayTimeline,
  nowMs: number,
  chain: boolean,
): RunState {
  const block = timeline.blocks[run.cursor]
  if (!block) return run
  const completed = run.completed.includes(block.id) ? run.completed : [...run.completed, block.id]
  const isLast = run.cursor >= timeline.blocks.length - 1

  if (isLast) {
    return { ...run, completed, pausedAtMs: null, driftMs: 0, lastSeenMs: nowMs }
  }

  return {
    ...run,
    cursor: run.cursor + 1,
    // الربط الدقيق: بداية التالية = بداية الحالية + مدّتها + وقت التوقّف.
    anchorMs: chain ? run.anchorMs + block.durationMs + run.driftMs : nowMs,
    driftMs: 0,
    pausedAtMs: null,
    lastSeenMs: nowMs,
    completed,
  }
}

/** الرجوع كتلة إلى الخلف. */
export function rewindRun(run: RunState, timeline: DayTimeline, nowMs: number): RunState {
  if (run.cursor <= 0) return { ...run, anchorMs: nowMs, driftMs: 0, pausedAtMs: null, lastSeenMs: nowMs }
  const prev = timeline.blocks[run.cursor - 1]
  return {
    ...run,
    cursor: run.cursor - 1,
    anchorMs: nowMs,
    driftMs: 0,
    pausedAtMs: null,
    lastSeenMs: nowMs,
    completed: run.completed.filter((id) => id !== prev?.id),
  }
}

/**
 * التقدّم التلقائي عبر الكتل المنتهية.
 *
 * الحماية المهمّة: إذا كان التطبيق مغلقًا لفترة طويلة (فجوة كبيرة بين
 * `lastSeenMs` والآن)، لا نبتلع الوقت الضائع ونقفز عبر نصف اليوم.
 * نتوقّف ونُعيد `stale: true` ليقرّر المستخدم.
 */
export function reconcileRun(
  run: RunState,
  timeline: DayTimeline,
  nowMs: number,
): { run: RunState; stale: boolean } {
  if (run.pausedAtMs !== null) return { run, stale: false }

  const absence = Math.max(0, nowMs - run.lastSeenMs)
  let cur = run
  let guard = 0

  while (guard++ < timeline.blocks.length + 2) {
    const block = timeline.blocks[cur.cursor]
    if (!block) break
    const remaining = block.durationMs - elapsedInBlock(cur, nowMs)
    if (remaining > 0) break
    if (cur.cursor >= timeline.blocks.length - 1) {
      // اليوم انتهى — علّم الكتلة الأخيرة كمكتملة وتوقّف.
      if (!cur.completed.includes(block.id)) cur = { ...cur, completed: [...cur.completed, block.id] }
      break
    }
    // غياب طويل + تجاوز كبير ⇒ لا تتقدّم تلقائيًا.
    if (absence > ABSENCE_THRESHOLD_MS && -remaining > STALE_THRESHOLD_MS) {
      return { run: cur, stale: true }
    }
    cur = advanceRun(cur, timeline, nowMs, true)
  }

  return { run: { ...cur, lastSeenMs: nowMs }, stale: false }
}

/**
 * استئناف جلسة قديمة «من حيث توقّف المستخدم»:
 * نُعيد تثبيت النقطة بحيث يبقى المنقضي كما كان لحظة آخر ظهور.
 */
export function resumeStaleAtLastSeen(run: RunState, timeline: DayTimeline, nowMs: number): RunState {
  const block = timeline.blocks[run.cursor]
  const elapsedAtLastSeen = Math.max(0, run.lastSeenMs - run.anchorMs - run.driftMs)
  const capped = block ? Math.min(elapsedAtLastSeen, block.durationMs) : 0
  return { ...run, anchorMs: nowMs - capped, driftMs: 0, pausedAtMs: null, lastSeenMs: nowMs }
}

/** قبول الوقت الفعلي المنقضي: تقدّم عبر الكتل المنتهية دون حماية. */
export function acceptStaleElapsed(run: RunState, timeline: DayTimeline, nowMs: number): RunState {
  let cur = { ...run, lastSeenMs: nowMs }
  let guard = 0
  while (guard++ < timeline.blocks.length + 2) {
    const block = timeline.blocks[cur.cursor]
    if (!block) break
    if (block.durationMs - elapsedInBlock(cur, nowMs) > 0) break
    if (cur.cursor >= timeline.blocks.length - 1) break
    cur = advanceRun(cur, timeline, nowMs, true)
  }
  return cur
}

/** القراءة الحيّة الكاملة لحالة المؤقّت. */
export function viewRun(
  run: RunState | null,
  timeline: DayTimeline,
  nowMs: number,
  stale = false,
): RunView {
  const total = timeline.blocks.length

  if (!run || total === 0) {
    return {
      status: total === 0 ? 'finished' : 'idle',
      block: timeline.blocks[0] ?? null,
      next: timeline.blocks[1] ?? null,
      index: 0,
      total,
      remainingMs: timeline.blocks[0]?.durationMs ?? 0,
      elapsedMs: 0,
      blockProgress: 0,
      // قبل البدء، «المهمّة القادمة» تبدأ بعد انتهاء الأولى — لا عند وقتها
      // المخطّط الذي قد يكون مضى بالفعل (فيظهر عدّاد صفري مضلّل).
      untilNextMs: timeline.blocks[0]?.durationMs ?? 0,
      remainingStudyMs: timeline.studyMinutes * 60_000,
      remainingWallMs: timeline.wallMinutes * 60_000,
      projectedEndMs: timeline.dayEndMs,
      scheduleDriftMs: 0,
    }
  }

  const idx = clampCursor(run.cursor, timeline)
  const block = timeline.blocks[idx] ?? null
  const next = timeline.blocks[idx + 1] ?? null
  const elapsed = block ? elapsedInBlock(run, nowMs) : 0
  const remaining = block ? block.durationMs - elapsed : 0

  // المتبقّي من الكتل اللاحقة كاملة + المتبقّي من الحالية.
  let remainingStudy = Math.max(0, block?.counts ? remaining : 0)
  let remainingWall = Math.max(0, remaining)
  for (let i = idx + 1; i < total; i++) {
    const b = timeline.blocks[i]
    remainingWall += b.durationMs
    if (b.counts) remainingStudy += b.durationMs
  }

  const finished = idx >= total - 1 && remaining <= 0
  const status: RunView['status'] = finished ? 'finished'
    : stale ? 'stale'
    : run.pausedAtMs !== null ? 'paused'
    : 'running'

  return {
    status,
    block,
    next,
    index: idx,
    total,
    remainingMs: remaining,
    elapsedMs: elapsed,
    blockProgress: block ? Math.min(1, Math.max(0, elapsed / block.durationMs)) : 0,
    untilNextMs: Math.max(0, remaining),
    remainingStudyMs: remainingStudy,
    remainingWallMs: remainingWall,
    projectedEndMs: nowMs + remainingWall,
    // انحراف الجلسة عن الجدول المخطّط: أين نحن فعلًا مقابل أين كان يجب أن نكون.
    scheduleDriftMs: block ? (nowMs - elapsed) - block.plannedStartMs : 0,
  }
}

/** دقائق الدراسة المحتسَبة التي أنجزها المستخدم فعليًا في هذه الجلسة. */
export function completedStudyMinutes(run: RunState | null, timeline: DayTimeline): number {
  if (!run) return 0
  const ids = new Set(run.completed)
  const ms = timeline.blocks
    .filter((b) => b.counts && ids.has(b.id))
    .reduce((a, b) => a + b.durationMs, 0)
  return Math.round(ms / 60_000)
}

/** هل حالة الجلسة المحفوظة ما زالت صالحة لهذا الجدول؟ */
export function isRunValid(run: RunState | null, timeline: DayTimeline): boolean {
  if (!run) return false
  if (run.date !== timeline.date) return false
  if (timeline.blocks.length === 0) return false
  return run.cursor >= 0 && run.cursor < timeline.blocks.length
}
