import type { CSSProperties, ReactNode } from 'react'

/**
 * صندوق تنبيه/إرشاد — النمط الوحيد لهذه اللافتة في التطبيق.
 *
 * Fourteen hand-rolled copies of this box existed across nine files. They had
 * drifted into three paddings (14/18, 12/14, 10/12), three line heights
 * (1.65, 1.7, 1.75) and two different border tokens, so the same idea looked
 * slightly different on every screen. One component, one recipe.
 *
 * Critical rule 1 of this project: a colour-coded state must never be the only
 * signal. The three STATE tones therefore carry a default icon; `brand` and
 * `info` are emphasis rather than state, so they stay bare unless a call site
 * passes one. `icon={null}` suppresses it when the content already opens with
 * its own glyph.
 */

export type CalloutTone = 'brand' | 'info' | 'success' | 'warn' | 'danger'

interface ToneSpec {
  /** Low-alpha wash for the box. */
  bg: string
  /** The 3px leading edge. Non-text, so the fill token is correct here. */
  edge: string
  /** Icon shown when the call site does not supply one. */
  icon: ReactNode
}

const TONES: Record<CalloutTone, ToneSpec> = {
  brand:   { bg: 'var(--orange-l)', edge: 'var(--orange)', icon: null },
  info:    { bg: 'var(--blue-l)',   edge: 'var(--blue)',   icon: null },
  success: { bg: 'var(--green-l)',  edge: 'var(--green)',  icon: '✅' },
  warn:    { bg: 'var(--amber-l)',  edge: 'var(--amber)',  icon: '⚠️' },
  danger:  { bg: 'var(--red-l)',    edge: 'var(--red)',    icon: '🚨' },
}

const PAD: Record<'comfortable' | 'compact', string> = {
  comfortable: '14px 18px',
  compact: '12px 14px',
}

interface Props {
  tone?: CalloutTone
  /** Overrides the tone's default. `null` renders no icon at all. */
  icon?: ReactNode
  density?: 'comfortable' | 'compact'
  children: ReactNode
  className?: string
  /** Escape hatch for outer spacing only — never for restyling the box. */
  style?: CSSProperties
  role?: 'status' | 'alert'
}

export function Callout({
  tone = 'brand',
  icon,
  density = 'comfortable',
  children,
  className,
  style,
  role,
}: Props) {
  const spec = TONES[tone]
  const glyph = icon === undefined ? spec.icon : icon

  return (
    <div
      role={role}
      className={className}
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: glyph ? 'var(--sp-2)' : 0,
        background: spec.bg,
        border: '1px solid var(--glass-border)',
        borderInlineStart: `3px solid ${spec.edge}`,
        borderRadius: 'var(--r-sm)',
        padding: PAD[density],
        fontSize: 'var(--text-sm)',
        color: 'var(--text2)',
        lineHeight: 'var(--lh-arabic)',
        ...style,
      }}
    >
      {glyph ? (
        <span aria-hidden="true" style={{ flexShrink: 0, lineHeight: 'var(--lh-arabic)' }}>
          {glyph}
        </span>
      ) : null}
      <div style={{ flex: 1, minWidth: 0 }}>{children}</div>
    </div>
  )
}
