import type { ComponentProps, ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost'

/* ComponentProps<'button'> carries `ref` in React 19, so a caller can focus
   the button (FlashCard moves focus to "إظهار المعنى" on every new card). */
interface Props extends ComponentProps<'button'> {
  variant?: Variant
  size?: 'md' | 'lg'
  block?: boolean
  /** Decorative leading glyph — hidden from assistive tech. */
  icon?: ReactNode
  /** Shows a busy state and blocks repeat presses while work is pending. */
  busy?: boolean
}

/**
 * The one button. Every state (hover, pressed, focus, disabled, busy) is
 * designed once in components.css, so screens stop restyling <button> inline.
 * Exactly one `primary` per screen: it is the answer to "what do I do now".
 */
export function Button({
  variant = 'secondary', size = 'md', block, icon, busy, className, children, disabled, type = 'button', ...rest
}: Props) {
  const cls = [
    'btn',
    variant === 'primary' && 'btn--primary',
    variant === 'ghost' && 'btn--ghost',
    size === 'lg' && 'btn--lg',
    block && 'btn--block',
    className,
  ].filter(Boolean).join(' ')

  return (
    <button {...rest} type={type} className={cls} disabled={disabled || busy} aria-busy={busy || undefined}>
      {icon && <span aria-hidden="true">{icon}</span>}
      {children}
    </button>
  )
}
