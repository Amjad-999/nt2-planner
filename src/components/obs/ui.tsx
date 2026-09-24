import type { ReactNode, ButtonHTMLAttributes } from 'react'
import { forwardRef } from 'react'
import './obs.css'
import type { Icon } from './icons'
import { IInfo, IWarningCircle, ICheckCircle, IXCircle, IWifiSlash } from './icons'
import { STAGE_AR, type Stage } from '@/features/observatory/evidence'
import { ICircle, IEye, ITarget, ISparkle } from './icons'

/* ── Observatory primitives ─────────────────────────────────────────────────
   Small, token-only building blocks. Every state that uses colour also shows
   an icon and words (WCAG 1.4.1). */

type BtnVariant = 'primary' | 'secondary' | 'ghost' | 'night' | 'danger'

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: 'md' | 'sm'
  block?: boolean
  icon?: Icon
  iconEnd?: Icon
  /** Directional end icon: flips in RTL. */
  flipEnd?: boolean
  /** Directional start icon: flips in RTL. */
  flipIcon?: boolean
}

export const Button = forwardRef<HTMLButtonElement, BtnProps>(function Button(
  { variant = 'secondary', size = 'md', block, icon: Ic, iconEnd: IcEnd, flipEnd, flipIcon, className, children, type = 'button', ...rest }, ref,
) {
  const cls = ['o-btn', `o-btn--${variant}`, size === 'sm' ? 'o-btn--sm' : '', block ? 'o-btn--block' : '', className ?? ''].filter(Boolean).join(' ')
  return (
    <button ref={ref} type={type} className={cls} {...rest}>
      {Ic && <Ic size={size === 'sm' ? 18 : 20} flip={flipIcon} />}
      {children}
      {IcEnd && <IcEnd size={size === 'sm' ? 18 : 20} flip={flipEnd} />}
    </button>
  )
})

/** Monospaced metadata line (dates, minutes, step numbers). Always LTR. */
export function Meta({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={['o-meta', className ?? ''].join(' ').trim()}>{children}</span>
}

/** Dutch inline text: correct language, direction and font. */
export function Nl({ children, display, className, as: As = 'span' }: {
  children: ReactNode; display?: boolean; className?: string; as?: 'span' | 'p' | 'h2' | 'h3' | 'div'
}) {
  return <As lang="nl" dir="ltr" className={[display ? 'o-nl-display' : 'o-nl', className ?? ''].join(' ').trim()}>{children}</As>
}

type Tone = 'neutral' | 'cobalt' | 'mint' | 'coral' | 'warn' | 'error'
export function Chip({ tone = 'neutral', icon: Ic, children }: { tone?: Tone; icon?: Icon; children: ReactNode }) {
  return (
    <span className={`o-chip${tone === 'neutral' ? '' : ` o-chip--${tone}`}`}>
      {Ic && <Ic size={14} />}
      {children}
    </span>
  )
}

const STAGE_TONE: Record<Stage, Tone> = { seen: 'neutral', practised: 'cobalt', used: 'coral', active: 'mint' }
const STAGE_ICON: Record<Stage, Icon> = { seen: IEye, practised: ICircle, used: ITarget, active: ISparkle }

export function StageBadge({ stage }: { stage: Stage }) {
  return <Chip tone={STAGE_TONE[stage]} icon={STAGE_ICON[stage]}>{STAGE_AR[stage]}</Chip>
}

type NoticeTone = 'info' | 'success' | 'warn' | 'error' | 'offline'
const NOTICE_ICON: Record<NoticeTone, Icon> = { info: IInfo, success: ICheckCircle, warn: IWarningCircle, error: IXCircle, offline: IWifiSlash }

export function Notice({ tone = 'info', title, children, actions, live }: {
  tone?: NoticeTone; title?: ReactNode; children?: ReactNode; actions?: ReactNode; live?: 'polite' | 'assertive'
}) {
  const Ic = NOTICE_ICON[tone]
  return (
    <div className={`o-notice o-notice--${tone === 'offline' ? 'warn' : tone}`} role={live === 'assertive' ? 'alert' : live ? 'status' : undefined}>
      <span className="o-notice__icon"><Ic size={20} /></span>
      <div className="o-grow">
        {title && <strong>{title} </strong>}
        {children}
        {actions && <div className="o-row" style={{ marginTop: 8 }}>{actions}</div>}
      </div>
    </div>
  )
}

export function EmptyState({ word, gloss, title, children, action }: {
  word: string; gloss?: string; title: string; children?: ReactNode; action?: ReactNode
}) {
  return (
    <div className="o-empty">
      <span className="o-token" aria-hidden="true">
        <span className="o-token__word">{word}</span>
        {gloss && <span className="o-token__gloss">{gloss}</span>}
      </span>
      <h2 className="o-h3">{title}</h2>
      {children && <p className="o-small" style={{ maxWidth: '46ch' }}>{children}</p>}
      {action}
    </div>
  )
}

/** Editorial workspace header: mono kicker, Arabic display title, optional Dutch line. */
export function WorkspaceHead({ kicker, title, nl, lede, aside }: {
  kicker: ReactNode; title: string; nl?: string; lede?: ReactNode; aside?: ReactNode
}) {
  return (
    <header className="o-head">
      <Meta>{kicker}</Meta>
      <div className="o-head__row">
        <div>
          <h1 className="o-display" style={{ fontSize: 'var(--o-fs-h2)' }}>{title}</h1>
          {nl && <Nl display className="is-italic" as="p"><span style={{ fontSize: '1.35rem', color: 'var(--o-ink-2)' }}>{nl}</span></Nl>}
        </div>
        {aside}
      </div>
      {lede && <p className="o-lede">{lede}</p>}
    </header>
  )
}

export function Feedback({ tone, title, children, icon }: {
  tone: 'right' | 'close' | 'wrong' | 'info'; title: string; children?: ReactNode; icon?: Icon
}) {
  const Ic = icon ?? (tone === 'right' ? ICheckCircle : tone === 'wrong' ? IXCircle : tone === 'close' ? IWarningCircle : IInfo)
  return (
    <div className={`o-feedback o-feedback--${tone}`}>
      <div className="o-feedback__title"><Ic size={22} />{title}</div>
      {children}
    </div>
  )
}
