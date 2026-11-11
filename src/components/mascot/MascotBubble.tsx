import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { bubbleTransition } from './MascotAnimations'
import { MASCOT_NAME_AR, type MascotLine } from '@/data/mascotDialogs'

const TYPE_SPEED_MS = 22
/* A greeting is a passing remark, not a dialog: it steps aside on its own so it
   cannot sit on top of the page's content until someone hunts for the ✕. The
   countdown starts when the line has finished typing and holds while the
   bubble is hovered or focused. Everything in it stays reachable from Katja's panel. */
const AUTO_CLOSE_MS = 9000

interface Props {
  line: MascotLine
  onClose: () => void
  onOpenPanel: () => void
  onDismissForever: () => void
}

export function MascotBubble({ line, onClose, onOpenPanel, onDismissForever }: Props) {
  const reduced = useReducedMotion()
  const [shown, setShown] = useState('')

  // Typed-text reveal — skipped entirely under prefers-reduced-motion, which
  // renders line.ar directly below instead of `shown` (no flashing text).
  // No explicit setShown('') reset here: Mascot.tsx keys this component by
  // the dialog text, so a new `line` remounts it fresh (shown starts at ''
  // again via the useState initializer above) rather than reusing state —
  // the React-endorsed way to "reset state when a prop changes."
  useEffect(() => {
    if (reduced) return
    let i = 0
    const id = setInterval(() => {
      i++
      setShown(line.ar.slice(0, i))
      if (i >= line.ar.length) clearInterval(id)
    }, TYPE_SPEED_MS)
    return () => clearInterval(id)
  }, [line, reduced])

  const displayText = reduced ? line.ar : shown

  const [held, setHeld] = useState(false)
  const typed = reduced || shown.length >= line.ar.length
  useEffect(() => {
    if (!typed || held) return
    const id = setTimeout(onClose, AUTO_CLOSE_MS)
    return () => clearTimeout(id)
  }, [typed, held, onClose])

  return (
    <AnimatePresence>
      <motion.div
        role="status" aria-live="polite" dir="rtl"
        onPointerEnter={() => setHeld(true)} onPointerLeave={() => setHeld(false)}
        onFocus={() => setHeld(true)} onBlur={() => setHeld(false)}
        variants={reduced ? undefined : bubbleTransition}
        initial={reduced ? undefined : 'initial'}
        animate={reduced ? { opacity: 1 } : 'animate'}
        exit={reduced ? { opacity: 0 } : 'exit'}
        style={{
          maxWidth: 'min(280px, calc(100vw - 36px))',
          pointerEvents: 'auto',
          background: 'var(--modal-bg)',
          backdropFilter: 'var(--glass-fx-float)',
          WebkitBackdropFilter: 'var(--glass-fx-float)',
          border: '1px solid var(--modal-border)',
          borderRadius: 'var(--r)',
          boxShadow: 'var(--elev-2), inset 0 1px 0 var(--glass-hi)',
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-2)' }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', color: 'var(--orange-text)' }}>
            🐱 {MASCOT_NAME_AR}
          </span>
          <button
            onClick={onClose} aria-label="إغلاق"
            className="icon-btn"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text2)', fontSize: 'var(--text-base)', lineHeight: 'var(--lh-none)', padding: 0, marginBlock: -8, marginInlineEnd: -8, display: 'grid', placeItems: 'center', borderRadius: 'var(--r-xs)' }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text)', lineHeight: 'var(--lh-arabic)', minHeight: '1.6em' }}>
          {displayText}
          {!reduced && shown.length < line.ar.length && <span aria-hidden="true" style={{ opacity: 0.5 }}>▍</span>}
        </p>

        {line.nl && (
          <div
            dir="ltr" lang="nl"
            style={{ marginTop: 'var(--sp-2)', display: 'inline-block', fontFamily: 'var(--font-latin)', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-heading)', color: 'var(--orange-text)', background: 'var(--orange-l)', borderRadius: 'var(--r-xs)', padding: '2px 8px' }}
          >
            {line.nl}
          </div>
        )}

        <button
          onClick={onOpenPanel}
          style={{
            display: 'block', width: '100%', marginTop: 'var(--sp-3)', padding: '7px 10px', minBlockSize: 'var(--tap-min)',
            background: 'var(--btn-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)',
            cursor: 'pointer', color: 'var(--text)', fontSize: 'var(--text-xs)', fontFamily: 'inherit',
          }}
        >
          ☰ كل ما أستطيع فعله
        </button>

        <button
          onClick={onDismissForever}
          style={{ display: 'block', marginTop: 'var(--sp-1)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 'var(--text-xs)', textDecoration: 'underline', padding: '8px 0', minBlockSize: 'var(--tap-min)', fontFamily: 'inherit' }}
        >
          إخفاء {MASCOT_NAME_AR} نهائيًّا
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
