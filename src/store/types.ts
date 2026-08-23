export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export type SkillKey = 'reading' | 'listening' | 'writing' | 'speaking'

/** A timed full-exam run in progress. Mirrors MockSession in features/exam/mock. */
export interface MockSessionState {
  id: string
  skill: SkillKey
  order: SkillKey[]
  startedAt: number
  endsAt: number
  scores: Partial<Record<SkillKey, number>>
  minutes: Record<SkillKey, number>
}

/** A finished full-exam run, kept for the comparison column in the report. */
export interface MockRun {
  id: string
  startedAt: number
  finishedAt: number
  scores: Partial<Record<SkillKey, number>>
  total: number
}
/* ── برنامج الدراسة (منهج الكتب الثلاثة على أيام محدودة) ──
   Mirrors the shapes in features/plan/*. Kept declared here, import-free, the
   same way MockSessionState mirrors features/exam/mock — a drift between the
   two surfaces as a type error at the store boundary. */

export type LessonStatusKey = 'new' | 'learning' | 'done' | 'review' | 'weak' | 'mastered'

export type StudyBlockKind =
  | 'recall' | 'new' | 'review' | 'consolidate' | 'repair' | 'mock' | 'test' | 'close' | 'break'

export interface LessonRecordState {
  s: LessonStatusKey
  at: number
  reps: number
}

/** لقطة كتلة واحدة داخل جلسة اليوم — تُجمَّد وقت البدء. */
export interface StudyBlockSnapshot {
  id: string
  kind: StudyBlockKind
  titleAr: string
  detailAr: string
  minutes: number
  lessonIds: string[]
}

/** جلسة يوم دراسي جارية. المرجع الوحيد للوقت هو startedAt. */
export interface StudyProgramSession {
  dayKey: string
  startedAt: number
  blocks: StudyBlockSnapshot[]
  pausedMs: number
  pausedAt: number
}

/** تسلسلي = كما رُتّبت الكتب. أولوية الامتحان = دروس B1 قبل بقيّة A2. */
export type StudyOrderKey = 'sequential' | 'examFirst'

export interface StudyProgramState {
  /** '' = غير مفعَّل. لا يخترع التطبيق تاريخًا. */
  startKey: string
  deadlineKey: string
  lessons: Record<string, LessonRecordState>
  session: StudyProgramSession | null
  maxLessonsPerDay: number
  /** تجاوز مدّة الدرس لكل كتاب: معرّف الكتاب إلى دقائق. فارغ = مدّة الكتاب الافتراضية. */
  lessonMinutes: Record<string, number>
  order: StudyOrderKey
  /**
   * دقائق التركيز المكتوبة بالفعل في dailyHistory لكل يوم — علامة مائية.
   *
   * The session clock is derived from wall time, so it is read many times a
   * minute; without a watermark each read would add its own minutes again and
   * the analytics tab would climb without anyone studying. Storing what was
   * already written makes recording idempotent: only the difference is ever
   * added, so a refresh, a second tab or a replayed tick all cost nothing.
   */
  loggedMinutes: Record<string, number>
}

export type ThemeKey = 'light' | 'dark'
export type TtsEngine = 'auto' | 'online' | 'browser'
export type TabId = 'dashboard' | 'plan' | 'vocab' | 'books' | 'exam' | 'exercises' | 'grammar' | 'stats' | 'resources' | 'platform'
export type PlanHealthStatus = 'ok' | 'tight' | 'crit'

export interface VocabWord {
  id: string
  dutch: string
  arabic: string
  example: string
  level: Level
  box: number       // 0–5 (Leitner, kept for compat)
  due: number       // epoch ms
  reps: number
  // FSRS fields (optional — absent on legacy words until first FSRS review)
  fsrs_stability?: number
  fsrs_difficulty?: number
  fsrs_state?: number        // ts-fsrs State enum: 0=New 1=Learning 2=Review 3=Relearning
  fsrs_last_review?: number  // epoch ms
  fsrs_lapses?: number
  fsrs_scheduled_days?: number
}

export interface ExamWord {
  id: string
  nl: string
  ar: string
  ex: string
  level: Level
  box: number
  due: number
  reps: number
  added: number
  // FSRS fields (optional — absent on legacy words until first FSRS review)
  fsrs_stability?: number
  fsrs_difficulty?: number
  fsrs_state?: number
  fsrs_last_review?: number
  fsrs_lapses?: number
  fsrs_scheduled_days?: number
}

export interface SkillRecord {
  best: number
  attempts: number
  history: { date: string; score: number }[]
}

export interface DayRecord {
  mins: number
  tasks: number
  wordsAdded: number
  wordsLearned: number
  examTaken: { skill: string; score: number }[]
}

export interface Prefs {
  rate: number
  voiceURI: string
  autoTTS: boolean
  ttsEngine: TtsEngine
  onlineVoice: string
  fontSize: number         // px, 13–19
  studyDayMinutes: number  // FIX 3: minutes available for study per day (default 60)
  minutesPerTask: number   // FIX 3: average minutes assumed per task (default 30)
}

/* ── Inburgering exams (Lezen · Luisteren · Schrijven · Spreken · KNM) ──
   The 5 civic-integration exams tracked on the dashboard. Names + the initial
   day seed come from code (see @/data/inburgering); only `passed` and
   `examDate` are user-owned and synced to the cloud. `daysLeft` is the seed
   shown until a real `examDate` is picked (then it is derived from that date). */
export interface InburgeringExam {
  id: string
  nameNL: string
  nameAR: string
  daysLeft: number
  passed: boolean
  examDate: string | null
}

export interface State {
  name: string
  /** ISO datetime the user picked for their NT2 exam. `''` = not chosen yet —
   *  never a default the app invented. Persisted with the rest of the store
   *  (localStorage + idb-keyval) and merged to Supabase like any other field. */
  examDate: string
  planDay: number
  planStart: string
  done: Record<string, true>
  studySec: number
  theme: ThemeKey
  focusMode: boolean
  guestMode: boolean
  mascotDismissed: boolean
  botWordReminders: boolean
  vocab: VocabWord[]
  streak: { count: number; last: string }
  skill: Record<SkillKey, SkillRecord>
  examWriting: Record<string, { text: string; score: number; feedback?: string; at?: number }>
  /** جلسة الامتحان الكامل الجارية. null = لا جلسة. */
  mockSession: MockSessionState | null
  /** سجلّ المحاولات المكتملة، الأحدث آخرًا. */
  mockRuns: MockRun[]
  examSpeaking: Record<string, { score: number; at: number }>
  examReading: Record<string, Record<number, number>>
  examListening: Record<string, Record<number, number>>
  dailyHistory: Record<string, DayRecord>
  prefs: Prefs
  bookUnits: Record<string, number[]>
  examWords: ExamWord[]
  customDur: Record<string, number>
  onboarded: boolean
  unlockedBadges: string[]
  grammarProgress: Record<string, number[]>   // topicId → indices of correctly-answered exercises
  inburgeringExams: InburgeringExam[]
  goalCelebratedOn: string   // dayKey ('YYYY-MM-DD') of the last daily-goal celebration; '' = never
  /** برنامج الكتب: حالة كل درس، ونافذة التواريخ، وجلسة اليوم الجارية. */
  studyProgram: StudyProgramState
  _v: number
  _savedAt: number
}

/* ── Exam content shapes ── */
export interface ExamReadingQuestion {
  q: string
  ar: string
  opts: string[]
  correct: number
  why: string
}

export interface ExamReadingItem {
  id: string
  title: string
  ar: string
  text: string
  questions: ExamReadingQuestion[]
}

export interface ExamListeningQuestion {
  q: string
  ar: string
  opts: string[]
  correct: number
}

export interface ExamListeningItem {
  id: string
  title: string
  ar: string
  transcript: string
  questions: ExamListeningQuestion[]
}

/** One content point the answer has to cover, with the Dutch wordings that prove it. */
export interface ExamWritingPoint {
  /** ما المطلوب، بالعربية — يُعرض للمستخدم في قائمة التحقّق. */
  ar: string
  /** Any one of these Dutch fragments counts as covering the point. Lowercase. */
  any: string[]
}

export interface ExamWritingItem {
  id: string
  kind: string
  ar: string
  titleNl: string
  briefNl: string
  briefAr: string
  minWords: number
  maxWords: number
  /** formeel = u/uw required; informeel = je/jij is fine. Drives the register check. */
  register: 'formeel' | 'informeel'
  /** The points the task asks for. Empty is not allowed — content is the main criterion. */
  points: ExamWritingPoint[]
}

export interface ExamSpeakingItem {
  id: string
  deel: 1 | 2
  sec: number
  ar: string
  situatieNl: string
  taakNl: string
  voorbeeldNl: string
  situatieAr: string
  taakAr: string
}

/* ── Plan shapes ── */
export interface PlanTask {
  name: string
  mins: number
  skill: string
}

export interface Phase {
  id: string
  title: string
  days: string
  dayFrom: number
  dayTo: number
  tasks: PlanTask[]
}

export interface TodayTask {
  id: string
  name: string
  mins: number
  skill: string
  why: string
  phase: string
}

export interface PlanHealthResult {
  status: PlanHealthStatus
  badge: string
  title: string
  why: string
  left: number | null
  rem: number
  total: number
  done: number
  needMins: number
  lag: number
  lagPct: number
}

/* ── Book ── */
export interface BookUnit {
  id: string
  icon: string
  bg: string
  ic: string
  title: string
  desc: string
  units: string[]
}

/* ── Resource ── */
export interface ResourceLink {
  href: string
  title: string
  desc: string
}
