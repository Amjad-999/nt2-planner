import { forwardRef } from 'react'

/**
 * Absolutely-positioned glow overlay. Place as the LAST child inside any
 * `.interactive-card` that has `position:relative; overflow:hidden`.
 * The parent's CSS hover rule reveals it; the JS hook updates --spot-x/--spot-y.
 */
export const Spotlight = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} aria-hidden="true" className="card-spotlight" />
))
Spotlight.displayName = 'Spotlight'
