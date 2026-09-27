import type { SkillKey } from '@/store/types'

/**
 * A one-shot "open this screen in this state" hand-off between tabs.
 *
 * A button that says "راجع 12 كلمة الآن" has to open the review session, not
 * the word list the learner then has to search for a second button in. Tabs
 * are separate lazily-loaded sections with their own local view state, so the
 * sender leaves an intent here and the receiver reads it once, on mount.
 *
 * Deliberately not store state: it is never persisted, never synced, and is
 * cleared after the first read — a reload or a later visit opens the default.
 *
 * Read with peek (pure, safe inside a useState initializer that StrictMode
 * runs twice) and clear in an effect.
 */

export type NavIntent =
  | { to: 'vocab'; view: 'review' | 'themas' }
  | { to: 'exam'; view: SkillKey | 'mock' }

let pending: NavIntent | null = null

export function setNavIntent(intent: NavIntent): void {
  pending = intent
}

/** The pending intent for `to`, without clearing it. */
export function peekNavIntent<T extends NavIntent['to']>(to: T): Extract<NavIntent, { to: T }> | null {
  return pending && pending.to === to ? (pending as Extract<NavIntent, { to: T }>) : null
}

export function clearNavIntent(to: NavIntent['to']): void {
  if (pending?.to === to) pending = null
}
