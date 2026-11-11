import { useId } from 'react'

/* The NT2 Planner mark — "the connected conversation": a speech bubble holding
   two linked points. The small point is where the learner starts, the large
   one is where they are going, and the link is the language between them.
   Same geometry as the vector master in public/brand/logo-mark.svg; inlined so
   it paints with the first frame (no request) and follows the theme. */

const BUBBLE = 'M148 64H364A92 92 0 0 1 456 156V276A92 92 0 0 1 364 368H240L132 450Q116 461 120 442L140 368H148A92 92 0 0 1 56 276V156A92 92 0 0 1 148 64Z'

interface Props {
  size?: number
  /** `color` follows the theme; `mono` paints in currentColor with the points cut out. */
  variant?: 'color' | 'mono'
  /** Announced name. Omit when a visible label already names the app. */
  title?: string
  className?: string
}

export function Logo({ size = 34, variant = 'color', title, className }: Props) {
  const id = useId()
  const a11y = title ? { role: 'img' as const, 'aria-label': title } : { 'aria-hidden': true as const }
  if (variant === 'mono') {
    return (
      <svg viewBox="0 0 512 512" width={size} height={size} className={className} {...a11y} style={{ flexShrink: 0, display: 'block' }}>
        <defs>
          <mask id={id} maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">
            <rect width="512" height="512" fill="#fff" />
            <path d="M184 268L328 168" fill="none" stroke="#000" strokeWidth="26" strokeLinecap="round" />
            <circle cx="184" cy="268" r="31" fill="#000" />
            <circle cx="328" cy="168" r="45" fill="#000" />
          </mask>
        </defs>
        <path d={BUBBLE} fill="currentColor" mask={`url(#${id})`} />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 512 512" width={size} height={size} className={`brand-logo ${className ?? ''}`} {...a11y} style={{ flexShrink: 0, display: 'block' }}>
      <defs>
        <linearGradient id={id} x1="56" y1="64" x2="456" y2="450" gradientUnits="userSpaceOnUse">
          <stop offset="0" className="brand-logo__a" />
          <stop offset="1" className="brand-logo__b" />
        </linearGradient>
      </defs>
      <path d={BUBBLE} fill={`url(#${id})`} />
      <path d="M184 268L328 168" fill="none" className="brand-logo__link" strokeWidth="26" strokeLinecap="round" />
      <circle cx="184" cy="268" r="31" className="brand-logo__from" />
      <circle cx="328" cy="168" r="45" className="brand-logo__to" />
    </svg>
  )
}
