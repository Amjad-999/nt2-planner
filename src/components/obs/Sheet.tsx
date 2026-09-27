import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { IX } from './icons'
import './obs.css'

/* ── Sheet / drawer ─────────────────────────────────────────────────────────
   A modal dialog that manages focus properly: focus moves to the first
   control (or the panel), Tab is trapped, Escape and the backdrop close it,
   and focus returns to whatever opened it. Bottom sheet on phones (capped at
   62% height so the current question stays visible above it), a side drawer
   or centred panel on desktop. */

interface Props {
  title: string
  onClose: () => void
  children: ReactNode
  placement?: 'side' | 'center'
  /** Shown above the content — e.g. the current question, so context is never lost. */
  pinned?: ReactNode
}

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])'

export function Sheet({ title, onClose, children, placement = 'side', pinned }: Props) {
  const panel = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  useEffect(() => { closeRef.current = onClose })

  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    const p = panel.current
    const first = p?.querySelector<HTMLElement>('[data-autofocus]') ?? p?.querySelector<HTMLElement>(FOCUSABLE)
    ;(first ?? p)?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); closeRef.current(); return }
      if (e.key !== 'Tab' || !p) return
      const items = Array.from(p.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement)
      if (!items.length) { e.preventDefault(); return }
      const a = items[0], z = items[items.length - 1]
      if (e.shiftKey && (document.activeElement === a || document.activeElement === p)) { e.preventDefault(); z.focus() }
      else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (trigger && document.contains(trigger)) trigger.focus()
    }
  }, [])

  return createPortal(
    <div className="o-sheet-backdrop o-root" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panel} tabIndex={-1} className={`o-sheet o-sheet--${placement}`} role="dialog" aria-modal="true" aria-labelledby="o-sheet-title"
        style={{ animation: 'popIn var(--o-dur-panel) var(--o-ease-emph) both' }}>
        <div className="o-sheet__grip" aria-hidden="true" />
        <div className="o-sheet__head">
          <h2 id="o-sheet-title" className="o-h3">{title}</h2>
          <button type="button" className="o-btn o-btn--ghost o-btn--icon" onClick={onClose} aria-label={`إغلاق: ${title}`}><IX size={20} /></button>
        </div>
        {pinned && <div style={{ marginBottom: 12 }}>{pinned}</div>}
        {children}
      </div>
    </div>,
    document.body,
  )
}
