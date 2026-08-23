import type { DurationModel } from '@/data/curriculum'

/** أنواع محرّك برنامج الدراسة. */

/** حالة الدرس — ست حالات كما طُلبت. */
export type LessonStatus =
  | 'new'       // لم يبدأ
  | 'active'    // قيد الدراسة
  | 'done'      // مكتمل (تمريرة أولى)
  | 'review'    // يحتاج مراجعة (حان موعد الاسترجاع)
  | 'weak'      // ضعيف (فشل استرجاع)
  | 'mastered'  // متقن (نجح استرجاعان متباعدان)

export type DayKind =
  | 'learn'        // يوم دروس جديدة
  | 'buffer'       // يوم احتياطي — مراجعة وتعويض فقط
  | 'consolidate'  // مرحلة التثبيت
  | 'taper'        // تخفيف قبل الموعد
  | 'deadline'     // يوم الموعد النهائي

export type BlockKind =
  | 'lesson'      // درس جديد
  | 'recall'      // استرجاع نشط بعد زوج دروس
  | 'shortBreak'
  | 'longBreak'
  | 'review'      // مراجعة متباعدة لقسم
  | 'sweep'       // كنس شامل لقسم في مرحلة التثبيت
  | 'mock'        // اختبار ذاتي / محاكاة
  | 'weakRepair'  // إصلاح النقاط الضعيفة
  | 'close'       // إغلاق اليوم
  | 'free'        // جلسة حرّة — ضمان أن كل يوم قابل للتشغيل

/** مراجعة متباعدة مجدولة لقسم. */
export interface ReviewItem {
  sectionId: string
  /** 1 = +1 يوم، 2 = +3 أيام، 3 = +7 أيام. */
  stage: 1 | 2 | 3
  minutes: number
  /** تاريخ إتمام القسم (المرجع الذي حُسب منه التباعد). */
  sourceDate: string
  /** true إذا أُزيح التاريخ للأمام لأنه تجاوز نهاية النافذة. */
  clamped: boolean
}

/** كنس شامل لقسم في مرحلة التثبيت. */
export interface SweepItem {
  sectionId: string
  minutes: number
}

export interface DayPlan {
  /** مفتاح محلّي YYYY-MM-DD. */
  date: string
  /** 1..N عبر النافذة كاملة. */
  index: number
  kind: DayKind
  /** L1..L18 ليوم الدروس الجديدة، وإلا null. */
  learnIndex: number | null
  /** معرّفات الدروس الجديدة لهذا اليوم. */
  lessons: string[]
  reviews: ReviewItem[]
  sweeps: SweepItem[]
  mockMinutes: number
  weakRepairMinutes: number
  /** وصف عربي قصير لطبيعة اليوم. */
  label: string
}

/** كتلة زمنية واحدة داخل جدول اليوم، بأوقات مطلقة. */
export interface TimelineBlock {
  id: string
  kind: BlockKind
  title: string
  subtitle: string
  durationMs: number
  /** إزاحة البداية من بداية اليوم. */
  offsetMs: number
  /** الوقت المخطّط المطلق (epoch ms) — يُشتق من تاريخ اليوم + ساعة البدء. */
  plannedStartMs: number
  plannedEndMs: number
  /** الدروس التي تغطّيها هذه الكتلة (للكتل من نوع lesson فقط عادةً). */
  lessonIds: string[]
  sectionIds: string[]
  /** هل تُحتسب ضمن وقت الدراسة الفعلي (الاستراحات لا تُحتسب). */
  counts: boolean
}

export interface DayTimeline {
  date: string
  dayStartMs: number
  dayEndMs: number
  blocks: TimelineBlock[]
  /** دقائق دراسة فعلية (بدون استراحات). */
  studyMinutes: number
  /** دقائق استراحة. */
  breakMinutes: number
  /** إجمالي الوقت على الساعة من البداية للنهاية. */
  wallMinutes: number
}

/** حالة تشغيل المؤقّت — مثبّتة على الزمن المطلق، لا على عدّاد تنازلي محلّي. */
export interface RunState {
  /** اليوم الذي تخصّه هذه الجلسة (مفتاح محلّي). */
  date: string
  /** فهرس الكتلة الحالية داخل جدول اليوم. */
  cursor: number
  /** epoch ms للحظة بدء الكتلة الحالية. */
  anchorMs: number
  /** epoch ms للحظة الإيقاف المؤقّت، أو null إذا كانت تعمل. */
  pausedAtMs: number | null
  /** مجموع ملّي ثانية التوقّف المؤقّت داخل الكتلة الحالية. */
  driftMs: number
  /** آخر لحظة كان فيها التطبيق مرئيًا — تُستخدم لاستعادة الجلسات المنقطعة. */
  lastSeenMs: number
  /** epoch ms لبدء الجلسة. */
  startedAtMs: number
  /** معرّفات الكتل المكتملة. */
  completed: string[]
}

export interface ProgramConfig {
  /** تاريخ بدء البرنامج (YYYY-MM-DD محلّي). */
  startDate: string
  /** الموعد النهائي (YYYY-MM-DD محلّي) — يوم مُتضمَّن في النافذة. */
  deadline: string
  /** ساعة بدء يوم الدراسة، "HH:MM" بتوقيت الجهاز المحلّي. */
  dayStart: string
  /** عدد الأيام الاحتياطية داخل مرحلة التعلّم. */
  bufferDays: number
  /** عدد أيام مرحلة التثبيت قبل التخفيف. */
  consolidationDays: number
  /** دقائق الاسترجاع النشط بعد كل زوج دروس. */
  recallMinutes: number
  /** الاستراحة القصيرة بالدقائق. */
  shortBreak: number
  /** الاستراحة الطويلة بالدقائق. */
  longBreak: number
  /** عدد كتل الدروس قبل استراحة طويلة. */
  blocksBeforeLongBreak: number
  /** دقائق إغلاق اليوم. */
  closeMinutes: number
  /** الطاقة اليومية المتاحة بالدقائق (على الساعة، شاملة الاستراحات). */
  dailyCapacityMinutes: number
  /** كيف تُحسب مدّة الدرس: 20 دقيقة ثابتة، أو موزونة بعدد صفحاته. */
  durationModel: DurationModel
}

/** الحالة المحفوظة لبرنامج الدراسة. */
export interface ProgramState {
  /** هل فعّل المستخدم البرنامج؟ */
  enabled: boolean
  /** حالة كل درس — المفاتيح الغائبة تعني 'new'. */
  statuses: Record<string, LessonStatus>
  /** جلسة المؤقّت الجارية (أو null). */
  run: RunState | null
  config: ProgramConfig
  /** آخر يوم فتح فيه المستخدم البرنامج (مفتاح محلّي). */
  lastActiveDate: string
  /** دقائق سُجّلت بالفعل في dailyHistory لكل يوم — يمنع الاحتساب المزدوج. */
  loggedMinutes: Record<string, number>
  /**
   * الكتل المكتملة لكل يوم (مفتاح يوم → معرّفات الكتل).
   *
   * منفصلة عن `run.completed` عمدًا: الإنجاز يجب أن يكون ممكنًا بلا تشغيل
   * المؤقّت أصلًا، وأن يبقى بعد انتهاء الجلسة. الجلسة تُغذّي هذه الخريطة،
   * ولا تملكها.
   */
  completedBlocks: Record<string, string[]>
}

export interface FeasibilityReport {
  feasible: boolean
  /** أثقل يوم على الساعة بالدقائق. */
  peakWallMinutes: number
  peakDate: string
  /** متوسط يوم التعلّم على الساعة. */
  avgLearnWallMinutes: number
  /** الفارق بين الذروة والطاقة المتاحة (موجب = عجز). */
  deficitMinutes: number
  /** أسباب/ملاحظات بالعربية. */
  notes: string[]
}
