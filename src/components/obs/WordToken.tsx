import { motion } from 'framer-motion'
import type { ReactNode } from 'react'
import { useMotionLevel } from '@/hooks/useObs'
import { layoutTransition } from '@/features/observatory/motion'

/* A word object: satin tile, real text. Interactive tokens are buttons with a
   layoutId, so opening one expands spatially into its detail panel (the
   detail uses the same layoutId). Decorative tokens are aria-hidden spans —
   the words they show are always also present as accessible text nearby. */

interface Props {
  nl: string
  gloss?: string
  tone?: 'paper' | 'cobalt' | 'mint'
  size?: 'md' | 'sm'
  badge?: ReactNode
  onOpen?: () => void
  layoutId?: string
  label?: string
  className?: string
  style?: React.CSSProperties
}

export function WordToken({ nl, gloss, tone = 'paper', size = 'md', badge, onOpen, layoutId, label, className, style }: Props) {
  const level = useMotionLevel()
  const cls = ['o-token', tone !== 'paper' ? `o-token--${tone}` : '', size === 'sm' ? 'o-token--sm' : '', className ?? ''].filter(Boolean).join(' ')
  const body = (
    <>
      <span className="o-token__word" lang="nl">{nl}</span>
      {gloss && <span className="o-token__gloss">{gloss}</span>}
      {badge && <span className="o-token__stage">{badge}</span>}
    </>
  )
  if (!onOpen) {
    return <span className={cls} style={style} aria-hidden="true">{body}</span>
  }
  return (
    <motion.button
      type="button"
      layoutId={level === 'reduced' ? undefined : layoutId}
      transition={layoutTransition(level, 'panel')}
      className="o-token-btn"
      style={style}
      onClick={onOpen}
      aria-label={label}
    >
      <span className={cls}>{body}</span>
    </motion.button>
  )
}
