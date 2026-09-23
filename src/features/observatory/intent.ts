/* ── Cross-workspace hand-off ───────────────────────────────────────────────
   "Practise this now" buttons in one workspace open an activity in another
   (e.g. an observation in My Learning starts a drill in Practice). The target
   reads the intent once on mount. Session-only by design: it is a click, not
   state worth persisting or syncing. */

export type Intent =
  | { kind: 'roleplay'; scenarioId: string }
  | { kind: 'drill'; rule: 'v2' | 'verb-final' }
  | { kind: 'recall' }
  | { kind: 'use-words' }
  | { kind: 'word'; id: string }
  | { kind: 'lesson' }

let pending: Intent | null = null

export function setIntent(i: Intent): void { pending = i }

export function takeIntent<K extends Intent['kind']>(...kinds: K[]): Extract<Intent, { kind: K }> | null {
  if (!pending || !kinds.includes(pending.kind as K)) return null
  const i = pending as Extract<Intent, { kind: K }>
  pending = null
  return i
}

export function peekIntent(): Intent | null { return pending }
