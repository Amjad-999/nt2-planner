import { emojiById } from '@/data/emoji'

interface Props {
  /** Registry id, e.g. "fire". */
  id: string
  /** Meaningful emoji are announced with their Arabic label; decorative ones are hidden. */
  decorative?: boolean
  /** Overrides the registry label for this one use. */
  label?: string
  className?: string
}

/**
 * One emoji from the registry, drawn by the local emoji face. Use it when an
 * emoji stands on its own (a status glyph, a control). Emoji inside a sentence
 * need nothing — the same face draws them.
 */
export function Emoji({ id, decorative, label, className }: Props) {
  const e = emojiById(id)
  if (!e) return null
  const cls = ['emoji', className].filter(Boolean).join(' ')
  if (decorative) return <span className={cls} aria-hidden="true">{e.char}</span>
  return <span className={cls} role="img" aria-label={label ?? e.label}>{e.char}</span>
}
