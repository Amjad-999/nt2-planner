import type { BlockKind, DayBlock } from './blocks'

/**
 * محرّك المؤقّت — وقت حقيقي، لا عدّاد تنازلي محلّي.
 *
 * The whole engine is one subtraction: every boundary is derived from
 * `startedAt` (a stored epoch timestamp) plus the snapshot of block durations.
 * Nothing decrements. That is what makes it survive a refresh, a closed tab, a
 * phone that slept for two hours, and a device in a different timezone — the
 * answer to "which block am I in" is recomputed from wall-clock every tick,
 * never accumulated.
 *
 * The block durations are snapshotted into the session on start, so editing the
 * plan mid-day cannot make the running clock jump. Rebuilding the day is an
 * explicit action.
 */

export interface SessionBlock {
  id: string
  kind: BlockKind
  titleAr: string
  detailAr: string
  minutes: number
  lessonIds: string[]
}

export interface ProgramSession {
  dayKey: string
  /** epoch ms للحظة بدء اليوم. المرجع الوحيد لكل الحدود الزمنية. */
  startedAt: number
  /** لقطة مدد الكتل وقت البدء. */
  blocks: SessionBlock[]
  /** مجموع أزمنة التوقّف المكتملة بالمللي ثانية. */
  pausedMs: number
  /** epoch ms للحظة التوقّف الحالية. 0 = يعمل. */
  pausedAt: number
}

const MIN_MS = 60_000
/** أطول جلسة معقولة. ما تجاوزها فالساعة تغيّرت أو الجلسة بائتة. */
const MAX_SESSION_MS = 20 * 60 * MIN_MS

export function toSessionBlock(b: DayBlock): SessionBlock {
  return { id: b.id, kind: b.kind, titleAr: b.titleAr, detailAr: b.detailAr, minutes: b.minutes, lessonIds: b.lessonIds }
}

/**
 * بصمة قائمة كتل — تتغيّر إذا تغيّر أي معرّف أو مدّة أو درس.
 *
 * The running session holds a frozen snapshot so the clock cannot jump; this is
 * how the UI notices the underlying plan has moved on since, and offers a
 * rebuild instead of silently running a day that no longer exists.
 */
export function blocksSignature(blocks: { id: string; minutes: number; lessonIds: string[] }[]): string {
  return blocks.map((b) => `${b.id}:${b.minutes}:${b.lessonIds.join(',')}`).join('|')
}

export function createSession(dayKey: string, blocks: DayBlock[], now: number): ProgramSession {
  return { dayKey, startedAt: now, blocks: blocks.map(toSessionBlock), pausedMs: 0, pausedAt: 0 }
}

/** مجموع مدد الكتل بالمللي ثانية. */
export function sessionTotalMs(s: ProgramSession): number {
  return s.blocks.reduce((sum, b) => sum + b.minutes * MIN_MS, 0)
}

/** حدود كل كتلة نسبةً إلى بداية الجلسة. */
export function timeline(s: ProgramSession): { start: number; end: number }[] {
  let acc = 0
  return s.blocks.map((b) => {
    const start = acc
    acc += b.minutes * MIN_MS
    return { start, end: acc }
  })
}

/**
 * الزمن المنقضي داخل الجلسة، بعد خصم التوقّفات.
 * يُثبَّت عند التوقّف، ويُقصّ عند صفر وعند نهاية اليوم.
 */
export function elapsedMs(s: ProgramSession, now: number): number {
  const mark = s.pausedAt > 0 ? s.pausedAt : now
  const raw = mark - s.startedAt - s.pausedMs
  if (!isFinite(raw) || raw < 0) return 0
  return Math.min(raw, sessionTotalMs(s))
}

/**
 * جلسة بائتة: ساعة الجهاز رجعت إلى الوراء، أو مرّ عليها وقت طويل جدًّا،
 * أو صارت لِيومٍ آخر. الواجهة تعرض إعادة بناء بدل أرقام كاذبة.
 */
export function isStale(s: ProgramSession, now: number, todayKey: string): boolean {
  if (s.dayKey !== todayKey) return true
  if (now < s.startedAt - MIN_MS) return true
  return now - s.startedAt > MAX_SESSION_MS
}

export interface SessionPosition {
  /** فهرس الكتلة الحالية، -1 إذا انتهى اليوم. */
  index: number
  current: SessionBlock | null
  next: SessionBlock | null
  /** المللي ثانية المتبقّية في الكتلة الحالية. */
  remainingInBlockMs: number
  /** المللي ثانية حتى بداية الكتلة التالية — نفس الرقم أعلاه ما دام هناك تالٍ. */
  msUntilNext: number
  /** كل الوقت المتبقّي في اليوم، استراحاتٍ ودراسةً. */
  remainingTotalMs: number
  /** الوقت المتبقّي من كتل التركيز فقط. */
  remainingFocusMs: number
  elapsedMs: number
  totalMs: number
  /** 0..100 من زمن اليوم. */
  pct: number
  finished: boolean
  paused: boolean
}

export function positionOf(s: ProgramSession, now: number): SessionPosition {
  const tl = timeline(s)
  const total = sessionTotalMs(s)
  const el = elapsedMs(s, now)
  const paused = s.pausedAt > 0

  let index = -1
  for (let i = 0; i < tl.length; i++) {
    if (el < tl[i].end) { index = i; break }
  }
  const finished = index === -1

  const current = finished ? null : s.blocks[index]
  const next = finished || index + 1 >= s.blocks.length ? null : s.blocks[index + 1]
  const remainingInBlockMs = finished ? 0 : Math.max(0, tl[index].end - el)

  let remainingFocusMs = 0
  for (let i = finished ? tl.length : index; i < s.blocks.length; i++) {
    if (s.blocks[i].kind === 'break') continue
    const from = i === index ? el : tl[i].start
    remainingFocusMs += Math.max(0, tl[i].end - from)
  }

  return {
    index,
    current,
    next,
    remainingInBlockMs,
    msUntilNext: next ? remainingInBlockMs : 0,
    remainingTotalMs: Math.max(0, total - el),
    remainingFocusMs,
    elapsedMs: el,
    totalMs: total,
    pct: total > 0 ? Math.round((el / total) * 100) : 0,
    finished,
    paused,
  }
}

/**
 * وقت البدء الجداري المتوقّع لكتلة، بعد أخذ التوقّفات في الحسبان.
 *
 * `pausedMs` only records pauses that have already ended, so during a live pause
 * the stored total lags by however long the user has been stopped. Without
 * `now` this returned a wall-clock time in the past — a paused session showed
 * the next block starting at a moment that had already gone by.
 */
export function blockStartsAt(s: ProgramSession, index: number, now?: number): number {
  const tl = timeline(s)
  if (index < 0 || index >= tl.length) return s.startedAt
  const ongoingPause = s.pausedAt > 0 && typeof now === 'number' ? Math.max(0, now - s.pausedAt) : 0
  return s.startedAt + s.pausedMs + ongoingPause + tl[index].start
}

/* ── تحكّم ── */

export function pause(s: ProgramSession, now: number): ProgramSession {
  if (s.pausedAt > 0) return s
  return { ...s, pausedAt: now }
}

export function resume(s: ProgramSession, now: number): ProgramSession {
  if (s.pausedAt <= 0) return s
  const delta = Math.max(0, now - s.pausedAt)
  return { ...s, pausedAt: 0, pausedMs: s.pausedMs + delta }
}

/**
 * القفز إلى الكتلة التالية بإزاحة نقطة البدء، لا بحذف كتلة.
 * The timeline stays intact, so the day's total is still the day's total and
 * "remaining" never lies about what is left.
 */
export function skipToNext(s: ProgramSession, now: number): ProgramSession {
  const pos = positionOf(s, now)
  if (pos.finished) return s
  const shift = pos.remainingInBlockMs
  if (shift <= 0) return s
  return { ...s, startedAt: s.startedAt - shift }
}

/** الرجوع إلى بداية الكتلة الحالية. */
export function restartBlock(s: ProgramSession, now: number): ProgramSession {
  const pos = positionOf(s, now)
  if (pos.finished) return s
  const tl = timeline(s)
  const into = elapsedMs(s, now) - tl[pos.index].start
  if (into <= 0) return s
  return { ...s, startedAt: s.startedAt + into }
}

/* ── عرض ── */

/** يصوغ مدّة بالمللي ثانية على هيئة HH:MM:SS أو MM:SS. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${h}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** ساعة الحائط المحلّية HH:MM لطابع زمني. */
export function formatClock(ms: number): string {
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

/** يصوغ دقائق على هيئة "3 س 40 د". */
export function formatMinutes(mins: number): string {
  const m = Math.max(0, Math.round(mins))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r} د`
  if (r === 0) return `${h} س`
  return `${h} س ${r} د`
}
