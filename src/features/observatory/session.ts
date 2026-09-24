import type {
  ObsState, SessionRun, StepRun, StepKind, LessonItem, SessionRecord, RecallTarget, SessionLength,
  QuestionAnswer, WordAnswer, BuildAnswer, RecallAnswer, RetellAnswer,
} from './types'
import { CAPS, uid } from './state'
import { todayKey } from '@/lib/utils'

/* ── The daily session: plan, position, progression, completion ────────────
   A session is one item worked through seven steps. Position (step + sub
   index), every answer and every unsent draft live in the run, so leaving
   the lesson — or closing the app — never loses work. Time has two faces
   kept apart on purpose: `estMin` (planned) and `activeMs` (measured while
   the lesson is on screen and the learner is interacting). */

export const STEP_ORDER: StepKind[] = ['input', 'questions', 'words', 'build', 'retell', 'recall', 'review']

export const STEP_AR: Record<StepKind, string> = {
  input: 'استمع أو اقرأ',
  questions: 'أسئلة الفهم',
  words: 'كلمات وتعابير',
  build: 'بناء الجمل',
  retell: 'أعد بكلماتك',
  recall: 'تذكّر ما سبق',
  review: 'مراجعة الجلسة',
}

export const STEP_NL: Record<StepKind, string> = {
  input: 'Luisteren & lezen',
  questions: 'Begrijpen',
  words: 'Woorden',
  build: 'Zinnen bouwen',
  retell: 'Navertellen',
  recall: 'Herhalen',
  review: 'Terugblik',
}

/** Planned minutes per unit. Deliberately generous — the pace ratio below
 *  corrects them from the learner's own measured sessions. */
export const EST = { read: 4, listen: 5, question: 1.5, word: 1.5, build: 1.5, retell: 3, recall: 1, review: 1 }

export function plannedCounts(minutes: SessionLength): { q: number; w: number; b: number } {
  if (minutes === 20) return { q: 3, w: 2, b: 2 }
  return { q: 3, w: 4, b: 2 }
}

function buildSteps(item: LessonItem, c: { q: number; w: number; b: number }, recall: number): StepRun[] {
  const est: Record<StepKind, number> = {
    input: item.kind === 'listen' ? EST.listen : EST.read,
    questions: c.q * EST.question,
    words: c.w * EST.word,
    build: c.b * EST.build,
    retell: EST.retell,
    recall: Math.max(1, recall) * EST.recall,
    review: EST.review,
  }
  return STEP_ORDER.map((kind) => ({ kind, estMin: est[kind], activeMs: 0, startedAt: 0, doneAt: 0 }))
}

export function estTotal(run: Pick<SessionRun, 'steps'>): number {
  return Math.round(run.steps.reduce((s, x) => s + x.estMin, 0))
}

export function activeMinutes(run: Pick<SessionRun, 'steps'>): number {
  return run.steps.reduce((s, x) => s + x.activeMs, 0) / 60000
}

export function remainingEst(run: SessionRun): number {
  return Math.round(run.steps.filter((s) => !s.doneAt).reduce((s, x) => s + x.estMin, 0))
}

/**
 * Median actual/estimated ratio over the last five sessions long enough to
 * mean something. null until three exist — before that the plain estimate
 * is shown and labelled as an estimate.
 */
export function paceRatio(history: SessionRecord[]): number | null {
  const r = history.filter((h) => h.actualMin >= 3 && h.estMin > 0).slice(-5).map((h) => h.actualMin / h.estMin).sort((a, b) => a - b)
  if (r.length < 3) return null
  const mid = r[Math.floor(r.length / 2)]
  return Math.min(1.8, Math.max(0.6, mid))
}

/** Next item in the fixed sequence that was never finished; then the one finished longest ago. */
export function pickItemId(o: ObsState, items: LessonItem[]): string {
  const doneAt = new Map<string, number>()
  for (const h of o.history) doneAt.set(h.itemId, Math.max(doneAt.get(h.itemId) ?? 0, h.finishedAt))
  const fresh = items.find((i) => !doneAt.has(i.id))
  if (fresh) return fresh.id
  return [...items].sort((a, b) => (doneAt.get(a.id) ?? 0) - (doneAt.get(b.id) ?? 0))[0]?.id ?? items[0].id
}

export interface VocabLike { id: string; dutch: string; arabic: string; example: string; due: number }

function gap(sentence: string, word: string): string {
  if (!sentence) return ''
  const re = new RegExp(word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  return re.test(sentence) ? sentence.replace(re, '___') : ''
}

/**
 * Two retrieval targets, most useful first:
 *  1. expressions practised in EARLIER sessions (other items), least recently used
 *  2. the learner's own vocabulary list, due words first
 *  3. on a first session: this item's own expressions — recalled at the end
 *     after other work, which is still genuine delayed retrieval
 */
export function pickRecall(o: ObsState, item: LessonItem, vocab: VocabLike[], count = 2): RecallTarget[] {
  const out: RecallTarget[] = []
  const lastUse = (id: string) => Math.max(0, ...(o.expressions[id]?.uses ?? []).map((u) => u.at))
  const earlier = Object.values(o.expressions)
    .filter((e) => e.itemId && e.itemId !== item.id && e.uses.length > 0)
    .sort((a, b) => lastUse(a.id) - lastUse(b.id))
  for (const e of earlier) {
    if (out.length >= count) break
    out.push({ id: e.id, source: 'expression', nl: e.nl, ar: e.ar, cue: '', answer: e.nl })
  }
  const vs = [...vocab].filter((v) => v.dutch && v.arabic).sort((a, b) => (a.due ?? 0) - (b.due ?? 0))
  for (const v of vs) {
    if (out.length >= count) break
    out.push({ id: 'v:' + v.id, source: 'vocab', nl: v.dutch, ar: v.arabic, cue: gap(v.example, v.dutch), answer: v.dutch })
  }
  for (const s of item.expressions) {
    if (out.length >= count) break
    out.push({ id: s.id, source: 'session', nl: s.nl, ar: s.ar, cue: s.clozeNl, answer: s.answer })
  }
  return out.slice(0, count)
}

const emptyRetell = (): RetellAnswer => ({ typed: '', recordingId: '', durationSec: 0, selfCheck: [], skipped: false })

export function newRun(item: LessonItem, o: ObsState, vocab: VocabLike[], now: number, dayKey: string): SessionRun {
  const c = plannedCounts(o.settings.sessionMinutes)
  const recall = pickRecall(o, item, vocab)
  return {
    id: uid('s', now),
    itemId: item.id,
    dayKey,
    createdAt: now,
    updatedAt: now,
    stepIndex: 0,
    subIndex: 0,
    steps: buildSteps(item, c, recall.length),
    questionIds: item.questions.slice(0, c.q).map((q) => q.id),
    wordIds: item.expressions.slice(0, c.w).map((e) => e.id),
    buildIds: item.builds.slice(0, c.b).map((b) => b.id),
    recall,
    answers: { questions: {}, words: {}, builds: {}, retell: emptyRetell(), recall: {} },
    drafts: {},
    extension: 'none',
  }
}

/** Start today's session. An unfinished run from another day is parked, never dropped. */
export function startSession(o: ObsState, item: LessonItem, vocab: VocabLike[], now: number, dayKey: string): ObsState {
  const deferred = o.session ? [o.session, ...o.deferred].slice(0, CAPS.deferred) : o.deferred
  return { ...o, session: newRun(item, o, vocab, now, dayKey), deferred, updatedAt: now }
}

export function resumeDeferred(o: ObsState, id: string, now: number): ObsState {
  const run = o.deferred.find((d) => d.id === id)
  if (!run) return o
  const rest = o.deferred.filter((d) => d.id !== id)
  const deferred = o.session ? [o.session, ...rest].slice(0, CAPS.deferred) : rest
  return { ...o, session: { ...run, updatedAt: now }, deferred, updatedAt: now }
}

/** "Not today": move the live run to the parked list without losing anything. */
export function parkSession(o: ObsState, now: number): ObsState {
  if (!o.session) return o
  return { ...o, session: null, deferred: [o.session, ...o.deferred].slice(0, CAPS.deferred), updatedAt: now }
}

export function discardDeferred(o: ObsState, id: string, now: number): ObsState {
  return { ...o, deferred: o.deferred.filter((d) => d.id !== id), updatedAt: now }
}

/* ── position & timing ── */

export function patchRun(o: ObsState, now: number, fn: (r: SessionRun) => SessionRun): ObsState {
  if (!o.session) return o
  return { ...o, session: { ...fn(o.session), updatedAt: now }, updatedAt: now }
}

export function touchStep(o: ObsState, now: number): ObsState {
  const r = o.session
  if (!r || r.steps[r.stepIndex].startedAt) return o
  return patchRun(o, now, (run) => ({
    ...run, steps: run.steps.map((s, i) => (i === run.stepIndex ? { ...s, startedAt: now } : s)),
  }))
}

export function addActive(o: ObsState, ms: number, now: number): ObsState {
  if (!o.session || ms <= 0) return o
  return patchRun(o, now, (run) => ({
    ...run, steps: run.steps.map((s, i) => (i === run.stepIndex ? { ...s, activeMs: s.activeMs + ms } : s)),
  }))
}

export function setSub(o: ObsState, sub: number, now: number): ObsState {
  return patchRun(o, now, (r) => ({ ...r, subIndex: Math.max(0, sub) }))
}

export function completeStep(o: ObsState, now: number): ObsState {
  return patchRun(o, now, (r) => {
    const steps = r.steps.map((s, i) => (i === r.stepIndex ? { ...s, doneAt: s.doneAt || now, startedAt: s.startedAt || now } : s))
    const next = Math.min(steps.length - 1, r.stepIndex + 1)
    return { ...r, steps, stepIndex: next, subIndex: 0 }
  })
}

/** Revisit a finished step without changing progress (read-only review happens in the UI). */
export function isStepDone(r: SessionRun, kind: StepKind): boolean {
  return !!r.steps.find((s) => s.kind === kind)?.doneAt
}

/* ── answers ── */

export function setDraft(o: ObsState, key: string, value: string, now: number): ObsState {
  if (!o.session || o.session.drafts[key] === value) return o
  return patchRun(o, now, (r) => ({ ...r, drafts: { ...r.drafts, [key]: value.slice(0, 4000) } }))
}

export function recordQuestion(o: ObsState, qid: string, a: QuestionAnswer, now: number): ObsState {
  return patchRun(o, now, (r) => ({ ...r, answers: { ...r.answers, questions: { ...r.answers.questions, [qid]: a } } }))
}

export function recordWord(o: ObsState, wid: string, a: Partial<WordAnswer>, now: number): ObsState {
  return patchRun(o, now, (r) => {
    const cur: WordAnswer = r.answers.words[wid] ?? { typed: '', result: '', tries: 0, own: '', ownContext: '', ownResult: '' }
    return { ...r, answers: { ...r.answers, words: { ...r.answers.words, [wid]: { ...cur, ...a } } } }
  })
}

export function recordBuild(o: ObsState, bid: string, a: BuildAnswer, now: number): ObsState {
  return patchRun(o, now, (r) => ({ ...r, answers: { ...r.answers, builds: { ...r.answers.builds, [bid]: a } } }))
}

export function recordRetell(o: ObsState, a: Partial<RetellAnswer>, now: number): ObsState {
  return patchRun(o, now, (r) => ({ ...r, answers: { ...r.answers, retell: { ...r.answers.retell, ...a } } }))
}

export function recordRecall(o: ObsState, tid: string, a: RecallAnswer, now: number): ObsState {
  return patchRun(o, now, (r) => ({ ...r, answers: { ...r.answers, recall: { ...r.answers.recall, [tid]: a } } }))
}

/* ── completion ── */

export function summarise(run: SessionRun, savedIds: string[], now: number): SessionRecord {
  const qa = run.questionIds.map((id) => run.answers.questions[id]).filter(Boolean)
  const ba = run.buildIds.map((id) => run.answers.builds[id]).filter(Boolean)
  const rt = run.answers.retell
  const recalled = run.recall.filter((t) => ['correct', 'close'].includes(run.answers.recall[t.id]?.result ?? '')).length
  return {
    id: run.id,
    itemId: run.itemId,
    dayKey: run.dayKey,
    finishedAt: now,
    estMin: estTotal(run),
    actualMin: Math.round(activeMinutes(run) * 10) / 10,
    questions: run.questionIds.length,
    firstTry: qa.filter((a) => a.correct && a.tries === 1).length,
    builds: run.buildIds.length,
    buildsRight: ba.filter((a) => a.correct).length,
    saved: savedIds,
    retell: rt.skipped ? 'skipped' : rt.typed && rt.recordingId ? 'both' : rt.recordingId ? 'recorded' : rt.typed ? 'typed' : 'skipped',
    recalled,
    recallTotal: run.recall.length,
  }
}

export function finishSession(o: ObsState, savedIds: string[], now: number): { o: ObsState; record: SessionRecord | null } {
  const run = o.session
  if (!run) return { o, record: null }
  const record = summarise(run, savedIds, now)
  return {
    o: { ...o, session: null, history: [...o.history, record].slice(-CAPS.history), updatedAt: now },
    record,
  }
}

/** Minutes actually spent today (finished sessions + the live one). */
export function minutesToday(o: ObsState, dayKey: string): number {
  const done = o.history.filter((h) => todayKey(new Date(h.finishedAt)) === dayKey)
    .reduce((s, h) => s + h.actualMin, 0)
  const live = o.session && todayKey(new Date(o.session.updatedAt)) === dayKey ? activeMinutes(o.session) : 0
  return Math.round((done + live) * 10) / 10
}

/** "أسئلة الفهم — 2 من 3": where the learner is, in words. */
export function stepLabel(run: SessionRun): string {
  const s = run.steps[run.stepIndex]
  const n = s.kind === 'questions' ? run.questionIds.length : s.kind === 'words' ? run.wordIds.length
    : s.kind === 'build' ? run.buildIds.length : s.kind === 'recall' ? run.recall.length : 0
  return n > 1 ? `${STEP_AR[s.kind]} — ${Math.min(run.subIndex + 1, n)} من ${n}` : STEP_AR[s.kind]
}
