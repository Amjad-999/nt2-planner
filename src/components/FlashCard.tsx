import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { speakDutch } from '@/features/tts/speakDutch'
import type { VocabWord, ExamWord } from '@/store/types'
import type { FsrsQuality } from '@/features/vocab/fsrs'
import { formatIntervalAr } from '@/features/vocab/fsrs'

type Word = VocabWord | ExamWord
const getNl = (w: Word) => 'dutch' in w ? w.dutch : w.nl
const getAr = (w: Word) => 'arabic' in w ? w.arabic : w.ar
const getEx = (w: Word) => 'example' in w ? w.example : w.ex

interface Props {
  queue: Word[]
  onGrade: (wordId: string, quality: FsrsQuality) => number
  onDone: () => void
}

const GRADE_BUTTONS: {
  quality: FsrsQuality; label: string; icon: string
  color: string; bg: string; key: string
}[] = [
  { quality: 0, label: 'لم أعرفها', icon: '❌', color: 'var(--red)',   bg: 'var(--red-l)',   key: '1' },
  { quality: 1, label: 'صعبة',      icon: '🤔', color: 'var(--amber)', bg: 'var(--amber-l)', key: '2' },
  { quality: 2, label: 'عرفتها',    icon: '👍', color: 'var(--blue)',  bg: 'var(--blue-l)',  key: '3' },
  { quality: 3, label: 'سهلة',      icon: '✅', color: 'var(--green)', bg: 'var(--green-l)', key: '4' },
]

// Shortcuts listed for the help overlay
const SHORTCUTS = [
  { keys: 'Space / Enter', desc: 'قلب البطاقة' },
  { keys: '1',  desc: '❌ لم أعرفها (Again)' },
  { keys: '2',  desc: '🤔 صعبة (Hard)'       },
  { keys: '3',  desc: '👍 عرفتها (Good)'      },
  { keys: '4',  desc: '✅ سهلة (Easy)'         },
  { keys: '→',  desc: 'قلب / تجاوز التأخير'   },
  { keys: 'Esc', desc: 'إنهاء الجلسة'          },
]

export function FlashCard({ queue, onGrade, onDone }: Props) {
  const [idx, setIdx]                   = useState(0)
  const [flipped, setFlipped]           = useState(false)
  const [nextInterval, setNextInterval] = useState<string | null>(null)
  const [helpOpen, setHelpOpen]         = useState(false)
  const btnRef    = useRef<HTMLButtonElement>(null)
  const advTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Advance to next card (cancels any pending delay) ──────────────────────
  const advance = useCallback(() => {
    if (advTimerRef.current) { clearTimeout(advTimerRef.current); advTimerRef.current = null }
    setNextInterval(null)
    setFlipped(false)
    if (idx + 1 >= queue.length) onDone()
    else setIdx(idx + 1)
  }, [idx, queue.length, onDone])

  if (!queue.length) {
    return (
      <div className="info-box" style={{ background: 'var(--green-l)', border: '1px solid var(--glass-border)', borderInlineStart: '3px solid var(--green)', borderRadius: 'var(--r-sm)', padding: '14px 18px', fontSize: '.9rem', color: 'var(--text2)' }}>
        ✅ لا كلمات مستحقّة الآن. أضف كلمات جديدة عبر AI لبدء جلسة لاحقًا.
      </div>
    )
  }

  const word = queue[idx]
  if (!word) { onDone(); return null }

  const nl = getNl(word)
  const ar = getAr(word)
  const ex = getEx(word)

  const grade = (q: FsrsQuality) => {
    if (nextInterval) return          // already grading — block double-fire
    const days = onGrade(word.id, q)
    setNextInterval(formatIntervalAr(days))
    setFlipped(false)
    advTimerRef.current = setTimeout(() => {
      advTimerRef.current = null
      setNextInterval(null)
      if (idx + 1 >= queue.length) onDone()
      else setIdx(idx + 1)
    }, 1400)
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  // enableOnFormTags defaults to false in react-hotkeys-hook v5, so these
  // never fire when the user is typing in an <input> or <textarea>.

  // Space / Enter → flip (front only)
  useHotkeys(['space', 'enter'], (e) => {
    e.preventDefault()
    if (!flipped && !nextInterval) setFlipped(true)
  })

  // 1–4 → grade (back only, not during interval display)
  useHotkeys('1', () => { if (flipped && !nextInterval) grade(0) })
  useHotkeys('2', () => { if (flipped && !nextInterval) grade(1) })
  useHotkeys('3', () => { if (flipped && !nextInterval) grade(2) })
  useHotkeys('4', () => { if (flipped && !nextInterval) grade(3) })

  // ArrowRight → flip if on front, or skip interval delay if grading
  useHotkeys('arrowright', () => {
    if (nextInterval) advance()
    else if (!flipped) setFlipped(true)
  })

  // Esc → exit (close help first if open, then exit)
  useHotkeys('escape', () => {
    if (helpOpen) { setHelpOpen(false); return }
    onDone()
  })

  // ? → toggle help
  useHotkeys('shift+slash', (e) => { e.preventDefault(); setHelpOpen(o => !o) })

  return (
    <div
      className="max-w-[420px] mx-auto text-center"
      style={{ position: 'relative', background: 'var(--glass-bg-strong)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r)', padding: '32px 18px', boxShadow: 'var(--elev-2)' }}
    >
      {/* Progress + help button row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div className="text-[.78rem] text-[var(--muted)]">{idx + 1} / {queue.length}</div>
        <button
          onClick={() => setHelpOpen(o => !o)}
          aria-label="اختصارات لوحة المفاتيح"
          aria-expanded={helpOpen}
          aria-controls="flashcard-help"
          style={{
            width: 26, height: 26, borderRadius: '50%',
            border: '1px solid var(--border2)',
            background: helpOpen ? 'var(--orange-l)' : 'var(--glass-bg)',
            color: helpOpen ? 'var(--orange)' : 'var(--muted)',
            cursor: 'pointer', fontSize: '.8rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}
        >?</button>
      </div>

      {/* Help overlay */}
      <AnimatePresence>
        {helpOpen && (
          <motion.div
            id="flashcard-help"
            role="dialog"
            aria-label="اختصارات لوحة المفاتيح"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            dir="rtl"
            style={{
              position: 'absolute', top: 52, insetInlineEnd: 0, zIndex: 20,
              background: 'var(--glass-bg-strong)',
              backdropFilter: 'blur(18px)', WebkitBackdropFilter: 'blur(18px)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--r-sm)',
              padding: '14px 16px',
              boxShadow: 'var(--elev-2)',
              minWidth: 220, textAlign: 'start',
            }}
          >
            <div style={{ fontSize: '.78rem', fontWeight: 700, color: 'var(--muted)', marginBottom: 10, letterSpacing: .5 }}>
              ⌨️ اختصارات لوحة المفاتيح
            </div>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {SHORTCUTS.map(({ keys, desc }) => (
                  <tr key={keys}>
                    <td style={{ paddingBottom: 6, paddingInlineEnd: 12 }}>
                      <kbd style={{
                        display: 'inline-block', padding: '1px 6px',
                        border: '1px solid var(--border2)',
                        borderRadius: 5, background: 'var(--surface3)',
                        fontSize: '.75rem', fontFamily: 'inherit',
                        color: 'var(--text2)', whiteSpace: 'nowrap',
                        direction: 'ltr',
                      }}>{keys}</kbd>
                    </td>
                    <td style={{ fontSize: '.82rem', color: 'var(--text2)', paddingBottom: 6 }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 8, borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              الاختصارات لا تعمل أثناء الكتابة في الحقول.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{nl}</div>

      <button ref={btnRef} onClick={() => speakDutch(nl, btnRef.current)}
        className="text-[.8rem] px-3 py-1.5 rounded-[8px] border border-[var(--border2)] bg-[var(--surface)] text-[var(--muted)] cursor-pointer hover:text-[var(--orange)] hover:border-[var(--orange)]">
        🔊 استمع
      </button>

      {/* Interval toast after grading */}
      <AnimatePresence>
        {nextInterval && (
          <motion.div key="interval" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ marginTop: 14, padding: '8px 16px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'inline-block', fontSize: '.9rem', color: 'var(--text2)' }}>
            🗓 {nextInterval}
            <button
              onClick={advance}
              aria-label="التالي فوراً"
              title="→ التالي"
              style={{ marginInlineStart: 10, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: '.8rem' }}
            >→</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!nextInterval && flipped ? (
          <motion.div key="back" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mt-5 text-[1.15rem] text-[var(--text)] font-medium">{ar}</div>
            {ex && <div className="mt-2.5 text-[.92rem] text-[var(--text2)] italic">"{ex}"</div>}
            <div className="flex gap-2 mt-[18px] justify-center flex-wrap">
              {GRADE_BUTTONS.map(({ quality, label, icon, color, bg, key }) => (
                <button key={quality} onClick={() => grade(quality)}
                  style={{ color, borderColor: color, background: bg, borderRadius: 10, padding: '8px 14px', border: '1px solid', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 }}>
                  <span aria-hidden="true" style={{ opacity: .55, fontSize: '.72rem', marginInlineEnd: 4 }}>{key}</span>
                  {icon} {label}
                </button>
              ))}
            </div>
          </motion.div>
        ) : !nextInterval ? (
          <motion.div key="front" className="mt-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button
              onClick={() => setFlipped(true)}
              className="font-semibold text-white px-6 py-2.5 rounded-[14px] cursor-pointer border-0"
              style={{ background: 'var(--grad-primary)', boxShadow: 'var(--elev-2), inset 0 1px 0 rgba(255,255,255,.4)' }}
            >
              اقلب البطاقة <span aria-hidden="true" style={{ opacity: .65, fontSize: '.8rem', marginInlineStart: 6 }}>Space</span>
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
