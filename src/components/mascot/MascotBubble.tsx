import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { bubbleTransition } from './MascotAnimations'
import { MASCOT_NAME_AR, type MascotLine } from '@/data/mascotDialogs'

const TYPE_SPEED_MS = 22

interface Props {
  line: MascotLine
  onClose: () => void
  onDismissForever: () => void
}

export function MascotBubble({ line, onClose, onDismissForever }: Props) {
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

  return (
    <AnimatePresence>
      <motion.div
        role="status" aria-live="polite" dir="rtl"
        variants={reduced ? undefined : bubbleTransition}
        initial={reduced ? undefined : 'initial'}
        animate={reduced ? { opacity: 1 } : 'animate'}
        exit={reduced ? { opacity: 0 } : 'exit'}
        style={{
          maxWidth: 280,
          background: 'var(--modal-bg)',
          backdropFilter: 'blur(24px) saturate(1.8)',
          WebkitBackdropFilter: 'blur(24px) saturate(1.8)',
          border: '1px solid var(--modal-border)',
          borderRadius: 'var(--r)',
          boxShadow: 'var(--elev-2), inset 0 1px 0 var(--glass-hi)',
          padding: '14px 16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: '.82rem', fontWeight: 'var(--fw-heading)', color: 'var(--orange-ink)' }}>
            🦊 {MASCOT_NAME_AR}
          </span>
          <button
            onClick={onClose} aria-label="إغلاق"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '1rem', lineHeight: 1, padding: 2 }}
          >
            ✕
          </button>
        </div>

        <p style={{ margin: 0, fontSize: '.9rem', color: 'var(--text)', lineHeight: 1.6, minHeight: '1.6em' }}>
          {displayText}
          {!reduced && shown.length < line.ar.length && <span aria-hidden="true" style={{ opacity: 0.5 }}>▍</span>}
        </p>

        {line.nl && (
          <div
            dir="ltr" lang="nl"
            style={{ marginTop: 8, display: 'inline-block', fontFamily: 'var(--font-latin)', fontSize: '.78rem', fontWeight: 600, color: 'var(--orange-ink)', background: 'var(--orange-l)', borderRadius: 8, padding: '2px 8px' }}
          >
            {line.nl}
          </div>
        )}

        <button
          onClick={onDismissForever}
          style={{ display: 'block', marginTop: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '.72rem', textDecoration: 'underline', padding: 0, fontFamily: 'inherit' }}
        >
          إخفاء {MASCOT_NAME_AR} نهائيًّا
        </button>
      </motion.div>
    </AnimatePresence>
  )
}
