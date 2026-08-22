import type { SkillKey, State } from '@/store/types'

/**
 * محرّك الامتحان الكامل — منطق خالص، بلا واجهة وبلا مؤثّرات جانبية.
 *
 * Every function here is pure and takes `now` as an argument instead of reading
 * the clock. That is what makes the whole engine testable, and it is also what
 * keeps it out of trouble with the project rule against calling Date.now()
 * during render: the component passes in a value from useNow().
 *
 * The session never stores answers. Answers already live in examReading /
 * examListening / examWriting / examSpeaking, which are persisted and synced,
 * so a reload or a crash mid-exam loses nothing and resume comes for free.
 */

export const SKILL_ORDER: readonly SkillKey[] = ['reading', 'listening', 'writing', 'speaking']

export const SKILL_AR: Record<SkillKey, string> = {
  reading: 'القراءة',
  listening: 'الاستماع',
  writing: 'الكتابة',
  speaking: 'التحدّث',
}

export const SKILL_NL: Record<SkillKey, string> = {
  reading: 'Lezen',
  listening: 'Luisteren',
  writing: 'Schrijven',
  speaking: 'Spreken',
}

/**
 * دقائق التدريب لكل مهارة.
 *
 * These are practice defaults chosen to be roughly exam-like, NOT official DUO
 * timings — the real ones change and are published per exam. The user can
 * override them, and the UI must label them as practice.
 */
export const MOCK_MINUTES: Record<SkillKey, number> = {
  reading: 100,
  listening: 45,
  writing: 90,
  speaking: 30,
}

export interface MockSession {
  id: string
  /** The skill being worked on right now. */
  skill: SkillKey
  /** Order the skills are taken in. Always a permutation of SKILL_ORDER. */
  order: SkillKey[]
  startedAt: number
  /** Deadline for the CURRENT skill only. */
  endsAt: number
  /** Scores of the skills already handed in. */
  scores: Partial<Record<SkillKey, number>>
  /** Per-skill minutes actually used for this run, so a resumed run keeps them. */
  minutes: Record<SkillKey, number>
}

export interface SkillReportRow {
  skill: SkillKey
  score: number
  /** Best score before this attempt, for the comparison column. */
  prevBest: number
  delta: number
  passed: boolean
}

export interface MockReport {
  rows: SkillReportRow[]
  total: number
  passedCount: number
  /** Weakest skill of this attempt — what the user should study next. */
  weakest: SkillKey | null
}

function clampPct(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)))
}

export function createSession(
  now: number,
  order: SkillKey[] = [...SKILL_ORDER],
  minutes: Record<SkillKey, number> = MOCK_MINUTES,
): MockSession {
  const first = order[0]
  return {
    id: `mock-${now}`,
    skill: first,
    order: [...order],
    startedAt: now,
    endsAt: now + minutes[first] * 60_000,
    scores: {},
    minutes: { ...minutes },
  }
}

export function remainingMs(s: MockSession, now: number): number {
  return Math.max(0, s.endsAt - now)
}

export function isExpired(s: MockSession, now: number): boolean {
  return now >= s.endsAt
}

/** The skill after the current one, or null when the current one is the last. */
export function nextSkill(s: MockSession): SkillKey | null {
  const i = s.order.indexOf(s.skill)
  return i >= 0 && i + 1 < s.order.length ? s.order[i + 1] : null
}

export function isFinished(s: MockSession): boolean {
  return s.order.every((k) => s.scores[k] !== undefined)
}

/**
 * Hands in the current skill with `score` and moves to the next one.
 * Returns the same session shape; the caller decides whether to keep it
 * (unfinished) or turn it into a report (finished).
 */
export function advance(s: MockSession, score: number, now: number): MockSession {
  const scores = { ...s.scores, [s.skill]: clampPct(score) }
  const next = nextSkill(s)
  if (!next) return { ...s, scores }
  return {
    ...s,
    skill: next,
    endsAt: now + s.minutes[next] * 60_000,
    scores,
  }
}

/** Progress as a fraction of skills handed in, for a progress bar. */
export function progressPct(s: MockSession): number {
  const done = s.order.filter((k) => s.scores[k] !== undefined).length
  return Math.round((done / s.order.length) * 100)
}

/**
 * Score of a skill computed from the answers already in the store.
 * Returns null when the user has not produced anything scoreable yet, so the
 * UI can say "no answers yet" instead of recording a misleading zero.
 */
export function scoreFromState(
  state: Pick<State, 'examReading' | 'examListening' | 'examWriting' | 'examSpeaking'>,
  skill: SkillKey,
  items: { reading: { id: string; questions: { correct: number }[] }[]; listening: { id: string; questions: { correct: number }[] }[] },
): number | null {
  if (skill === 'reading' || skill === 'listening') {
    const src = skill === 'reading' ? items.reading : items.listening
    const answers = skill === 'reading' ? state.examReading : state.examListening
    const done = src.filter((it) => Object.keys(answers[it.id] ?? {}).length >= it.questions.length)
    if (done.length === 0) return null
    const pcts = done.map((it) => {
      const a = answers[it.id] ?? {}
      const correct = it.questions.reduce((n, q, i) => n + (a[i] === q.correct ? 1 : 0), 0)
      return (correct / it.questions.length) * 100
    })
    return clampPct(pcts.reduce((x, y) => x + y, 0) / pcts.length)
  }

  if (skill === 'writing') {
    const vals = Object.values(state.examWriting).map((w) => w?.score ?? 0).filter((n) => n > 0)
    if (vals.length === 0) return null
    return clampPct(vals.reduce((x, y) => x + y, 0) / vals.length)
  }

  const vals = Object.values(state.examSpeaking).map((sp) => sp?.score ?? 0).filter((n) => n > 0)
  if (vals.length === 0) return null
  return clampPct(vals.reduce((x, y) => x + y, 0) / vals.length)
}

export function buildReport(
  s: MockSession,
  prev: State['skill'],
  passThreshold: number,
): MockReport {
  const rows: SkillReportRow[] = s.order
    .filter((k) => s.scores[k] !== undefined)
    .map((k) => {
      const score = clampPct(s.scores[k] as number)
      const prevBest = clampPct(prev[k]?.best ?? 0)
      return { skill: k, score, prevBest, delta: score - prevBest, passed: score >= passThreshold }
    })

  const total = rows.length ? clampPct(rows.reduce((n, r) => n + r.score, 0) / rows.length) : 0
  let weakest: SkillKey | null = null
  let min = 101
  for (const r of rows) if (r.score < min) { min = r.score; weakest = r.skill }

  return { rows, total, passedCount: rows.filter((r) => r.passed).length, weakest }
}

/** mm:ss for the countdown. Never negative, never Arabic-Indic digits. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const sec = total % 60
  const pad = (n: number) => String(n).padStart(2, '0')
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(sec)}` : `${pad(m)}:${pad(sec)}`
}

/** Guards a session parsed from storage or the cloud. */
export function isValidSession(v: unknown): v is MockSession {
  if (typeof v !== 'object' || v === null) return false
  const o = v as Record<string, unknown>
  if (typeof o.id !== 'string' || typeof o.startedAt !== 'number' || typeof o.endsAt !== 'number') return false
  if (!Array.isArray(o.order) || o.order.length === 0) return false
  if (!o.order.every((k) => SKILL_ORDER.includes(k as SkillKey))) return false
  if (!SKILL_ORDER.includes(o.skill as SkillKey)) return false
  if (!o.order.includes(o.skill)) return false
  if (typeof o.minutes !== 'object' || o.minutes === null) return false
  if (typeof o.scores !== 'object' || o.scores === null) return false
  return true
}
