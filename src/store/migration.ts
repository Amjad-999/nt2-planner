import type {
  State, VocabWord, ExamWord, SkillKey, LessonStatusKey, StudyBlockKind, StudyBlockSnapshot,
} from './types'
import { clampNum } from '@/lib/utils'
import { boxToFsrsFields } from '@/features/vocab/fsrs-lite'
import { reconcileInburgeringExams } from '@/data/inburgering'
import { isValidSession } from '@/features/exam/mock'
import { isKnownLesson, CURRICULUM_BOOKS } from '@/data/curriculum'
import { defaultObs, sanitizeObs } from '@/features/observatory/state'

const TOTAL_PLAN_DAYS = 46
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const

export function defaultState(): State {
  return {
    name: '',
    /* No seeded date. Seeding "today + 46" made every brand-new user stare at
       a 46-day countdown they never chose — a number the app invented. The
       exam date is user-owned: '' means "not set yet", and every consumer
       (getDaysLeft, the hero countdown ring, planHealth) already handles it. */
    examDate: '',
    planDay: 1,
    planStart: new Date().toISOString(),
    done: {},
    studySec: 0,
    theme: 'light',
    focusMode: false,
    guestMode: false,
    mascotDismissed: false,
    botWordReminders: true,
    vocab: [],
    streak: { count: 0, last: '' },
    skill: {
      reading:   { best: 0, attempts: 0, history: [] },
      listening: { best: 0, attempts: 0, history: [] },
      writing:   { best: 0, attempts: 0, history: [] },
      speaking:  { best: 0, attempts: 0, history: [] },
    },
    examWriting: {},
    mockSession: null,
    mockRuns: [],
    examSpeaking: {},
    examReading: {},
    examListening: {},
    dailyHistory: {},
    prefs: { rate: 0.9, voiceURI: '', autoTTS: true, ttsEngine: 'auto', onlineVoice: 'FennaNeural', fontSize: 16, studyDayMinutes: 60, minutesPerTask: 30 },
    bookUnits: {},
    examWords: [],
    customDur: {},
    onboarded: false,
    unlockedBadges: [],
    grammarProgress: {},
    inburgeringExams: reconcileInburgeringExams(null),
    goalCelebratedOn: '',
    /* لا تواريخ مزروعة: البرنامج يبقى غير مفعَّل حتى يختار المستخدم نافذته. */
    studyProgram: { startKey: '', deadlineKey: '', lessons: {}, session: null, maxLessonsPerDay: 12, lessonMinutes: {}, order: 'sequential' },
    observatory: defaultObs(),
    _v: 6,
    _savedAt: 0,
  }
}

const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/
const LESSON_STATUSES: LessonStatusKey[] = ['new', 'learning', 'done', 'review', 'weak', 'mastered']
const BLOCK_KINDS: StudyBlockKind[] = ['recall', 'new', 'review', 'consolidate', 'repair', 'mock', 'test', 'close', 'break']

/**
 * برنامج الدراسة: تنقية صارمة.
 *
 * A malformed session is dropped rather than repaired — exactly the rule
 * mockSession follows. A timer whose `startedAt` or block durations are junk
 * would show confident, wrong countdowns, which is worse than asking the user
 * to press start again. Lesson records are sanitised one by one so a single bad
 * entry cannot throw away weeks of tracked progress.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function sanitizeStudyProgram(raw: any): State['studyProgram'] {
  const fallback: State['studyProgram'] = { startKey: '', deadlineKey: '', lessons: {}, session: null, maxLessonsPerDay: 12, lessonMinutes: {}, order: 'sequential' }
  if (!raw || typeof raw !== 'object') return fallback

  const startKey = DAY_KEY_RE.test(String(raw.startKey)) ? String(raw.startKey) : ''
  const deadlineKey = DAY_KEY_RE.test(String(raw.deadlineKey)) ? String(raw.deadlineKey) : ''

  const lessons: State['studyProgram']['lessons'] = {}
  if (raw.lessons && typeof raw.lessons === 'object' && !Array.isArray(raw.lessons)) {
    for (const [id, v] of Object.entries(raw.lessons as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue
      const r = v as Record<string, unknown>
      if (!LESSON_STATUSES.includes(r.s as LessonStatusKey)) continue
      /* سجلّ لدرس لا وجود له في المنهج (منهج قديم أو بيانات تالفة) يُسقَط:
         إبقاؤه يجعل نسبة التقدّم تعدّ دروسًا غير موجودة أصلًا. */
      if (!isKnownLesson(id)) continue
      lessons[id] = {
        s: r.s as LessonStatusKey,
        at: typeof r.at === 'number' && isFinite(r.at) ? r.at : 0,
        reps: clampNum(parseInt(String(r.reps)) || 0, 0, 999),
      }
    }
  }

  /* تجاوزات المدّة: كتب معروفة فقط، وأرقام في نطاق معقول. */
  const lessonMinutes: Record<string, number> = {}
  if (raw.lessonMinutes && typeof raw.lessonMinutes === 'object' && !Array.isArray(raw.lessonMinutes)) {
    for (const [bookId, v] of Object.entries(raw.lessonMinutes as Record<string, unknown>)) {
      if (!CURRICULUM_BOOKS.some((b) => b.id === bookId)) continue
      const n = parseInt(String(v))
      if (!isNaN(n) && n > 0) lessonMinutes[bookId] = clampNum(n, 5, 120)
    }
  }

  let session: State['studyProgram']['session'] = null
  const s = raw.session
  if (
    s && typeof s === 'object' && DAY_KEY_RE.test(String(s.dayKey))
    && typeof s.startedAt === 'number' && isFinite(s.startedAt) && s.startedAt > 0
    && Array.isArray(s.blocks) && s.blocks.length > 0
  ) {
    const blocks = s.blocks
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .filter((b: any) => b && typeof b === 'object' && BLOCK_KINDS.includes(b.kind)
        && typeof b.minutes === 'number' && isFinite(b.minutes) && b.minutes > 0)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .map((b: any): StudyBlockSnapshot => ({
        id: String(b.id ?? ''),
        kind: b.kind,
        titleAr: String(b.titleAr ?? ''),
        detailAr: String(b.detailAr ?? ''),
        minutes: clampNum(Math.round(b.minutes), 1, 240),
        lessonIds: Array.isArray(b.lessonIds) ? b.lessonIds.filter((x: unknown) => typeof x === 'string') : [],
      }))
    /* لقطة ناقصة، أو لقطة تشير إلى دروس لم تعد في المنهج (منهج قديم):
       المؤقّت في الحالتين لا يمثّل يومًا حقيقيًّا، فتُسقَط الجلسة كلها. */
    const allLessonsKnown = blocks.every(
      (b: StudyBlockSnapshot) => b.lessonIds.every((id: string) => isKnownLesson(id)),
    )
    if (blocks.length === s.blocks.length && allLessonsKnown) {
      session = {
        dayKey: String(s.dayKey),
        startedAt: s.startedAt,
        blocks,
        pausedMs: Math.max(0, typeof s.pausedMs === 'number' && isFinite(s.pausedMs) ? s.pausedMs : 0),
        pausedAt: Math.max(0, typeof s.pausedAt === 'number' && isFinite(s.pausedAt) ? s.pausedAt : 0),
      }
    }
  }

  return {
    startKey,
    deadlineKey,
    lessons,
    session,
    maxLessonsPerDay: clampNum(parseInt(String(raw.maxLessonsPerDay)) || 12, 4, 20),
    lessonMinutes,
    order: raw.order === 'examFirst' ? 'examFirst' : 'sequential',
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
  S.focusMode = typeof parsed.focusMode === 'boolean' ? parsed.focusMode : false
  S.guestMode = typeof parsed.guestMode === 'boolean' ? parsed.guestMode : false
  S.mascotDismissed = typeof parsed.mascotDismissed === 'boolean' ? parsed.mascotDismissed : false
  S.botWordReminders = typeof parsed.botWordReminders === 'boolean' ? parsed.botWordReminders : true
  // Daily-goal flag: must be a real dayKey or '' — junk that sorts after every
  // date (e.g. 'zzz') would win the cloud-merge max and mute celebrations forever.
  S.goalCelebratedOn = typeof parsed.goalCelebratedOn === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.goalCelebratedOn)
    ? parsed.goalCelebratedOn : ''

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

  // Daily history — sanitize each record: clamp counters and cap examTaken.
  // The cap also self-heals states inflated by the old concat-merge bug
  // (examTaken doubled on every cloud sync before mergeExamTaken existed).
  S.dailyHistory = {}
  if (parsed.dailyHistory && typeof parsed.dailyHistory === 'object') {
    for (const [k, v] of Object.entries(parsed.dailyHistory as Record<string, unknown>)) {
      if (!v || typeof v !== 'object') continue
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const d: any = v
      S.dailyHistory[k] = {
        mins:         clampNum(parseInt(String(d.mins))         || 0, 0, 1440),
        tasks:        clampNum(parseInt(String(d.tasks))        || 0, 0, 500),
        wordsAdded:   clampNum(parseInt(String(d.wordsAdded))   || 0, 0, 1000),
        wordsLearned: clampNum(parseInt(String(d.wordsLearned)) || 0, 0, 1000),
        examTaken: (Array.isArray(d.examTaken) ? d.examTaken : [])
          .filter((e: unknown) => !!e && typeof e === 'object'
            && typeof (e as { skill?: unknown }).skill === 'string'
            && typeof (e as { score?: unknown }).score === 'number')
          .slice(-50),
      }
    }
  }

  // Prefs
  const p = parsed.prefs || {}
  S.prefs = {
    rate:        typeof p.rate === 'number' ? clampNum(p.rate, 0.6, 1.3) : 0.9,
    voiceURI:    typeof p.voiceURI === 'string' ? p.voiceURI : '',
    autoTTS:     p.autoTTS !== false,
    ttsEngine:        ['auto','online','browser'].includes(p.ttsEngine) ? p.ttsEngine : 'auto',
    onlineVoice:      typeof p.onlineVoice === 'string' ? p.onlineVoice : 'FennaNeural',
    fontSize:         typeof p.fontSize === 'number' ? clampNum(p.fontSize, 13, 19) : 16,
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
  S.inburgeringExams = reconcileInburgeringExams(parsed.inburgeringExams)

  /* A malformed session would freeze the exam engine on a broken timer, so an
     unrecognised shape is dropped rather than repaired — the user simply starts
     a new run. Finished runs are sanitised individually so one bad entry does
     not throw away the whole history. */
  S.mockSession = isValidSession(parsed.mockSession) ? parsed.mockSession : null
  S.mockRuns = (Array.isArray(parsed.mockRuns) ? parsed.mockRuns : [])
    .filter((r: unknown) => {
      if (typeof r !== 'object' || r === null) return false
      const o = r as Record<string, unknown>
      return typeof o.id === 'string' && typeof o.finishedAt === 'number' && typeof o.total === 'number'
        && typeof o.scores === 'object' && o.scores !== null
    })
    .slice(-30)

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

  S.studyProgram = sanitizeStudyProgram(parsed.studyProgram)
  S.observatory = sanitizeObs(parsed.observatory)

  S._v = 6
  // '' stays '' (never set); anything unparseable is downgraded to "not set"
  // rather than to an invented date — see defaultState above.
  if (typeof S.examDate !== 'string' || isNaN(new Date(S.examDate).getTime())) S.examDate = ''

  // Prune daily history older than 180 days
  const cutoff = Date.now() - 1000 * 60 * 60 * 24 * 180
  Object.keys(S.dailyHistory).forEach(k => {
    const t = new Date(k + 'T00:00:00').getTime()
    if (isFinite(t) && t < cutoff) delete S.dailyHistory[k]
  })

  return S
}
