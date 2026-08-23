import { formatDuration } from '@/features/program/dates'

interface Props {
  progress: number      // 0..1
  remainingMs: number
  label: string
  color: string
  overrun: boolean
  size?: number
}

/** حلقة المؤقّت — SVG نقي، بلا رسوم متحرّكة تعتمد على العدّ. */
export function TimerRing({ progress, remainingMs, label, color, overrun, size = 208 }: Props) {
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const p = Math.min(1, Math.max(0, progress))
  const dash = c * p

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke="var(--surface3)" strokeWidth={stroke}
        />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={overrun ? 'var(--red)' : color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          style={{ transition: 'stroke-dasharray .3s linear, stroke .3s ease' }}
        />
      </svg>
      <div
        style={{
          position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
        }}
      >
        <div
          style={{
            fontSize: size > 180 ? '2.5rem' : '2rem',
            fontWeight: 700,
            fontVariantNumeric: 'tabular-nums',
            fontFamily: 'var(--font-latin)',
            color: overrun ? 'var(--red)' : 'var(--text)',
            lineHeight: 1,
            direction: 'ltr',
          }}
        >
          {overrun ? '+' : ''}{formatDuration(Math.abs(remainingMs))}
        </div>
        <div style={{ fontSize: '.74rem', color: 'var(--muted)', letterSpacing: '.4px' }}>
          {overrun ? 'تجاوزت الوقت' : label}
        </div>
      </div>
    </div>
  )
}
