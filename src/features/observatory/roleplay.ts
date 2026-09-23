import type { ObsState, RoleplayScenario, RoleplayRun } from './types'
import { CAPS, uid } from './state'
import { checkTurn, type Issue } from './checks'
import { classifyOwnSentence } from './evaluate'
import { addUse, ensureExpression } from './evidence'
import { noteDifficulty } from './insights'
import { expressionSeed } from '@/data/observatory/items'

/* ── Role-play runs ─────────────────────────────────────────────────────────
   Continuity first: turns are only collected while the conversation runs.
   Issues are computed once, at the end, and turned into evidence
   (attempts, recurring difficulties, independent uses of saved expressions). */

/** Keep an unfinished conversation's words before replacing it. */
function archive(o: ObsState, run: RoleplayRun, now: number): ObsState {
  const texts = run.turns.filter((t) => t.text.trim() || t.recordingId)
  if (!texts.length) return o
  const attempts = [...o.attempts, ...texts.map((t, i) => ({
    id: uid('a', now + i), at: t.at || now, kind: 'roleplay' as const, refId: run.scenarioId, text: t.text, recordingId: t.recordingId, durationSec: 0,
  }))].slice(-CAPS.attempts)
  return { ...o, attempts }
}

export function startRoleplay(o: ObsState, scenarioId: string, now: number): ObsState {
  const base = o.roleplay && !o.roleplay.done ? archive(o, o.roleplay, now) : o
  return { ...base, roleplay: { id: uid('rp', now), scenarioId, startedAt: now, updatedAt: now, turns: [], draft: '', done: false }, updatedAt: now }
}

export function setRoleplayDraft(o: ObsState, draft: string, now: number): ObsState {
  if (!o.roleplay || o.roleplay.draft === draft) return o
  return { ...o, roleplay: { ...o.roleplay, draft: draft.slice(0, 1000), updatedAt: now }, updatedAt: now }
}

export function addTurn(o: ObsState, text: string, recordingId: string, now: number): ObsState {
  const r = o.roleplay
  if (!r || r.done) return o
  const turn = { i: r.turns.length, text: text.trim().slice(0, 1000), recordingId, at: now }
  return { ...o, roleplay: { ...r, turns: [...r.turns, turn], draft: '', updatedAt: now }, updatedAt: now }
}

/** Undo the last reply (a correction the learner can make before finishing). */
export function undoTurn(o: ObsState, now: number): ObsState {
  const r = o.roleplay
  if (!r || r.done || !r.turns.length) return o
  const last = r.turns[r.turns.length - 1]
  return { ...o, roleplay: { ...r, turns: r.turns.slice(0, -1), draft: last.text, updatedAt: now }, updatedAt: now }
}

export function reviewIssues(sc: RoleplayScenario, run: RoleplayRun): Issue[][] {
  return sc.turns.map((spec, i) => {
    const t = run.turns[i]
    return t && t.text ? checkTurn(t.text, spec, sc.formal) : []
  })
}

export function finishRoleplay(o: ObsState, sc: RoleplayScenario, now: number, dayKey: string): ObsState {
  const r = o.roleplay
  if (!r || r.done) return o
  const issues = reviewIssues(sc, r)
  let x: ObsState = o
  const keys: string[] = []
  issues.forEach((list, i) => list.forEach((iss) => {
    if (!keys.includes(iss.key)) keys.push(iss.key)
    x = noteDifficulty(x, iss.key, r.turns[i]?.text ?? '', now)
  }))
  // Independent use: a reply of the learner's own that uses a linked expression.
  const shown = sc.turns.flatMap((t) => [t.partnerNl, t.modelNl, t.hintNl])
  for (const id of sc.expressionIds) {
    const found = expressionSeed(id)
    if (!found) continue
    const hit = r.turns.find((t) => t.text && classifyOwnSentence(t.text, found.seed, shown) === 'independent')
    if (hit) x = addUse(ensureExpression(x, found.seed, found.item, now), id, 'independent', sc.context, hit.text, 'practice', now, dayKey)
  }
  x = archive(x, r, now)
  return {
    ...x,
    roleplay: { ...r, done: true, updatedAt: now },
    roleplays: [...x.roleplays, { id: r.id, scenarioId: sc.id, finishedAt: now, turns: r.turns.length, issues: keys }].slice(-CAPS.roleplays),
    updatedAt: now,
  }
}

export function closeRoleplay(o: ObsState, now: number): ObsState {
  if (!o.roleplay?.done) return o
  return { ...o, roleplay: null, updatedAt: now }
}
