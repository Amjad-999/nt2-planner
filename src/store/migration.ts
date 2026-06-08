import type { State, VocabWord, ExamWord, SkillKey } from './types'
import { clampNum } from '@/lib/utils'

const TOTAL_PLAN_DAYS = 46
const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'] as const

export function defaultState(): State {
  const d = new Date()
  d.setDate(d.getDate() + TOTAL_PLAN_DAYS)
  d.setHours(9, 0, 0, 0)
  return {
    name: '',
    examDate: d.toISOString(),
    planDay: 1,
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
  S.theme = parsed.theme === 'dark' ? 'dark' : 'light'

  // Vocab
  S.vocab = (Array.isArray(parsed.vocab) ? parsed.vocab : [])
    .filter((w: unknown) => w && typeof w === 'object' && 'dutch' in (w as object) && 'arabic' in (w as object))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((w: any): VocabWord => ({
      id: w.id || 'w' + Math.random().toString(36).slice(2, 9),
      dutch: String(w.dutch).trim(),
      arabic: String(w.arabic).trim(),
      example: w.example ? String(w.example).trim() : '',
      level: LEVELS.includes(w.level) ? w.level : 'B1',
      box: clampNum(parseInt(String(w.box)) || 0, 0, 5),
      due: typeof w.due === 'number' ? w.due : 0,
      reps: Math.max(0, parseInt(String(w.reps)) || 0),
    }))

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
  S.bookUnits  = (parsed.bookUnits  && typeof parsed.bookUnits  === 'object') ? parsed.bookUnits  : {}
  S.customDur  = (parsed.customDur  && typeof parsed.customDur  === 'object') ? parsed.customDur  : {}
  S.onboarded  = typeof parsed.onboarded === 'boolean' ? parsed.onboarded : !!(parsed.name || parsed.examDate)

  // ExamWords
  S.examWords = (Array.isArray(parsed.examWords) ? parsed.examWords : [])
    .filter((w: unknown) => w && typeof w === 'object' && 'nl' in (w as object) && 'ar' in (w as object))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((w: any): ExamWord => ({
      id: w.id || 'ew' + Math.random().toString(36).slice(2, 9),
      nl: String(w.nl).trim(),
      ar: String(w.ar).trim(),
      ex: w.ex ? String(w.ex).trim() : '',
      level: LEVELS.includes(w.level) ? w.level : 'B1',
      box: clampNum(parseInt(String(w.box)) || 0, 0, 5),
      due: typeof w.due === 'number' ? w.due : 0,
      reps: Math.max(0, parseInt(String(w.reps)) || 0),
      added: typeof w.added === 'number' ? w.added : Date.now(),
    }))

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
