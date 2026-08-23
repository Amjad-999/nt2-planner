import type { BlockKind } from '@/features/program/types'

/** لون وأيقونة كل نوع كتلة — مشتركة بين مكوّنات البرنامج. */
export const BLOCK_STYLE: Record<BlockKind, { color: string; soft: string; icon: string }> = {
  lesson:     { color: 'var(--blue)',   soft: 'var(--blue-l)',   icon: '📖' },
  recall:     { color: 'var(--orange)', soft: 'var(--orange-l)', icon: '🧠' },
  shortBreak: { color: 'var(--green)',  soft: 'var(--green-l)',  icon: '☕' },
  longBreak:  { color: 'var(--green)',  soft: 'var(--green-l)',  icon: '🌿' },
  review:     { color: 'var(--amber)',  soft: 'var(--amber-l)',  icon: '🔁' },
  sweep:      { color: 'var(--purple)', soft: 'var(--purple-l)', icon: '🧹' },
  mock:       { color: 'var(--red)',    soft: 'var(--red-l)',    icon: '⏱️' },
  weakRepair: { color: 'var(--red)',    soft: 'var(--red-l)',    icon: '🔧' },
  close:      { color: 'var(--teal)',   soft: 'var(--teal-l)',   icon: '✅' },
  free:       { color: 'var(--orange)', soft: 'var(--orange-l)', icon: '🕐' },
}
