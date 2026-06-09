import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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

const GRADE_BUTTONS: { quality: FsrsQuality; label: string; icon: string; color: string; bg: string }[] = [
  { quality: 0, label: 'لم أعرفها', icon: '❌', color: 'var(--red)',   bg: 'var(--red-l)'   },
  { quality: 1, label: 'صعبة',      icon: '🤔', color: 'var(--amber)', bg: 'var(--amber-l)' },
  { quality: 2, label: 'عرفتها',    icon: '👍', color: 'var(--blue)',  bg: 'var(--blue-l)'  },
  { quality: 3, label: 'سهلة',      icon: '✅', color: 'var(--green)', bg: 'var(--green-l)' },
]

export function FlashCard({ queue, onGrade, onDone }: Props) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [nextInterval, setNextInterval] = useState<string | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

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
    const days = onGrade(word.id, q)
    setNextInterval(formatIntervalAr(days))
    setFlipped(false)
    setTimeout(() => {
      setNextInterval(null)
      if (idx + 1 >= queue.length) onDone()
      else setIdx(idx + 1)
    }, 1400)
  }

  return (
    <div className="max-w-[420px] mx-auto text-center" style={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r)', padding: '32px 18px', boxShadow: 'var(--elev-2)' }}>
      <div className="text-[.78rem] text-[var(--muted)] mb-2.5">{idx + 1} / {queue.length}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{nl}</div>

      <button ref={btnRef} onClick={() => speakDutch(nl, btnRef.current)}
        className="text-[.8rem] px-3 py-1.5 rounded-[8px] border border-[var(--border2)] bg-[var(--surface)] text-[var(--muted)] cursor-pointer hover:text-[var(--orange)] hover:border-[var(--orange)]">
        🔊 استمع
      </button>

      {/* Interval toast shown after grading */}
      <AnimatePresence>
        {nextInterval && (
          <motion.div key="interval" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
            style={{ marginTop: 14, padding: '8px 16px', borderRadius: 10, background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'inline-block', fontSize: '.9rem', color: 'var(--text2)' }}>
            🗓 {nextInterval}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!nextInterval && flipped ? (
          <motion.div key="back" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mt-5 text-[1.15rem] text-[var(--text)] font-medium">{ar}</div>
            {ex && <div className="mt-2.5 text-[.92rem] text-[var(--text2)] italic">"{ex}"</div>}
            <div className="flex gap-2 mt-[18px] justify-center flex-wrap">
              {GRADE_BUTTONS.map(({ quality, label, icon, color, bg }) => (
                <button key={quality} onClick={() => grade(quality)}
                  style={{ color, borderColor: color, background: bg, borderRadius: 10, padding: '8px 14px', border: '1px solid', cursor: 'pointer', fontSize: '.85rem', fontWeight: 600 }}>
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
              اقلب البطاقة
            </button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
