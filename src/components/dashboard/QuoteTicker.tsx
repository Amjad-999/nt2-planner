import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { QUOTES, dayOfYear } from '@/data/dutchQuotes'
import { useNow } from '@/hooks/useNow'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { pressSpring, pressTransition, springCard } from '@/lib/animations'

/* Long enough to read a Dutch line and its Arabic gloss without feeling
   rushed, short enough that the area is visibly alive. */
const ROTATE_MS = 14000

/**
 * The dashboard's rotating Dutch proverb. Two rules it exists to respect:
 * the copy is formal Dutch (u/uw — none of these proverbs address the reader
 * at all, which is the safest form), and the rotation is never the only way
 * to reach the next quote: there is a real, 44px, keyboard-reachable button,
 * because auto-advance alone strands anyone who reads slowly.
 */
export function QuoteTicker() {
  const now = useNow()
  const reduced = useReducedMotion()
  // Seeded by day-of-year so the first quote is stable per day rather than
  // re-randomising on every mount.
  const [i, setI] = useState(() => dayOfYear(now) % QUOTES.length)

  useEffect(() => {
    const t = window.setInterval(() => setI((n) => (n + 1) % QUOTES.length), ROTATE_MS)
    return () => window.clearInterval(t)
  }, [])

  const quote = QUOTES[i]

  return (
    <motion.section
      aria-label="حكمة هولندية"
      initial={reduced ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springCard}
      className="decor-flourish"
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)',
        padding: '14px 18px', borderRadius: 'var(--r)',
        background: 'var(--surface2)', border: '1px solid var(--border)',
        borderInlineStart: '3px solid var(--orange)',
      }}
    >
      <span aria-hidden="true" style={{ fontSize: 'var(--glyph-sm)', flexShrink: 0 }}>💬</span>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* aria-live so a screen reader hears the new quote instead of it
            silently swapping under the user. */}
        <div aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={i}
              initial={reduced ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduced ? { opacity: 1 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.28 }}
            >
              <p
                lang="nl"
                dir="ltr"
                style={{
                  margin: 0, fontFamily: 'var(--font-latin)', fontStyle: 'italic',
                  fontSize: 'var(--text-base)', color: 'var(--text)', lineHeight: 'var(--lh-ui)', textAlign: 'start',
                }}
              >
                “{quote.nl}”
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
                {quote.ar}
              </p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <motion.button
        type="button"
        onClick={() => setI((n) => (n + 1) % QUOTES.length)}
        whileTap={reduced ? undefined : pressSpring}
        transition={pressTransition}
        aria-label="اعرض الحكمة التالية"
        style={{
          width: 44, height: 44, flexShrink: 0, borderRadius: 'var(--r-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--btn-bg)', border: '1px solid var(--btn-border)',
          color: 'var(--text2)', cursor: 'pointer', fontSize: 'var(--text-base)', fontFamily: 'inherit',
        }}
      >
        {/* الشيفرون يشير إلى "التالي" — يُقلب تلقائيًّا في RTL */}
        <span className="icon-flip-rtl" aria-hidden="true">›</span>
      </motion.button>
    </motion.section>
  )
}
