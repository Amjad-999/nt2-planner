import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { useCountdown } from '@/hooks/useCountdown'
import { celebrate } from '@/lib/celebrate'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { emojiBounce } from '@/lib/animations'

// Lazy: ExamDateModal statically imports Overlay/Field from SettingsModal.tsx,
// which also pulls in CloudPanel + the TTS voice-loading code. Keeping that
// behind Suspense means guests who never open the date picker don't pay for
// it as part of the (always-visible) Dashboard chunk.
const ExamDateModal = lazy(() => import('./ExamDateModal').then((m) => ({ default: m.ExamDateModal })))

const STORAGE_KEY = 'nt2_exam_date'

function readSavedDate(): string | null {
  try { return localStorage.getItem(STORAGE_KEY) } catch { return null }
}

const UNITS = [
  { key: 'days', label: 'أيام' },
  { key: 'hours', label: 'ساعات' },
  { key: 'minutes', label: 'دقائق' },
  { key: 'seconds', label: 'ثوانٍ' },
] as const

export function ExamCountdown() {
  const onboarded = useAppStore((s) => s.onboarded)
  const [examDate, setExamDate] = useState<string | null>(readSavedDate)
  const [showModal, setShowModal] = useState(() => onboarded && readSavedDate() === null)
  const { days, hours, minutes, seconds, isPast } = useCountdown(examDate ?? '')
  const celebratedRef = useRef(false)
  const reduced = useReducedMotion()

  // Don't stack this modal on top of the app's own first-run OnboardModal —
  // wait until that's done (onboarded flips true), then open ours if the
  // user still hasn't set a date for this specific countdown. React's
  // "adjust state during render" pattern, not a setState-in-effect.
  const [prevOnboarded, setPrevOnboarded] = useState(onboarded)
  if (onboarded !== prevOnboarded) {
    setPrevOnboarded(onboarded)
    if (onboarded && examDate === null) setShowModal(true)
  }

  useEffect(() => {
    if (isPast && examDate) {
      if (!celebratedRef.current) {
        celebratedRef.current = true
        celebrate('exam')
      }
    } else {
      celebratedRef.current = false
    }
  }, [isPast, examDate])

  const handleSave = (iso: string) => {
    try { localStorage.setItem(STORAGE_KEY, iso) } catch { /* private mode / quota — keep in-memory only */ }
    setExamDate(iso)
    setShowModal(false)
  }

  const tiles: Record<(typeof UNITS)[number]['key'], number> = { days: days ?? 0, hours, minutes, seconds }

  const groupLabel = examDate === null
    ? 'العد التنازلي لامتحانك — لم يُحدَّد موعد بعد'
    : isPast
      ? 'حان يوم امتحانك'
      : `العد التنازلي لامتحانك: ${tiles.days} يوم و ${tiles.hours} ساعة و ${tiles.minutes} دقيقة و ${tiles.seconds} ثانية`

  return (
    <>
    <div
      role="group"
      aria-label={groupLabel}
      style={{
        background: 'var(--countdown-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--countdown-border)',
        borderRadius: 16,
        padding: '20px 22px',
        marginBottom: 18,
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, gap: 10 }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true">⏳</span> العد التنازلي لامتحان NT2
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{ background: 'transparent', border: 'none', color: 'var(--countdown-text)', fontWeight: 600, fontSize: '.82rem', cursor: 'pointer', fontFamily: 'inherit', padding: '4px 8px' }}
        >
          ✏️ {examDate ? 'تغيير الموعد' : 'حدّد الموعد'}
        </button>
      </div>

      {isPast ? (
        <div style={{ textAlign: 'center', padding: '10px 0' }}>
          <div style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            {reduced ? (
              <span aria-hidden="true">🎉</span>
            ) : (
              <motion.span aria-hidden="true" variants={emojiBounce} initial="initial" animate="animate" style={{ display: 'inline-block' }}>
                🎉
              </motion.span>
            )}
            {' '}مبروك! حان يوم امتحانك!
          </div>
          <p style={{ color: 'var(--muted)', fontSize: '.86rem', margin: '0 0 14px' }}>
            نتمنّى لك كلّ التوفيق اليوم في امتحان NT2.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="btn-shine"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '10px 18px', borderRadius: 14, fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 700, cursor: 'pointer', border: '1px solid var(--countdown-accent-border)', background: 'var(--countdown-accent-bg)', color: 'var(--text)' }}
          >
            🗓️ حدّد موعدًا جديدًا
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {UNITS.map((u) => (
            <div key={u.key} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 'clamp(1.5rem, 4vw, 2.1rem)', fontWeight: 700, color: 'var(--countdown-text)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
                {String(tiles[u.key]).padStart(2, '0')}
              </div>
              <div style={{ fontSize: '.74rem', color: 'var(--muted)', marginTop: 4 }}>{u.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>

    {/* Rendered as a sibling, not a child, of the card above: backdrop-filter
        (like transform/filter) establishes a new containing block for
        position:fixed descendants, which would confine Overlay's full-viewport
        backdrop to the card's own small box instead of the real viewport. */}
    <Suspense fallback={null}>
      {showModal && (
        <ExamDateModal currentDate={examDate} onClose={() => setShowModal(false)} onSave={handleSave} />
      )}
    </Suspense>
    </>
  )
}
