import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useNow } from '@/hooks/useNow'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { springFill, pressSpring, pressTransition } from '@/lib/animations'
import { celebrate } from '@/lib/celebrate'
import { ringState } from './countdownRing'

/* Lazy for the same reason the rest of the modals are: ExamDateModal imports
   Overlay/Field from SettingsModal, which drags CloudPanel + the TTS voice
   code — none of that belongs in the always-visible dashboard chunk. */
const ExamDateModal = lazy(() => import('./ExamDateModal').then((m) => ({ default: m.ExamDateModal })))

const SIZE = 108
const R = 44
const C = 2 * Math.PI * R

/**
 * The dashboard's one and only exam countdown. The date lives in the Zustand
 * store (persisted to localStorage + idb-keyval, merged to Supabase like any
 * other field) — there is no second copy anywhere, and no seeded default: a
 * user who has not answered "when is your exam?" sees an invitation to
 * answer it, not a countdown to a date they never chose.
 *
 * The ring fills with the share of the study timeline already spent, so it
 * reads as "how far through my preparation am I", not as a spinner.
 */
export function ExamCountdownRing() {
  const examDate = useAppStore((s) => s.examDate)
  const planStart = useAppStore((s) => s.planStart)
  const onboarded = useAppStore((s) => s.onboarded)
  const saveSettings = useAppStore((s) => s.saveSettings)
  const reduced = useReducedMotion()
  const now = useNow()

  const { daysLeft, elapsed, phase } = ringState(examDate, planStart, now)

  /* First visit: ask the question. Deferred until the app's own OnboardModal
     is done (onboarded) so the two never stack — React's "adjust state during
     render" pattern, not a setState-in-effect. */
  const [showModal, setShowModal] = useState(() => onboarded && phase === 'unset')
  const [prevOnboarded, setPrevOnboarded] = useState(onboarded)
  if (onboarded !== prevOnboarded) {
    setPrevOnboarded(onboarded)
    if (onboarded && phase === 'unset') setShowModal(true)
  }

  /* Exam day itself earns confetti, once per mount. Deliberately NOT fired
     for `past`: the old countdown card celebrated on every visit forever
     after the date, which turns a milestone into noise. celebrate() no-ops
     under prefers-reduced-motion on its own. */
  const celebrated = useRef(false)
  useEffect(() => {
    if (phase !== 'today') { celebrated.current = false; return }
    if (celebrated.current) return
    celebrated.current = true
    celebrate('exam')
  }, [phase])

  const filled = elapsed * C

  const label =
    phase === 'unset'
      ? 'حدّد موعد امتحانك لبدء العدّ التنازلي'
      : phase === 'past'
        ? 'مضى موعد امتحانك — اضغط لتحديد موعد جديد'
        : phase === 'today'
          ? 'اليوم هو موعد امتحان NT2 — اضغط لتغيير الموعد'
          : `متبقٍ ${daysLeft} يوم على امتحان NT2، وانقضى ${Math.round(elapsed * 100)}% من مدّة تحضيرك. اضغط لتغيير الموعد`

  return (
    <>
      <motion.button
        type="button"
        onClick={() => setShowModal(true)}
        aria-haspopup="dialog"
        aria-label={label}
        whileTap={reduced ? undefined : pressSpring}
        transition={pressTransition}
        style={{
          position: 'relative', width: SIZE, height: SIZE, flexShrink: 0,
          borderRadius: 'var(--r-full)', padding: 0, cursor: 'pointer',
          background: 'var(--hero-veil)', fontFamily: 'inherit',
          border: phase === 'unset' ? '1px dashed var(--orange-m)' : '1px solid var(--hero-line)',
        }}
      >
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" style={{ display: 'block' }}>
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="var(--hero-line)" strokeWidth="8" />
          {phase !== 'unset' && (
            <motion.circle
              cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none"
              stroke="var(--orange)" strokeWidth="8" strokeLinecap="round"
              /* Same 12-o'clock start the readiness ring used before it. */
              transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
              initial={reduced ? false : { strokeDasharray: `0 ${C}` }}
              animate={{ strokeDasharray: `${filled} ${C}` }}
              transition={reduced ? { duration: 0 } : springFill}
            />
          )}
        </svg>

        <span
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-0)', pointerEvents: 'none',
          }}
        >
          {phase === 'unset' ? (
            <>
              <span aria-hidden="true" style={{ fontSize: 'var(--glyph-sm)' }}>📅</span>
              <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--fw-cta)', color: 'var(--hero-ink)', lineHeight: 'var(--lh-heading)' }}>
                حدّد موعدك
              </span>
            </>
          ) : phase === 'counting' ? (
            <>
              <span
                style={{
                  fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--fw-cta)',
                  color: 'var(--hero-ink)', lineHeight: 'var(--lh-none)', fontVariantNumeric: 'tabular-nums',
                }}
              >
                {daysLeft}
              </span>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--hero-ink2)' }}>يوم</span>
              <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--hero-ink2)' }}>حتى الامتحان</span>
            </>
          ) : (
            <>
              <span aria-hidden="true" style={{ fontSize: 'var(--glyph-sm)' }}>🎉</span>
              <span style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--fw-cta)', color: 'var(--hero-ink)', lineHeight: 'var(--lh-heading)' }}>
                {phase === 'today' ? 'اليوم موعدك' : 'موعد جديد؟'}
              </span>
            </>
          )}
        </span>
      </motion.button>

      {/* Sibling of the hero card, not a child: backdrop-filter on the hero
          would trap Overlay's position:fixed backdrop inside it. */}
      <Suspense fallback={null}>
        {showModal && (
          <ExamDateModal
            currentDate={phase === 'unset' ? null : examDate}
            onClose={() => setShowModal(false)}
            onSave={(iso) => saveSettings({ examDate: iso })}
          />
        )}
      </Suspense>
    </>
  )
}
