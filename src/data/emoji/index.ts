import registry from './registry.json'

/* Typed view of the emoji registry (registry.json is the source of truth —
   it also drives the font subset and the regression test). */

export type EmojiRole =
  | 'status' | 'action' | 'topic' | 'time' | 'progress'
  | 'celebration' | 'mascot' | 'weather' | 'situation' | 'grammar'

export interface EmojiEntry {
  /** Stable name used by <Emoji id="…">. */
  id: string
  /** The Unicode sequence exactly as it must appear in source. */
  char: string
  sequence: string
  role: EmojiRole
  /** Arabic meaning — the accessible name when the emoji stands alone. */
  label: string
  /** Vector master of the same artwork the font draws. */
  asset: string
  usedIn: string[]
}

export const EMOJI = registry.emoji as EmojiEntry[]

const BY_ID = new Map(EMOJI.map((e) => [e.id, e]))

export function emojiById(id: string): EmojiEntry | undefined {
  return BY_ID.get(id)
}
