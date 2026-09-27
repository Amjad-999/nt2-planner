import { WordToken } from './WordToken'
import type { ReactNode } from 'react'

/* ── Context constellation ──────────────────────────────────────────────────
   One centre (the topic or an expression), up to four word objects around it,
   and the real-life contexts they connect to. The links carry meaning: a
   word is joined to the situations where the learner can use it. Lines are
   SVG (non-scaling stroke, drawn once on enter); nodes are HTML so the text
   stays crisp, translatable and readable by assistive tech via `summary`.
   No continuous motion — it draws, settles, and stays still. */

export interface CNode { id: string; nl: string; gloss?: string; badge?: ReactNode; contexts?: number[]; tone?: 'paper' | 'mint' | 'cobalt' }

interface Props {
  center: { nl: string; gloss?: string }
  nodes: CNode[]
  contexts: string[]
  variant?: 'night' | 'paper'
  compact?: boolean
  animate?: boolean
  onOpen?: (id: string) => void
  /** Accessible description of what the picture shows. */
  summary: string
}

type P = [number, number]
const WIDE: Record<number, P[]> = {
  1: [[50, 16]],
  2: [[20, 26], [80, 74]],
  3: [[20, 24], [80, 24], [50, 88]],
  4: [[19, 22], [81, 20], [17, 78], [83, 80]],
}
const COMPACT: Record<number, P[]> = {
  1: [[50, 16]],
  2: [[26, 18], [74, 82]],
  3: [[26, 16], [74, 16], [50, 86]],
}
const CTX_WIDE: P[] = [[50, 6], [50, 96], [6, 50], [94, 50]]

function curve([x1, y1]: P, [x2, y2]: P, bend = 0.18): string {
  const mx = (x1 + x2) / 2, my = (y1 + y2) / 2
  const dx = x2 - x1, dy = y2 - y1
  return `M ${x1} ${y1} Q ${mx - dy * bend} ${my + dx * bend} ${x2} ${y2}`
}

export function Constellation({ center, nodes, contexts, variant = 'night', compact, animate = true, onOpen, summary }: Props) {
  // Phones get three word objects on a flatter plane: the start action must stay near the top.
  const list = nodes.slice(0, compact ? 3 : 4)
  const pos = (compact ? COMPACT : WIDE)[Math.max(1, list.length)] ?? WIDE[4]
  const ctxPos = CTX_WIDE
  // Narrow screens: contexts become a chip row under the figure instead of
  // positioned labels, which would collide with the word objects.
  const ctx = compact ? [] : contexts.slice(0, 3)
  const C: P = [50, 50]
  const anim = animate ? ' o-draw' : ''
  const settle = animate ? ' o-settle' : ''

  return (
    <>
    <figure className={`o-constellation${variant === 'paper' ? ' o-constellation--paper' : ''}`} style={compact ? { aspectRatio: '4 / 2.6', minHeight: 190 } : undefined}>
      <figcaption className="o-sr">{summary}</figcaption>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        {list.map((n, i) => (
          <path key={n.id} className={'o-clink' + anim} d={curve(C, pos[i])} pathLength={100}
            vectorEffect="non-scaling-stroke" style={{ ['--d' as string]: `${120 + i * 70}ms` }} />
        ))}
        {list.flatMap((n, i) => (n.contexts ?? []).filter((c) => c < ctx.length).map((c) => (
          <path key={`${n.id}-${c}`} className={'o-clink' + anim} d={curve(pos[i], ctxPos[c], -0.12)} pathLength={100}
            vectorEffect="non-scaling-stroke" strokeDasharray={animate ? undefined : '2 3'}
            style={{ opacity: 0.55, ['--d' as string]: `${420 + i * 60}ms` }} />
        )))}
      </svg>
      {ctx.map((label, i) => (
        <span key={label} className={'o-ctx' + settle} aria-hidden="true"
          style={{ left: `${ctxPos[i][0]}%`, top: `${ctxPos[i][1]}%`, ['--d' as string]: `${480 + i * 80}ms` }}>
          {label}
        </span>
      ))}
      <div className={'o-cnode' + settle} style={{ left: '50%', top: '50%', ['--d' as string]: '40ms' }}>
        <WordToken nl={center.nl} gloss={center.gloss} tone="cobalt" />
      </div>
      {list.map((n, i) => (
        <div key={n.id} className={'o-cnode' + settle} style={{ left: `${pos[i][0]}%`, top: `${pos[i][1]}%`, ['--d' as string]: `${200 + i * 70}ms` }}>
          <WordToken nl={n.nl} gloss={compact && !n.tone ? undefined : n.gloss} size="sm" badge={n.badge} tone={n.tone}
            onOpen={onOpen ? () => onOpen(n.id) : undefined} layoutId={onOpen ? `tok-${n.id}` : undefined}
            label={onOpen ? `${n.nl} — افتح التفاصيل` : undefined} />
        </div>
      ))}
    </figure>
    {compact && contexts.length > 0 && (
      <div className="o-row" aria-hidden="true" style={{ justifyContent: 'center', gap: 6, marginTop: 10 }}>
        {contexts.slice(0, 3).map((c) => <span key={c} className="o-ctx" style={{ position: 'static', transform: 'none' }}>{c}</span>)}
      </div>
    )}
    </>
  )
}
