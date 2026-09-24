import type { BuildExercise } from '@/features/observatory/types'
import { tileOrder, buildSentence, type BuildResult } from '@/features/observatory/evaluate'
import { Button } from './ui'
import { IArrowCounterClockwise, ITrash } from './icons'

/* Tap-to-order sentence tiles. Tap (Enter/Space) a tile to place it; tap a
   placed tile to send it back; undo and clear are always available — every
   move is reversible and nothing needs dragging. */

interface Props {
  ex: BuildExercise
  order: number[]
  onChange: (order: number[]) => void
  result: BuildResult | null
  locked: boolean
  solvedRight?: boolean
}

export function TileBuilder({ ex, order, onChange, result, locked, solvedRight }: Props) {
  const bank = tileOrder(ex).filter((i) => !order.includes(i))
  const sentence = buildSentence(order, ex)
  return (
    <>
      <div className="o-build-line" role="group" aria-label="جملتك">
        {ex.prefix && <span className="o-build-line__prefix" lang="nl">{ex.prefix}</span>}
        {order.map((i, pos) => {
          const mark = result && !result.correct ? (result.positions[pos] ? 'is-right' : 'is-off') : solvedRight ? 'is-right' : ''
          return (
            <button key={i} type="button" className={`o-tile ${mark}`} lang="nl" disabled={locked}
              onClick={() => onChange(order.filter((x) => x !== i))} aria-label={`أزِل «${ex.tokens[i]}» من الجملة`}>
              {ex.tokens[i]}
              {mark === 'is-right' && <span className="o-tile__mark" aria-hidden="true">✓</span>}
              {mark === 'is-off' && <span className="o-tile__mark" aria-hidden="true">✕</span>}
            </button>
          )
        })}
        {!order.length && <span className="o-small" style={{ direction: 'rtl' }}>جملتك تظهر هنا</span>}
      </div>
      <p className="o-sr" aria-live="polite">{sentence ? `الجملة الآن: ${sentence}` : ''}</p>
      {!locked && (
        <>
          <div className="o-build-bank" role="group" aria-label="الكلمات المتاحة" style={{ marginTop: 12 }}>
            {bank.map((i) => (
              <button key={i} type="button" className="o-tile" lang="nl" onClick={() => onChange([...order, i])} aria-label={`ضع «${ex.tokens[i]}» في الجملة`}>
                {ex.tokens[i]}
              </button>
            ))}
          </div>
          <div className="o-row" style={{ marginTop: 10, gap: 4 }}>
            <Button size="sm" variant="ghost" icon={IArrowCounterClockwise} onClick={() => onChange(order.slice(0, -1))} disabled={!order.length}>تراجع</Button>
            <Button size="sm" variant="ghost" icon={ITrash} onClick={() => onChange([])} disabled={!order.length}>امسح</Button>
          </div>
        </>
      )}
    </>
  )
}
