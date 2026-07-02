import { motion } from 'framer-motion'
import { useRef, useState } from 'react'
import { speakDutch } from '@/features/tts/speakDutch'
import { SpeakAndCheck } from '@/components/SpeakAndCheck'
import { HighlightText } from '@/components/HighlightText'
import { useNow } from '@/hooks/useNow'
import type { VocabWord, ExamWord } from '@/store/types'

type Word = VocabWord | ExamWord

function getNl(w: Word) { return 'dutch' in w ? w.dutch : w.nl }
function getAr(w: Word) { return 'arabic' in w ? w.arabic : w.ar }
function getEx(w: Word) { return 'example' in w ? w.example : w.ex }

type Ranges = ReadonlyArray<readonly [number, number]>

interface Props {
  word: Word
  onDelete?: (id: string) => void
  onAdd?: (word: Word) => void   // for themas view
  showAdd?: boolean
  learnedBox?: number
  // Optional highlight ranges from Fuse.js match indices
  hlNl?: Ranges
  hlAr?: Ranges
  hlEx?: Ranges
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  A1: { bg: 'var(--green-l)',  color: 'var(--green)'  },
  A2: { bg: 'var(--blue-l)',   color: 'var(--blue)'   },
  B1: { bg: 'var(--orange-l)', color: 'var(--orange)' },
  B2: { bg: 'var(--amber-l)',  color: 'var(--amber)'  },
  C1: { bg: 'var(--purple-l)', color: 'var(--purple)' },
}

export function WordCard({ word, onDelete, onAdd, showAdd, learnedBox = 4, hlNl, hlAr, hlEx }: Props) {
  const btnRef = useRef<HTMLButtonElement>(null)
  const [showPractice, setShowPractice] = useState(false)
  const now = useNow()
  const nl = getNl(word)
  const ar = getAr(word)
  const ex = getEx(word)
  const lvStyle = LEVEL_STYLE[word.level] ?? { bg: 'var(--surface3)', color: 'var(--muted)' }
  const isDue = (word.due ?? 0) <= now && (word.box ?? 0) < learnedBox

  return (
    <motion.div
      className="rounded-[10px] p-[12px_14px] mb-2"
      style={{
        background: 'var(--glass-bg-strong)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--elev-1)',
      }}
      whileHover={{ translateY: -2, boxShadow: 'var(--elev-2)', borderColor: 'var(--orange-m)' }}
      transition={{ duration: 0.18 }}
    >
      <div className="grid items-center gap-2" style={{ gridTemplateColumns: '1fr auto' }}>
        <div>
          <div className="flex items-center gap-2 font-semibold text-[var(--text)] text-[.98rem]">
            <HighlightText text={nl} indices={hlNl} />
            <button
              ref={btnRef}
              onClick={() => speakDutch(nl, btnRef.current)}
              className="text-[.78rem] px-1.5 py-0.5 rounded border border-[var(--border2)] bg-[var(--surface)] text-[var(--muted)] cursor-pointer hover:text-[var(--orange)] hover:border-[var(--orange)]"
              title="استمع للنطق"
              aria-label={`استمع لنطق ${nl}`}
            >🔊</button>
          </div>
          <div className="text-[var(--text2)] text-[.88rem] mt-0.5"><HighlightText text={ar} indices={hlAr} /></div>
          {ex && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className="text-[var(--muted)] text-[.82rem] italic">"<HighlightText text={ex} indices={hlEx} />"</span>
              <button
                onClick={() => setShowPractice((v) => !v)}
                aria-label={showPractice ? 'أخفِ تمرين النطق' : 'تدرّب على نطق جملة المثال'}
                aria-expanded={showPractice}
                title="🎙️ كرّر بعدي"
                className="text-[.72rem] px-1 py-[1px] rounded border cursor-pointer"
                style={{
                  borderColor: showPractice ? 'var(--orange)' : 'var(--border2)',
                  color: showPractice ? 'var(--orange)' : 'var(--muted)',
                  background: showPractice ? 'var(--orange-l)' : 'transparent',
                  flexShrink: 0,
                }}
              >
                🎙️
              </button>
            </div>
          )}
          <div className="flex gap-1.5 items-center flex-wrap mt-1.5">
            <span className="inline-block px-2 py-[2px] rounded-full text-[.7rem] font-semibold" style={{ background: lvStyle.bg, color: lvStyle.color }}>{word.level}</span>
            <span className="inline-block px-2 py-[2px] rounded-full text-[.7rem] font-semibold bg-[var(--surface3)] text-[var(--muted)]">📦 {word.box}/{5}</span>
            {isDue && <span className="inline-block px-2 py-[2px] rounded-full text-[.7rem] font-semibold" style={{ background: 'var(--orange-l)', color: 'var(--orange)' }}>⏰ مستحقّة</span>}
          </div>
        </div>
        <div className="flex gap-1.5">
          {showAdd && onAdd && (
            <button
              onClick={() => onAdd(word)}
              className="text-[.8rem] px-3 py-1.5 rounded-[8px] border border-[var(--orange)] bg-[var(--orange)] text-white cursor-pointer font-semibold hover:brightness-110"
            >➕ بنك</button>
          )}
          {onDelete && (
            <button
              onClick={() => { if (confirm('حذف هذه الكلمة؟')) onDelete(word.id) }}
              className="text-[.8rem] px-2.5 py-1.5 rounded-[8px] border cursor-pointer"
              style={{ borderColor: 'var(--red)', color: 'var(--red)', background: 'transparent' }}
              aria-label={`حذف ${nl}`}
            >🗑</button>
          )}
        </div>
      </div>

      {/* Collapsible pronunciation practice for the example sentence */}
      {showPractice && ex && (
        <SpeakAndCheck targetNl={ex} label="كرّر جملة المثال" />
      )}
    </motion.div>
  )
}
