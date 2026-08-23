import { CURRICULUM_LESSONS, LESSON_MINUTES, lessonById } from '@/data/curriculum'

/**
 * محرّك الجدولة — يوزّع دروس المنهج على الأيام المتاحة حتى الموعد النهائي.
 *
 * Pure and deterministic: same inputs, same schedule, every time. Nothing here
 * reads the clock or the store, which is what makes the plan re-computable on
 * demand — the recovery system works by calling this again with fewer lessons
 * and fewer days, not by patching yesterday's output.
 *
 * Day keys are 'YYYY-MM-DD' strings stepped as calendar dates via a UTC anchor.
 * Never epoch arithmetic on local dates: a DST boundary inside the program
 * window would otherwise shift a whole day's worth of lessons.
 */

export type DayKind = 'ramp' | 'learn' | 'consolidate' | 'mock' | 'final'

export interface ScheduledDay {
  dayKey: string
  /** رقم اليوم داخل البرنامج، يبدأ من 1 عند تاريخ البداية. */
  programDay: number
  kind: DayKind
  /** الدروس الجديدة المسندة لهذا اليوم، بالترتيب. */
  lessonIds: string[]
  /** دروس الأمس — استرجاع قصير (المراجعة الأولى). */
  recallLessonIds: string[]
  /** دروس ما قبل 3 أيام — المراجعة المتباعدة الثانية. */
  reviewLessonIds: string[]
  /** في أيام التثبيت والامتحان: كل دروس الدورة المنصرمة. */
  consolidateLessonIds: string[]
}

export interface ScheduleConfig {
  /** كل كم يوم يأتي يوم تثبيت بلا دروس جديدة. 0 = لا أيام تثبيت. */
  consolidateEvery: number
  /** عدد أيام النهاية المخصّصة للامتحان والتثبيت بلا دروس جديدة. */
  tailDays: number
  /** أيام البداية المخفّفة لبناء العادة. */
  rampDays: number
  /** وزن يوم البداية مقارنةً بيوم كامل. 0.75 يعطي 6 دروس مقابل 8. */
  rampWeight: number
  /** سقف الدروس الجديدة في اليوم الواحد — صمّام أمان ضد جدول مستحيل. */
  maxLessonsPerDay: number
  /** المراجعة المتباعدة الثانية: بعد كم يوم من التعلّم. */
  spacedGapDays: number
}

export const DEFAULT_SCHEDULE_CONFIG: ScheduleConfig = {
  consolidateEvery: 7,
  tailDays: 3,
  rampDays: 2,
  rampWeight: 0.75,
  maxLessonsPerDay: 12,
  spacedGapDays: 3,
}

export interface ScheduleInput {
  /** تاريخ بداية البرنامج — يثبّت ترقيم الأيام وإيقاع أيام التثبيت. */
  startKey: string
  deadlineKey: string
  /** أول يوم يقبل دروسًا جديدة. يساوي startKey في الجدول المرجعي، واليوم في الجدول الحيّ. */
  fromKey?: string
  /** الدروس التي ما زالت تحتاج جدولة، بالترتيب. */
  lessonIds: string[]
  /**
   * ما دُرس فعلًا في أيام سابقة لـ fromKey: مفتاح اليوم إلى معرّفات دروسه.
   *
   * The live schedule starts at today, so the days that carry today's recall
   * (yesterday) and today's spaced review (three days back) are outside its
   * window. Without this the executed day silently loses both review blocks —
   * every single day, since today is always the window's first day.
   */
  priorDays?: Record<string, string[]>
  /**
   * مدّة الدرس بالدقائق، كما يحلّها makeMinutesResolver من تجاوزات المستخدم.
   *
   * Without it every lesson is treated as costing the same, which is what the
   * count-based split silently assumes. Passing it lets the allocator balance
   * days by minutes once a per-book override makes lessons unequal.
   */
  minutesOf?: (id: string) => number
  config?: Partial<ScheduleConfig>
}

export interface ScheduleResult {
  days: ScheduledDay[]
  config: ScheduleConfig
  /** دروس لم تجد مكانًا: الأيام المتبقّية لا تكفي حتى بالسقف الأقصى. */
  unscheduled: string[]
  /** true عندما يجد كل درس يومًا. */
  feasible: boolean
  /** أعلى عدد دروس أُسند ليوم واحد. */
  peakLessonsPerDay: number
  /** عدد الأيام التي تحمل دروسًا جديدة. */
  learningDays: number
}

/* ── تقويم بلا مفاجآت المناطق الزمنية ── */

const DAY_MS = 86_400_000

/** يحوّل مفتاح اليوم إلى منتصف ليل UTC. NaN لأي مدخل غير سليم. */
export function keyToUtc(key: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key ?? '')) return NaN
  return Date.parse(key + 'T00:00:00Z')
}

export function utcToKey(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10)
}

/** عدد الأيام من a إلى b. سالب إذا كان b قبل a. */
export function dayDiff(aKey: string, bKey: string): number {
  const a = keyToUtc(aKey)
  const b = keyToUtc(bKey)
  if (isNaN(a) || isNaN(b)) return 0
  return Math.round((b - a) / DAY_MS)
}

export function addDays(key: string, n: number): string {
  const t = keyToUtc(key)
  if (isNaN(t)) return key
  return utcToKey(t + n * DAY_MS)
}

/** كل مفاتيح الأيام من fromKey إلى toKey شاملةً الطرفين. */
export function dayRange(fromKey: string, toKey: string): string[] {
  if (isNaN(keyToUtc(fromKey)) || isNaN(keyToUtc(toKey))) return []
  const n = dayDiff(fromKey, toKey)
  if (n < 0) return []
  const out: string[] = []
  for (let i = 0; i <= n; i++) out.push(addDays(fromKey, i))
  return out
}

/* ── التوزيع ── */

/**
 * توزيع n عنصرًا على أوزان بطريقة أكبر الباقي.
 *
 * Largest-remainder keeps the total exact. A plain `Math.round(n * w / total)`
 * per day loses or invents lessons, which is the single most likely way a study
 * planner silently drops content.
 */
export function distributeByWeight(n: number, weights: number[]): number[] {
  const slots = weights.length
  const zero: number[] = new Array(slots).fill(0)
  if (slots === 0 || n <= 0) return zero
  const totalW = weights.reduce((a, b) => a + b, 0)
  if (totalW <= 0) return zero

  const raw = weights.map((w) => (n * w) / totalW)
  const base = raw.map((r) => Math.floor(r))
  let left = n - base.reduce((a, b) => a + b, 0)

  const order = raw
    .map((r, i) => ({ i, frac: r - base[i] }))
    .sort((a, b) => (b.frac - a.frac) || (a.i - b.i))

  for (let k = 0; k < order.length && left > 0; k++) {
    base[order[k].i] += 1
    left -= 1
  }
  return base
}

/** هل كل الدروس متساوية المدّة؟ عندها التوزيع بالعدد = التوزيع بالدقائق. */
function uniformMinutes(ids: string[], minutesOf?: (id: string) => number): boolean {
  if (!minutesOf || ids.length === 0) return true
  const first = minutesOf(ids[0])
  return ids.every((id) => minutesOf(id) === first)
}

/**
 * توزيع الدروس بحيث تتوازن **دقائق** الأيام، لا أعدادها.
 *
 * distributeByWeight balances lesson counts, which is correct only while every
 * lesson costs the same. The moment a per-book override lands (B1 lessons are
 * roughly twice the pages of A2, so 40 vs 20 is the realistic setting), equal
 * counts stop meaning equal work: measured on the real curriculum, days ran
 * from 120 to 360 minutes of new material — a 3x spread, with the heaviest
 * nine days all landing at the end.
 *
 * Targets are recomputed from what is actually left rather than fixed upfront,
 * so a day closed early by the cap does not push its shortfall onto the tail.
 */
function allocateByMinutes(
  lessonIds: string[],
  weights: number[],
  cap: number,
  minutesOf: (id: string) => number,
): number[] {
  const slots = weights.length
  const counts: number[] = new Array(slots).fill(0)
  if (slots === 0 || lessonIds.length === 0) return counts

  let remainingWeight = weights.reduce((a, b) => a + b, 0)
  if (remainingWeight <= 0) return counts
  let remainingMinutes = lessonIds.reduce((s, id) => s + minutesOf(id), 0)

  let cursor = 0
  for (let i = 0; i < slots && cursor < lessonIds.length; i++) {
    const target = remainingWeight > 0 ? (remainingMinutes * weights[i]) / remainingWeight : remainingMinutes
    let acc = 0

    while (cursor < lessonIds.length && counts[i] < cap) {
      /* اترك درسًا واحدًا على الأقل لكل يوم متبقٍّ بعد هذا اليوم. */
      const daysAfter = slots - i - 1
      if (counts[i] > 0 && lessonIds.length - cursor <= daysAfter) break

      const m = minutesOf(lessonIds[cursor])
      /* نصف درس تسامحًا: يمنع ترك اليوم ناقصًا لمجرّد أن الدرس التالي يتجاوز الهدف بقليل. */
      if (counts[i] > 0 && acc + m / 2 > target) break

      counts[i] += 1
      acc += m
      cursor += 1
    }

    remainingMinutes -= acc
    remainingWeight -= weights[i]
  }

  /* ما تبقّى بسبب السقف يملأ أي يوم فيه متّسع — نفس سياسة applyCap. */
  for (let i = 0; i < slots && cursor < lessonIds.length; i++) {
    const room = cap - counts[i]
    if (room <= 0) continue
    const take = Math.min(room, lessonIds.length - cursor)
    counts[i] += take
    cursor += take
  }

  return counts
}

/** يفرض السقف اليومي بنقل الفائض إلى أيام تحت السقف. يعيد ما تعذّر نقله. */
function applyCap(counts: number[], cap: number): number {
  let overflow = 0
  for (let i = 0; i < counts.length; i++) {
    if (counts[i] <= cap) continue
    overflow += counts[i] - cap
    counts[i] = cap
  }
  for (let i = 0; i < counts.length && overflow > 0; i++) {
    const room = cap - counts[i]
    if (room <= 0) continue
    const take = Math.min(room, overflow)
    counts[i] += take
    overflow -= take
  }
  return overflow
}

/* ── الجدول ── */

function classify(programDay: number, isTail: boolean, isLastDay: boolean, cfg: ScheduleConfig): DayKind {
  if (isLastDay) return 'final'
  if (isTail) return 'mock'
  if (cfg.consolidateEvery > 0 && programDay % cfg.consolidateEvery === 0) return 'consolidate'
  if (programDay <= cfg.rampDays) return 'ramp'
  return 'learn'
}

export function buildSchedule(input: ScheduleInput): ScheduleResult {
  const config: ScheduleConfig = { ...DEFAULT_SCHEDULE_CONFIG, ...(input.config ?? {}) }
  const from = input.fromKey && dayDiff(input.startKey, input.fromKey) > 0 ? input.fromKey : input.startKey
  const keys = dayRange(from, input.deadlineKey)

  if (keys.length === 0) {
    return {
      days: [],
      config,
      unscheduled: [...input.lessonIds],
      feasible: input.lessonIds.length === 0,
      peakLessonsPerDay: 0,
      learningDays: 0,
    }
  }

  /* أيام النهاية تُقاس من الموعد النهائي للخلف، لكنها لا تبتلع الجدول كله
     إذا لم يبقَ إلا أيام قليلة — عندها يبقى يوم واحد على الأقل للدروس. */
  const tail = Math.min(config.tailDays, Math.max(0, keys.length - 1))
  const firstTailIdx = keys.length - tail

  const days: ScheduledDay[] = keys.map((dayKey, i) => {
    const programDay = dayDiff(input.startKey, dayKey) + 1
    return {
      dayKey,
      programDay,
      kind: classify(programDay, i >= firstTailIdx, i === keys.length - 1, config),
      lessonIds: [],
      recallLessonIds: [],
      reviewLessonIds: [],
      consolidateLessonIds: [],
    }
  })

  /* لو لم يبقَ يوم تعلّم واحد (نافذة قصيرة جدًّا)، تُحوَّل أيام التثبيت إلى تعلّم
     قبل التسليم بأن الجدول غير قابل للتنفيذ. */
  let learnIdx = days.filter((d) => d.kind === 'ramp' || d.kind === 'learn')
  if (learnIdx.length === 0 && input.lessonIds.length > 0) {
    for (const d of days) if (d.kind === 'consolidate') d.kind = 'learn'
    learnIdx = days.filter((d) => d.kind === 'ramp' || d.kind === 'learn')
  }

  const weights = learnIdx.map((d) => (d.kind === 'ramp' ? config.rampWeight : 1))

  /* بالمدد المتساوية، موازنة الدقائق تساوي موازنة الأعداد — فنُبقي المسار
     الأصلي (أكبر الباقي) حرفيًا حتى لا يتغيّر أي جدول قائم. المسار الموزون
     يعمل فقط حين تختلف المدد فعلًا، وهو ما يحدث مع تجاوزات الكتب. */
  const counts = uniformMinutes(input.lessonIds, input.minutesOf)
    ? distributeByWeight(input.lessonIds.length, weights)
    : allocateByMinutes(input.lessonIds, weights, config.maxLessonsPerDay, input.minutesOf!)
  const overflow = applyCap(counts, config.maxLessonsPerDay)

  let cursor = 0
  learnIdx.forEach((d, k) => {
    d.lessonIds = input.lessonIds.slice(cursor, cursor + counts[k])
    cursor += counts[k]
  })

  const unscheduled = input.lessonIds.slice(cursor)
  linkReviews(days, config, input.priorDays ?? {})

  return {
    days,
    config,
    unscheduled,
    feasible: unscheduled.length === 0 && overflow === 0,
    peakLessonsPerDay: counts.length ? Math.max(...counts) : 0,
    learningDays: counts.filter((c) => c > 0).length,
  }
}

/**
 * يربط كل يوم بمراجعاته: دروس الأمس (استرجاع)، ودروس ما قبل 3 أيام (متباعدة)،
 * وفي أيام التثبيت كل دروس الدورة المنصرمة.
 *
 * Expanding intervals (1 day, 3 days, ~7 days) rather than fixed ones: each
 * successful retrieval buys a longer gap, which is the point of spacing.
 */
function linkReviews(days: ScheduledDay[], cfg: ScheduleConfig, priorDays: Record<string, string[]>): void {
  const byKey = new Map(days.map((d) => [d.dayKey, d]))
  const span = Math.max(1, cfg.consolidateEvery)
  /* أيام الجدول أوّلًا، ثم ما دُرس فعلًا قبل بداية النافذة. */
  const lessonsOn = (key: string): string[] => byKey.get(key)?.lessonIds ?? priorDays[key] ?? []

  for (const d of days) {
    d.recallLessonIds = lessonsOn(addDays(d.dayKey, -1))
    d.reviewLessonIds = lessonsOn(addDays(d.dayKey, -cfg.spacedGapDays))

    if (d.kind === 'consolidate' || d.kind === 'mock' || d.kind === 'final') {
      const bag: string[] = []
      for (let back = 1; back <= span; back++) bag.push(...lessonsOn(addDays(d.dayKey, -back)))
      d.consolidateLessonIds = bag
    }
  }
}

/* ── مساعدات القراءة ── */

export function dayNewMinutes(day: ScheduledDay, minutesOf?: (id: string) => number): number {
  const resolve = minutesOf ?? ((id: string) => lessonById(id)?.minutes ?? LESSON_MINUTES)
  return day.lessonIds.reduce((sum, id) => sum + resolve(id), 0)
}

/** كل معرّفات الدروس بالترتيب المنهجي. */
export function allLessonIds(): string[] {
  return CURRICULUM_LESSONS.map((l) => l.id)
}
