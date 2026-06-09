export type Level = 'A1' | 'A2' | 'B1' | 'B2' | 'C1'
export type SkillKey = 'reading' | 'listening' | 'writing' | 'speaking'
export type ThemeKey = 'light' | 'dark'
export type TtsEngine = 'auto' | 'online' | 'browser'
export type TabId = 'dashboard' | 'plan' | 'vocab' | 'books' | 'exam' | 'exercises' | 'stats' | 'resources' | 'platform'
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

export interface State {
  name: string
  examDate: string
  planDay: number
  planStart: string
  done: Record<string, true>
  studySec: number
  theme: ThemeKey
  vocab: VocabWord[]
  streak: { count: number; last: string }
  skill: Record<SkillKey, SkillRecord>
  examWriting: Record<string, { text: string; score: number; feedback?: string; at?: number }>
  examSpeaking: Record<string, { score: number; at: number }>
  examReading: Record<string, Record<number, number>>
  examListening: Record<string, Record<number, number>>
  dailyHistory: Record<string, DayRecord>
  prefs: Prefs
  bookUnits: Record<string, number[]>
  examWords: ExamWord[]
  customDur: Record<string, number>
  onboarded: boolean
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

export interface ExamWritingItem {
  id: string
  kind: string
  ar: string
  titleNl: string
  briefNl: string
  briefAr: string
  minWords: number
  maxWords: number
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
