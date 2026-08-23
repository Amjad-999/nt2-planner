import type { State, VocabWord, ExamWord, SkillKey } from './types'
import { clampNum } from '@/lib/utils'
import { boxToFsrsFields } from '@/features/vocab/fsrs'
import { DEFAULT_CONFIG } from '@/features/program/schedule'
import { localToday } from '@/features/program/dates'
import type { LessonStatus, ProgramState, RunState } from '@/features/program/types'
import { isKnownLesson } from '@/data/curriculum'

const TOTAL_PLAN_DAYS = 46
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const
const LESSON_STATUSES: LessonStatus[] = ['new', 'active', 'done', 'review', 'weak', 'mastered']

export function defaultProgram(): ProgramState {
  return {
    enabled: false,
    statuses: {},
    run: null,
    config: { ...DEFAULT_CONFIG },
    lastActiveDate: localToday(),
    loggedMinutes: {},
    completedBlocks: {},
  }
}

/* Program state arrives from localStorage — validate every field so a corrupt
   or hand-edited payload can never crash the scheduler or the timer. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyProgram(raw: any): ProgramState {
  const base = defaultProgram()
  if (!raw || typeof raw !== 'object') return base

  // معرّفات الدروس تتغيّر عند تصحيح المنهج. أيّ مفتاح لا يوجد في المنهج
  // الحالي يُطرح بدل أن يُحتسب في النِسَب ويجعل التقدّم يتجاوز 100%.
  const statuses: Record<string, LessonStatus> = {}
  if (raw.statuses && typeof raw.statuses === 'object') {
    for (const [k, v] of Object.entries(raw.statuses)) {
      if (typeof k === 'string' && isKnownLesson(k) && LESSON_STATUSES.includes(v as LessonStatus)) {
        statuses[k] = v as LessonStatus
      }
    }
  }

  const cfg = raw.config && typeof raw.config === 'object' ? raw.config : {}
  const num = (v: unknown, def: number, min: number, max: number) =>
    typeof v === 'number' && isFinite(v) ? clampNum(Math.round(v), min, max) : def
  const str = (v: unknown, def: string) => (typeof v === 'string' && v ? v : def)

  const config = {
    startDate: str(cfg.startDate, base.config.startDate),
    deadline: str(cfg.deadline, base.config.deadline),
    dayStart: /^\d{1,2}:\d{2}$/.test(String(cfg.dayStart)) ? String(cfg.dayStart) : base.config.dayStart,
    bufferDays: num(cfg.bufferDays, base.config.bufferDays, 0, 10),
    consolidationDays: num(cfg.consolidationDays, base.config.consolidationDays, 0, 14),
    recallMinutes: num(cfg.recallMinutes, base.config.recallMinutes, 0, 30),
    shortBreak: num(cfg.shortBreak, base.config.shortBreak, 0, 30),
    longBreak: num(cfg.longBreak, base.config.longBreak, 0, 60),
    blocksBeforeLongBreak: num(cfg.blocksBeforeLongBreak, base.config.blocksBeforeLongBreak, 1, 10),
    closeMinutes: num(cfg.closeMinutes, base.config.closeMinutes, 0, 30),
    dailyCapacityMinutes: num(cfg.dailyCapacityMinutes, base.config.dailyCapacityMinutes, 30, 900),
    durationModel: cfg.durationModel === 'pages' ? 'pages' as const : 'flat' as const,
  }

  // A run whose fields aren't all finite numbers is unusable — drop it rather
  // than let NaN propagate into every countdown on screen.
  let run: RunState | null = null
  const r = raw.run
  if (r && typeof r === 'object' && typeof r.date === 'string') {
    const finite = (v: unknown) => typeof v === 'number' && isFinite(v)
    if (finite(r.anchorMs) && finite(r.cursor) && finite(r.startedAtMs)) {
      run = {
        date: r.date,
        cursor: Math.max(0, Math.round(r.cursor)),
        anchorMs: r.anchorMs,
        pausedAtMs: finite(r.pausedAtMs) ? r.pausedAtMs : null,
        driftMs: finite(r.driftMs) ? Math.max(0, r.driftMs) : 0,
        lastSeenMs: finite(r.lastSeenMs) ? r.lastSeenMs : r.anchorMs,
        startedAtMs: r.startedAtMs,
        completed: Array.isArray(r.completed) ? r.completed.filter((x: unknown) => typeof x === 'string') : [],
      }
    }
  }

  const loggedMinutes: Record<string, number> = {}
  if (raw.loggedMinutes && typeof raw.loggedMinutes === 'object') {
    for (const [k, v] of Object.entries(raw.loggedMinutes)) {
      if (typeof v === 'number' && isFinite(v) && v >= 0) loggedMinutes[k] = Math.round(v)
    }
  }

  const completedBlocks: Record<string, string[]> = {}
  if (raw.completedBlocks && typeof raw.completedBlocks === 'object') {
    for (const [k, v] of Object.entries(raw.completedBlocks)) {
      if (typeof k === 'string' && Array.isArray(v)) {
        const ids = v.filter((x: unknown): x is string => typeof x === 'string')
        if (ids.length) completedBlocks[k] = Array.from(new Set(ids))
      }
    }
  }

  return {
    enabled: raw.enabled === true,
    statuses,
    run,
    config,
    lastActiveDate: str(raw.lastActiveDate, base.lastActiveDate),
    loggedMinutes,
    completedBlocks,
  }
}

export function defaultState(): State {
  const d = new Date()
  d.setDate(d.getDate() + TOTAL_PLAN_DAYS)
  d.setHours(9, 0, 0, 0)
  return {
    name: '',
    examDate: d.toISOString(),
    planDay: 1,
    planStart: new Date().toISOString(),
    done: {},
    studySec: 0,
    theme: 'light',
    vocab: [],
    streak: { count: 0, last: '' },
    skill: {
      reading:   { best: 0, attempts: 0, history: [] },
      listening: { best: 0, attempts: 0, history: [] },
      writing:   { best: 0, attempts: 0, history: [] },
      speaking:  { best: 0, attempts: 0, history: [] },
    },
    examWriting: {},
    examSpeaking: {},
    examReading: {},
    examListening: {},
    dailyHistory: {},
    prefs: { rate: 0.9, voiceURI: '', autoTTS: true, ttsEngine: 'auto', onlineVoice: 'FennaNeural', fontSize: 15, studyDayMinutes: 60, minutesPerTask: 30 },
    bookUnits: {},
    examWords: [],
    customDur: {},
    onboarded: false,
    unlockedBadges: [],
    grammarProgress: {},
    program: defaultProgram(),
    _v: 6,
    _savedAt: 0,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyState(parsed: any): State {
  if (!parsed || typeof parsed !== 'object') return defaultState()
  const fresh = defaultState()

  const S: State = { ...fresh, ...parsed }

  S.done = parsed.done && typeof parsed.done === 'object' ? parsed.done : {}
  S.studySec = Math.max(0, parseInt(String(parsed.studySec)) || 0)
  S.planDay = clampNum(parseInt(String(parsed.planDay)) || 1, 1, TOTAL_PLAN_DAYS)
  // FIX: plan window anchor. Keep an existing start; otherwise back-date so the
  // returning user stays on roughly the same plan day while the window now runs
  // from this anchor to their exam date.
  if (parsed.planStart && !isNaN(new Date(parsed.planStart).getTime())) {
    S.planStart = parsed.planStart
  } else {
    const ps = new Date(); ps.setDate(ps.getDate() - (S.planDay - 1)); S.planStart = ps.toISOString()
  }
  S.theme = parsed.theme === 'dark' ? 'dark' : 'light'

  // Vocab
  S.vocab = (Array.isArray(parsed.vocab) ? parsed.vocab : [])
    .filter((w: unknown) => w && typeof w === 'object' && 'dutch' in (w as object) && 'arabic' in (w as object))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((w: any): VocabWord => {
      const box = clampNum(parseInt(String(w.box)) || 0, 0, 5)
      const due = typeof w.due === 'number' ? w.due : 0
      // Preserve existing FSRS fields if present, otherwise migrate from box
      const fsrsFromBox = (w.fsrs_state === undefined && box > 0) ? boxToFsrsFields(box, due) : {}
      return {
        id: w.id || 'w' + Math.random().toString(36).slice(2, 9),
        dutch: String(w.dutch).trim(),
        arabic: String(w.arabic).trim(),
        example: w.example ? String(w.example).trim() : '',
        level: LEVELS.includes(w.level) ? w.level : 'B1',
        box, due,
        reps: Math.max(0, parseInt(String(w.reps)) || 0),
        ...(w.fsrs_state !== undefined ? {
          fsrs_stability:      typeof w.fsrs_stability      === 'number' ? w.fsrs_stability      : undefined,
          fsrs_difficulty:     typeof w.fsrs_difficulty     === 'number' ? w.fsrs_difficulty     : undefined,
          fsrs_state:          typeof w.fsrs_state          === 'number' ? w.fsrs_state          : undefined,
          fsrs_last_review:    typeof w.fsrs_last_review    === 'number' ? w.fsrs_last_review    : undefined,
          fsrs_lapses:         typeof w.fsrs_lapses         === 'number' ? w.fsrs_lapses         : undefined,
          fsrs_scheduled_days: typeof w.fsrs_scheduled_days === 'number' ? w.fsrs_scheduled_days : undefined,
        } : fsrsFromBox),
      }
    })

  // Streak
  S.streak = parsed.streak && typeof parsed.streak === 'object'
    ? { count: Math.max(0, parseInt(String(parsed.streak.count)) || 0), last: parsed.streak.last || '' }
    : { count: 0, last: '' }

  // Skill
  const oldSkill = parsed.skill || {};
  (['reading', 'listening', 'writing', 'speaking'] as SkillKey[]).forEach(k => {
    const o = oldSkill[k] || {}
    S.skill[k] = {
      best: clampNum(parseInt(String(o.best)) || 0, 0, 100),
      attempts: Math.max(0, parseInt(String(o.attempts)) || 0),
      history: Array.isArray(o.history)
        ? o.history.filter((h: unknown) => h && typeof h === 'object').slice(-50)
        : [],
    }
  })

  S.examWriting   = (parsed.examWriting   && typeof parsed.examWriting   === 'object') ? parsed.examWriting   : {}
  S.examSpeaking  = (parsed.examSpeaking  && typeof parsed.examSpeaking  === 'object') ? parsed.examSpeaking  : {}
  S.examReading   = (parsed.examReading   && typeof parsed.examReading   === 'object') ? parsed.examReading   : {}
  S.examListening = (parsed.examListening && typeof parsed.examListening === 'object') ? parsed.examListening : {}

  // Daily history
  S.dailyHistory = (parsed.dailyHistory && typeof parsed.dailyHistory === 'object') ? parsed.dailyHistory : {}

  // Prefs
  const p = parsed.prefs || {}
  S.prefs = {
    rate:        typeof p.rate === 'number' ? clampNum(p.rate, 0.6, 1.3) : 0.9,
    voiceURI:    typeof p.voiceURI === 'string' ? p.voiceURI : '',
    autoTTS:     p.autoTTS !== false,
    ttsEngine:        ['auto','online','browser'].includes(p.ttsEngine) ? p.ttsEngine : 'auto',
    onlineVoice:      typeof p.onlineVoice === 'string' ? p.onlineVoice : 'FennaNeural',
    fontSize:         typeof p.fontSize === 'number' ? clampNum(p.fontSize, 13, 19) : 15,
    // FIX 3 — new prefs with migration defaults so existing saves load cleanly
    studyDayMinutes:  typeof p.studyDayMinutes === 'number' ? clampNum(p.studyDayMinutes, 15, 480) : 60,
    minutesPerTask:   typeof p.minutesPerTask  === 'number' ? clampNum(p.minutesPerTask,  5,  120) : 30,
  }

  // v6 extensions
  S.bookUnits       = (parsed.bookUnits  && typeof parsed.bookUnits  === 'object') ? parsed.bookUnits  : {}
  S.customDur       = (parsed.customDur  && typeof parsed.customDur  === 'object') ? parsed.customDur  : {}
  S.onboarded       = typeof parsed.onboarded === 'boolean' ? parsed.onboarded : !!(parsed.name || parsed.examDate)
  S.unlockedBadges  = Array.isArray(parsed.unlockedBadges) ? parsed.unlockedBadges.filter((x: unknown) => typeof x === 'string') : []
  S.grammarProgress = (parsed.grammarProgress && typeof parsed.grammarProgress === 'object' && !Array.isArray(parsed.grammarProgress)) ? parsed.grammarProgress : {}
  S.program         = applyProgram(parsed.program)

  // ExamWords
  S.examWords = (Array.isArray(parsed.examWords) ? parsed.examWords : [])
    .filter((w: unknown) => w && typeof w === 'object' && 'nl' in (w as object) && 'ar' in (w as object))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((w: any): ExamWord => {
      const box = clampNum(parseInt(String(w.box)) || 0, 0, 5)
      const due = typeof w.due === 'number' ? w.due : 0
      const fsrsFromBox = (w.fsrs_state === undefined && box > 0) ? boxToFsrsFields(box, due) : {}
      return {
        id: w.id || 'ew' + Math.random().toString(36).slice(2, 9),
        nl: String(w.nl).trim(),
        ar: String(w.ar).trim(),
        ex: w.ex ? String(w.ex).trim() : '',
        level: LEVELS.includes(w.level) ? w.level : 'B1',
        box, due,
        reps: Math.max(0, parseInt(String(w.reps)) || 0),
        added: typeof w.added === 'number' ? w.added : Date.now(),
        ...(w.fsrs_state !== undefined ? {
          fsrs_stability:      typeof w.fsrs_stability      === 'number' ? w.fsrs_stability      : undefined,
          fsrs_difficulty:     typeof w.fsrs_difficulty     === 'number' ? w.fsrs_difficulty     : undefined,
          fsrs_state:          typeof w.fsrs_state          === 'number' ? w.fsrs_state          : undefined,
          fsrs_last_review:    typeof w.fsrs_last_review    === 'number' ? w.fsrs_last_review    : undefined,
          fsrs_lapses:         typeof w.fsrs_lapses         === 'number' ? w.fsrs_lapses         : undefined,
          fsrs_scheduled_days: typeof w.fsrs_scheduled_days === 'number' ? w.fsrs_scheduled_days : undefined,
        } : fsrsFromBox),
      }
    })

  S._v = 6
  if (!S.examDate || isNaN(new Date(S.examDate).getTime())) S.examDate = fresh.examDate

  // Prune daily history older than 180 days
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 180
  Object.keys(S.dailyHistory).forEach(k => {
    const t = new Date(k + 'T00:00:00').getTime()
    if (isFinite(t) && t < cutoff) delete S.dailyHistory[k]
  })

  return S
}
