import type { ActiveRule, ExpressionRecord, ExpressionUse, ObsState, UseKind, ContextKey, ExpressionSeed, LessonItem } from './types'
import { CAPS, uid } from './state'

/* ── Evidence of learning ───────────────────────────────────────────────────
   Four honest stages, each earned by something the learner DID:
     seen        — the expression was shown in a lesson (opening ≠ knowing)
     practised   — recalled or completed in an exercise
     used        — at least one independent sentence (not a copy)
     active      — the editable rule: N independent uses across C contexts
                   on D different days (default 3 · 2 · 2)
   Self-reports ("I used it outside the app") are stored and shown, but only
   count toward "active" when the learner switches that on in the rule. */

export type Stage = 'seen' | 'practised' | 'used' | 'active'

export const STAGE_ORDER: Stage[] = ['seen', 'practised', 'used', 'active']

export const STAGE_AR: Record<Stage, string> = {
  seen: 'شوهِد',
  practised: 'تُدرِّب عليه',
  used: 'استُخدم باستقلال',
  active: 'نشِط',
}

export interface Evidence {
  stage: Stage
  practised: number
  independent: number
  selfReports: number
  contexts: ContextKey[]
  days: string[]
  /** What is still missing for "active", per rule dimension. */
  missing: { uses: number; contexts: number; days: number }
}

export function evidenceOf(rec: Pick<ExpressionRecord, 'uses'> | undefined, rule: ActiveRule): Evidence {
  const uses = rec?.uses ?? []
  const counted = uses.filter((u) => u.kind === 'independent' || (rule.countSelfReports && u.kind === 'self-report'))
  const contexts = Array.from(new Set(counted.map((u) => u.context)))
  const days = Array.from(new Set(counted.map((u) => u.dayKey))).sort()
  const independent = uses.filter((u) => u.kind === 'independent').length
  const practised = uses.filter((u) => u.kind === 'practised').length
  const selfReports = uses.filter((u) => u.kind === 'self-report').length
  const missing = {
    uses: Math.max(0, rule.uses - counted.length),
    contexts: Math.max(0, rule.contexts - contexts.length),
    days: Math.max(0, rule.days - days.length),
  }
  let stage: Stage = 'seen'
  if (practised > 0 || counted.length > 0) stage = 'practised'
  if (independent > 0) stage = 'used'
  if (!missing.uses && !missing.contexts && !missing.days) stage = 'active'
  return { stage, practised, independent, selfReports, contexts, days, missing }
}

/** Ensure a record exists for a seed (marks it seen). */
export function ensureExpression(o: ObsState, seed: ExpressionSeed, item: LessonItem | null, now: number): ObsState {
  if (o.expressions[seed.id]) return o
  const rec: ExpressionRecord = {
    id: seed.id, nl: seed.nl, ar: seed.ar, example: seed.example, itemId: item?.id ?? '',
    seenAt: now, savedAt: 0, uses: [],
  }
  return { ...o, expressions: { ...o.expressions, [seed.id]: rec } }
}

export function markSeen(o: ObsState, seeds: ExpressionSeed[], item: LessonItem, now: number): ObsState {
  return seeds.reduce((acc, s) => ensureExpression(acc, s, item, now), o)
}

export function saveExpression(o: ObsState, seed: ExpressionSeed, item: LessonItem | null, now: number, saved: boolean): ObsState {
  const base = ensureExpression(o, seed, item, now)
  const rec = base.expressions[seed.id]
  return { ...base, expressions: { ...base.expressions, [seed.id]: { ...rec, savedAt: saved ? (rec.savedAt || now) : 0 } } }
}

export function addUse(
  o: ObsState, id: string, kind: UseKind, context: ContextKey, text: string,
  source: ExpressionUse['source'], now: number, dayKey: string,
): ObsState {
  const rec = o.expressions[id]
  if (!rec) return o
  const use: ExpressionUse = { id: uid('u', now), at: now, dayKey, kind, context, text: text.slice(0, 600), source }
  return {
    ...o,
    expressions: { ...o.expressions, [id]: { ...rec, uses: [...rec.uses, use].slice(-CAPS.uses) } },
  }
}

export function removeUse(o: ObsState, id: string, useId: string): ObsState {
  const rec = o.expressions[id]
  if (!rec) return o
  return { ...o, expressions: { ...o.expressions, [id]: { ...rec, uses: rec.uses.filter((u) => u.id !== useId) } } }
}

export function stageCounts(o: ObsState): Record<Stage, number> {
  const out: Record<Stage, number> = { seen: 0, practised: 0, used: 0, active: 0 }
  for (const rec of Object.values(o.expressions)) out[evidenceOf(rec, o.settings.activeRule).stage]++
  return out
}
