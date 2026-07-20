import type { LiteIcon } from './icons'

interface AppIconProps {
  icon: LiteIcon
  size?: number
  /** When set, icon is announced; otherwise aria-hidden */
  label?: string
  /**
   * Wraps the icon in a span that is flipped horizontally when an ancestor
   * has dir="rtl". Use only for direction-sensitive icons (arrows, external-link).
   */
  flipOnRtl?: boolean
  className?: string
  style?: React.CSSProperties
}

/**
 * Standardised Phosphor icon wrapper for the whole app.
 *
 * – weight="duotone" always (secondary layer at 20 % opacity of currentColor)
 * – color="currentColor" so icons inherit parent hover / active colour changes
 * – aria-hidden by default (decorative); pass label= for meaningful icons
 * – size tokens: nav=20, kpi=24, section=22, subsection=18, sm=16
 */
export function AppIcon({ icon: Ph, size = 20, label, flipOnRtl, className, style }: AppIconProps) {
  const el = (
    <Ph
      weight="duotone"
      size={size}
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      style={{ flexShrink: 0, display: 'block', ...style }}
    />
  )
  if (!flipOnRtl) return el
  return (
    <span className="icon-flip-rtl" style={{ display: 'inline-flex', lineHeight: 0 }}>
      {el}
    </span>
  )
}
