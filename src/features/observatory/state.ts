import type {
  ObsState, ObsSettings, SessionRun, StepRun, StepKind, SessionRecord, ExpressionRecord, ExpressionUse,
  Attempt, Difficulty, Note, RoleplayRun, RoleplaySummary, PlanPrefs, ContextKey, RecallTarget,
  QuestionAnswer, WordAnswer, BuildAnswer, RecallAnswer, TypedResult,
} from './types'

/* ── defaults · sanitising · cloud merge for the `observatory` store field ──
   Same discipline as migration.ts: every value from storage, a backup file or
   the cloud is treated as untrusted. A malformed record is dropped on its
   own; it never takes the learner's other evidence down with it. */

export const CONTEXTS: ContextKey[] = ['gezondheid', 'afspraken', 'werk', 'nieuws', 'winkel', 'telefoon', 'thuis', 'overig']
const STEP_KINDS: StepKind[] = ['input', 'questions', 'words', 'build', 'retell', 'recall', 'review']
const TYPED: TypedResult[] = ['', 'correct', 'close', 'wrong']
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/

export const CAPS = { history: 240, attempts: 240, notes: 400, deferred: 3, roleplays: 120, uses: 60, examples: 5, expressions: 800 }

export function defaultSettings(): ObsSettings {
  return {
    targetLang: 'nl',
    uiLang: 'ar',
    assistLang: 'ar',
    motion: 'system',
    skin: 'observatory',
    sessionMinutes: 25,
    audioAutoplay: false,
    showDemo: false,
    activeRule: { uses: 3, contexts: 2, days: 2, countSelfReports: false },
  }
}

export function defaultObs(): ObsState {
  return {
    v: 1,
    settings: defaultSettings(),
    session: null,
    deferred: [],
    history: [],
    expressions: {},
    attempts: [],
    difficulties: {},
    notes: [],
    roleplay: null,
    roleplays: [],
    plan: { days: [1, 2, 3, 4, 5], focus: [], note: '' },
    updatedAt: 0,
  }
}

/* ── primitive guards ── */
type Raw = Record<string, unknown>
const isObj = (x: unknown): x is Raw => !!x && typeof x === 'object' && !Array.isArray(x)
const str = (x: unknown, max = 2000): string => (typeof x === 'string' ? x.slice(0, max) : '')
const num = (x: unknown, lo = 0, hi = Number.MAX_SAFE_INTEGER, d = 0): number =>
  typeof x === 'number' && isFinite(x) ? Math.min(hi, Math.max(lo, x)) : d
const int = (x: unknown, lo: number, hi: number, d = 0) => Math.round(num(x, lo, hi, d))
const bool = (x: unknown, d = false) => (typeof x === 'boolean' ? x : d)
const oneOf = <T extends string>(x: unknown, list: readonly T[], d: T): T => (list.includes(x as T) ? (x as T) : d)
const ctx = (x: unknown): ContextKey => oneOf(x, CONTEXTS, 'overig')
const day = (x: unknown) => (typeof x === 'string' && DAY_RE.test(x) ? x : '')
const strArr = (x: unknown, max = 50): string[] => (Array.isArray(x) ? x.filter((s): s is string => typeof s === 'string').slice(0, max) : [])
const intArr = (x: unknown, max = 20): number[] =>
  Array.isArray(x) ? x.filter((n): n is number => typeof n === 'number' && Number.isInteger(n) && n >= 0 && n < 100).slice(0, max) : []

function record<T>(x: unknown, each: (k: string, v: unknown) => T | null, max = 200): Record<string, T> {
  const out: Record<string, T> = {}
  if (!isObj(x)) return out
  for (const [k, v] of Object.entries(x).slice(0, max)) {
    const r = each(k, v)
    if (r) out[k] = r
  }
  return out
}

/* ── pieces ── */
export function sanitizeSettings(x: unknown): ObsSettings {
  const d = defaultSettings()
  if (!isObj(x)) return d
  const r = isObj(x.activeRule) ? x.activeRule : {}
  return {
    targetLang: 'nl',
    uiLang: 'ar',
    assistLang: oneOf(x.assistLang, ['ar', 'none'] as const, d.assistLang),
    motion: oneOf(x.motion, ['system', 'reduced', 'standard', 'expressive'] as const, d.motion),
    skin: oneOf(x.skin, ['observatory', 'classic'] as const, d.skin),
    sessionMinutes: ([20, 25, 30] as const).includes(x.sessionMinutes as 20) ? (x.sessionMinutes as 20 | 25 | 30) : d.sessionMinutes,
    audioAutoplay: bool(x.audioAutoplay, d.audioAutoplay),
    showDemo: bool(x.showDemo, d.showDemo),
    activeRule: {
      uses: int(r.uses, 1, 10, d.activeRule.uses),
      contexts: int(r.contexts, 1, 5, d.activeRule.contexts),
      days: int(r.days, 1, 7, d.activeRule.days),
      countSelfReports: bool(r.countSelfReports, false),
    },
  }
}

function sanitizeStep(x: unknown): StepRun | null {
  if (!isObj(x)) return null
  if (!STEP_KINDS.includes(x.kind as StepKind)) return null
  return {
    kind: x.kind as StepKind,
    estMin: num(x.estMin, 0, 120, 1),
    activeMs: num(x.activeMs, 0, 1000 * 60 * 60 * 6),
    startedAt: num(x.startedAt),
    doneAt: num(x.doneAt),
  }
}

function sanitizeRecallTarget(x: unknown): RecallTarget | null {
  if (!isObj(x)) return null
  const id = str(x.id, 120), nl = str(x.nl, 200), answer = str(x.answer, 120)
  if (!id || !nl || !answer) return null
  return {
    id, nl, answer,
    source: oneOf(x.source, ['expression', 'vocab', 'session'] as const, 'session'),
    ar: str(x.ar, 200),
    cue: str(x.cue, 400),
  }
}

export function sanitizeSession(x: unknown): SessionRun | null {
  if (!isObj(x)) return null
  const id = str(x.id, 120), itemId = str(x.itemId, 120), dayKey = day(x.dayKey)
  if (!id || !itemId || !dayKey) return null
  const steps = (Array.isArray(x.steps) ? x.steps : []).map(sanitizeStep)
  if (steps.length === 0 || steps.some((s) => !s)) return null
  const a = isObj(x.answers) ? x.answers : {}
  const rt = isObj(a.retell) ? a.retell : {}
  const run: SessionRun = {
    id, itemId, dayKey,
    createdAt: num(x.createdAt),
    updatedAt: num(x.updatedAt),
    stepIndex: int(x.stepIndex, 0, steps.length - 1),
    subIndex: int(x.subIndex, 0, 20),
    steps: steps as StepRun[],
    questionIds: strArr(x.questionIds, 5),
    wordIds: strArr(x.wordIds, 6),
    buildIds: strArr(x.buildIds, 4),
    recall: (Array.isArray(x.recall) ? x.recall : []).map(sanitizeRecallTarget).filter((t): t is RecallTarget => !!t).slice(0, 4),
    answers: {
      questions: record(a.questions, (_k, v): QuestionAnswer | null => isObj(v) ? {
        choice: str(v.choice, 8), tries: int(v.tries, 0, 20), correct: bool(v.correct), help: int(v.help, 0, 3),
      } : null, 10),
      words: record(a.words, (_k, v): WordAnswer | null => isObj(v) ? {
        typed: str(v.typed, 200), result: oneOf(v.result, TYPED, ''), tries: int(v.tries, 0, 20),
        own: str(v.own, 600), ownContext: v.ownContext === '' ? '' : ctx(v.ownContext),
        ownResult: oneOf(v.ownResult, ['', 'independent', 'copied', 'missing', 'too-short'] as const, ''),
      } : null, 10),
      builds: record(a.builds, (_k, v): BuildAnswer | null => isObj(v) ? {
        order: intArr(v.order), tries: int(v.tries, 0, 20), correct: bool(v.correct),
      } : null, 10),
      retell: {
        typed: str(rt.typed, 4000),
        recordingId: str(rt.recordingId, 120),
        durationSec: num(rt.durationSec, 0, 600),
        selfCheck: intArr(rt.selfCheck, 10),
        skipped: bool(rt.skipped),
      },
      recall: record(a.recall, (_k, v): RecallAnswer | null => isObj(v) ? {
        typed: str(v.typed, 200), result: oneOf(v.result, TYPED, ''), tries: int(v.tries, 0, 20),
      } : null, 10),
    },
    drafts: record(x.drafts, (_k, v) => (typeof v === 'string' ? v.slice(0, 4000) : null), 40),
    extension: oneOf(x.extension, ['none', 'offered', 'started', 'done'] as const, 'none'),
  }
  return run
}

function sanitizeHistory(x: unknown): SessionRecord | null {
  if (!isObj(x)) return null
  const id = str(x.id, 120), itemId = str(x.itemId, 120), dayKey = day(x.dayKey)
  if (!id || !itemId || !dayKey || !num(x.finishedAt)) return null
  return {
    id, itemId, dayKey,
    finishedAt: num(x.finishedAt),
    estMin: num(x.estMin, 0, 240),
    actualMin: num(x.actualMin, 0, 600),
    questions: int(x.questions, 0, 10),
    firstTry: int(x.firstTry, 0, 10),
    builds: int(x.builds, 0, 10),
    buildsRight: int(x.buildsRight, 0, 10),
    saved: strArr(x.saved, 10),
    retell: oneOf(x.retell, ['typed', 'recorded', 'both', 'skipped'] as const, 'skipped'),
    recalled: int(x.recalled, 0, 10),
    recallTotal: int(x.recallTotal, 0, 10),
  }
}

function sanitizeUse(x: unknown): ExpressionUse | null {
  if (!isObj(x)) return null
  const id = str(x.id, 120), dayKey = day(x.dayKey), at = num(x.at)
  if (!id || !dayKey || !at) return null
  return {
    id, at, dayKey,
    kind: oneOf(x.kind, ['practised', 'independent', 'self-report'] as const, 'practised'),
    context: ctx(x.context),
    text: str(x.text, 600),
    source: oneOf(x.source, ['lesson', 'practice', 'words', 'retell', 'recall'] as const, 'lesson'),
  }
}

function sanitizeExpression(k: string, x: unknown): ExpressionRecord | null {
  if (!isObj(x)) return null
  const nl = str(x.nl, 200)
  if (!nl || !k) return null
  const uses = (Array.isArray(x.uses) ? x.uses : []).map(sanitizeUse).filter((u): u is ExpressionUse => !!u)
  return {
    id: k, nl,
    ar: str(x.ar, 200),
    example: str(x.example, 600),
    itemId: str(x.itemId, 120),
    seenAt: num(x.seenAt),
    savedAt: num(x.savedAt),
    uses: uses.slice(-CAPS.uses),
  }
}

function sanitizeAttempt(x: unknown): Attempt | null {
  if (!isObj(x)) return null
  const id = str(x.id, 120), at = num(x.at)
  if (!id || !at) return null
  return {
    id, at,
    kind: oneOf(x.kind, ['retell', 'roleplay', 'sentence'] as const, 'sentence'),
    refId: str(x.refId, 120),
    text: str(x.text, 4000),
    recordingId: str(x.recordingId, 120),
    durationSec: num(x.durationSec, 0, 600),
  }
}

function sanitizeDifficulty(k: string, x: unknown): Difficulty | null {
  if (!isObj(x) || !k) return null
  return { key: k, count: int(x.count, 0, 9999), lastAt: num(x.lastAt), examples: strArr(x.examples, CAPS.examples).map((s) => s.slice(0, 300)) }
}

function sanitizeNote(x: unknown): Note | null {
  if (!isObj(x)) return null
  const id = str(x.id, 120)
  if (!id) return null
  return {
    id, text: str(x.text, 4000), ref: str(x.ref, 200),
    createdAt: num(x.createdAt), updatedAt: num(x.updatedAt), deleted: bool(x.deleted),
  }
}

function sanitizeRoleplay(x: unknown): RoleplayRun | null {
  if (!isObj(x)) return null
  const id = str(x.id, 120), scenarioId = str(x.scenarioId, 120)
  if (!id || !scenarioId) return null
  return {
    id, scenarioId,
    startedAt: num(x.startedAt), updatedAt: num(x.updatedAt),
    turns: (Array.isArray(x.turns) ? x.turns : []).filter(isObj).map((t) => ({
      i: int(t.i, 0, 20), text: str(t.text, 1000), recordingId: str(t.recordingId, 120), at: num(t.at),
    })).slice(0, 12),
    draft: str(x.draft, 1000),
    done: bool(x.done),
  }
}

function sanitizeRoleplaySummary(x: unknown): RoleplaySummary | null {
  if (!isObj(x)) return null
  const id = str(x.id, 120), scenarioId = str(x.scenarioId, 120)
  if (!id || !scenarioId || !num(x.finishedAt)) return null
  return { id, scenarioId, finishedAt: num(x.finishedAt), turns: int(x.turns, 0, 20), issues: strArr(x.issues, 12) }
}

function sanitizePlan(x: unknown): PlanPrefs {
  if (!isObj(x)) return defaultObs().plan
  const days = intArr(x.days, 7).filter((d) => d <= 6)
  return {
    days: Array.from(new Set(days)).sort(),
    focus: Array.from(new Set(strArr(x.focus, 8).filter((c) => CONTEXTS.includes(c as ContextKey)))) as ContextKey[],
    note: str(x.note, 1000),
  }
}

export function sanitizeObs(x: unknown): ObsState {
  if (!isObj(x)) return defaultObs()
  const list = <T>(v: unknown, f: (e: unknown) => T | null, cap: number): T[] =>
    (Array.isArray(v) ? v : []).map(f).filter((e): e is T => !!e).slice(-cap)
  return {
    v: 1,
    settings: sanitizeSettings(x.settings),
    session: sanitizeSession(x.session),
    deferred: list(x.deferred, sanitizeSession, CAPS.deferred),
    history: list(x.history, sanitizeHistory, CAPS.history),
    expressions: record(x.expressions, sanitizeExpression, CAPS.expressions),
    attempts: list(x.attempts, sanitizeAttempt, CAPS.attempts),
    difficulties: record(x.difficulties, sanitizeDifficulty, 60),
    notes: list(x.notes, sanitizeNote, CAPS.notes),
    roleplay: sanitizeRoleplay(x.roleplay),
    roleplays: list(x.roleplays, sanitizeRoleplaySummary, CAPS.roleplays),
    plan: sanitizePlan(x.plan),
    updatedAt: num(x.updatedAt),
  }
}

/* ── cloud merge ──────────────────────────────────────────────────────────
   Evidence never disappears in a merge:
   • history / attempts / roleplays: union by id
   • expressions: per id, union of uses by use id; earliest seen/saved kept
   • notes: per id, the later updatedAt wins (deletions are tombstones, so a
     note deleted on one device stays deleted)
   • difficulties: per key, max count, latest lastAt
   • settings, plan, live session, role-play: the newer device wins */
function unionById<T extends { id: string }>(a: T[], b: T[], order: (t: T) => number, cap: number): T[] {
  const m = new Map<string, T>()
  for (const t of a) m.set(t.id, t)
  for (const t of b) if (!m.has(t.id)) m.set(t.id, t)
  return Array.from(m.values()).sort((x, y) => order(x) - order(y)).slice(-cap)
}

const minNonZero = (x: number, y: number) => (x && y ? Math.min(x, y) : x || y)

export function mergeObs(xa: unknown, xb: unknown, bNewer: boolean): ObsState {
  const a = sanitizeObs(xa), b = sanitizeObs(xb)
  const newer = bNewer ? b : a
  const older = bNewer ? a : b

  const expressions: Record<string, ExpressionRecord> = { ...a.expressions }
  for (const [id, e] of Object.entries(b.expressions)) {
    const cur = expressions[id]
    if (!cur) { expressions[id] = e; continue }
    expressions[id] = {
      ...(bNewer ? e : cur),
      seenAt: minNonZero(cur.seenAt, e.seenAt),
      savedAt: minNonZero(cur.savedAt, e.savedAt),
      uses: unionById(cur.uses, e.uses, (u) => u.at, CAPS.uses),
    }
  }

  const notes = new Map<string, Note>()
  for (const n of [...a.notes, ...b.notes]) {
    const cur = notes.get(n.id)
    if (!cur || n.updatedAt > cur.updatedAt) notes.set(n.id, n)
  }

  const difficulties: Record<string, Difficulty> = { ...a.difficulties }
  for (const [k, d] of Object.entries(b.difficulties)) {
    const cur = difficulties[k]
    difficulties[k] = !cur ? d : {
      key: k,
      count: Math.max(cur.count, d.count),
      lastAt: Math.max(cur.lastAt, d.lastAt),
      examples: Array.from(new Set([...cur.examples, ...d.examples])).slice(-CAPS.examples),
    }
  }

  /* A session finished on one device must not come back as "unfinished" from
     the other one: drop any live/deferred run whose id is already history. */
  const history = unionById(a.history, b.history, (h) => h.finishedAt, CAPS.history)
  const finished = new Set(history.map((h) => h.id))
  const session = newer.session && !finished.has(newer.session.id) ? newer.session
    : older.session && !finished.has(older.session.id) && !newer.session ? older.session : null
  const deferred = unionById(a.deferred, b.deferred, (d) => d.createdAt, CAPS.deferred)
    .filter((d) => !finished.has(d.id) && d.id !== session?.id)

  const roleplays = unionById(a.roleplays, b.roleplays, (r) => r.finishedAt, CAPS.roleplays)
  const doneRp = new Set(roleplays.map((r) => r.id))
  const roleplay = newer.roleplay && !doneRp.has(newer.roleplay.id) ? newer.roleplay : null

  return {
    v: 1,
    settings: newer.settings,
    session,
    deferred,
    history,
    expressions,
    attempts: unionById(a.attempts, b.attempts, (t) => t.at, CAPS.attempts),
    difficulties,
    notes: Array.from(notes.values()).sort((x, y) => x.createdAt - y.createdAt).slice(-CAPS.notes),
    roleplay,
    roleplays,
    plan: newer.plan,
    updatedAt: Math.max(a.updatedAt, b.updatedAt),
  }
}

let seq = 0
/** Collision-safe enough for one learner across a few devices. */
export function uid(prefix: string, now: number): string {
  seq = (seq + 1) % 1000
  return `${prefix}-${now.toString(36)}-${seq.toString(36)}${Math.random().toString(36).slice(2, 6)}`
}
