import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { speakDutch } from '@/features/tts/speakDutch'
import type { VocabWord, ExamWord } from '@/store/types'

type Word = VocabWord | ExamWord
const getNl = (w: Word) => 'dutch' in w ? w.dutch : w.nl
const getAr = (w: Word) => 'arabic' in w ? w.arabic : w.ar
const getEx = (w: Word) => 'example' in w ? w.example : w.ex

interface Props {
  queue: Word[]
  onGrade: (wordId: string, quality: 0 | 2 | 4) => void
  onDone: () => void
}

export function FlashCard({ queue, onGrade, onDone }: Props) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
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

  const grade = (q: 0 | 2 | 4) => {
    onGrade(word.id, q)
    setFlipped(false)
    if (idx + 1 >= queue.length) onDone()
    else setIdx(idx + 1)
  }

  return (
    <div className="max-w-[420px] mx-auto text-center" style={{ background: 'var(--glass-bg-strong)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r)', padding: '32px 18px', boxShadow: 'var(--elev-2)' }}>
      <div className="text-[.78rem] text-[var(--muted)] mb-2.5">{idx + 1} / {queue.length}</div>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{nl}</div>

      <button ref={btnRef} onClick={() => speakDutch(nl, btnRef.current)}
        className="text-[.8rem] px-3 py-1.5 rounded-[8px] border border-[var(--border2)] bg-[var(--surface)] text-[var(--muted)] cursor-pointer hover:text-[var(--orange)] hover:border-[var(--orange)]">
        🔊 استمع
      </button>

      <AnimatePresence>
        {flipped ? (
          <motion.div key="back" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <div className="mt-5 text-[1.15rem] text-[var(--text)] font-medium">{ar}</div>
            {ex && <div className="mt-2.5 text-[.92rem] text-[var(--text2)] italic">"{ex}"</div>}
            <div className="flex gap-2 mt-[18px] justify-center flex-wrap">
              <button onClick={() => grade(0)} className="grade-btn" style={{ color: 'var(--red)', borderColor: 'var(--red)', background: 'var(--red-l)', borderRadius: 10, padding: '8px 18px', border: '1px solid', cursor: 'pointer', fontSize: '.88rem', fontWeight: 600 }}>❌ لم أعرفها</button>
              <button onClick={() => grade(2)} className="grade-btn" style={{ color: 'var(--amber)', borderColor: 'var(--amber)', background: 'var(--amber-l)', borderRadius: 10, padding: '8px 18px', border: '1px solid', cursor: 'pointer', fontSize: '.88rem', fontWeight: 600 }}>🤔 صعبة</button>
              <button onClick={() => grade(4)} className="grade-btn" style={{ color: 'var(--green)', borderColor: 'var(--green)', background: 'var(--green-l)', borderRadius: 10, padding: '8px 18px', border: '1px solid', cursor: 'pointer', fontSize: '.88rem', fontWeight: 600 }}>✅ سهلة</button>
            </div>
          </motion.div>
        ) : (
          <motion.div key="front" className="mt-5" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <button
              onClick={() => setFlipped(true)}
              className="font-semibold text-white px-6 py-2.5 rounded-[14px] cursor-pointer border-0"
              style={{ background: 'var(--grad-primary)', boxShadow: 'var(--elev-2), inset 0 1px 0 rgba(255,255,255,.4)' }}
            >
              اقلب البطاقة
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
