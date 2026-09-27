import { motion } from 'framer-motion'
import { useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { speakDutch } from '@/features/tts/speakDutch'
import { SpeakAndCheck } from '@/components/SpeakAndCheck'
import { HighlightText } from '@/components/HighlightText'
import { useNow } from '@/hooks/useNow'
import { isFsrsLearned } from '@/features/vocab/fsrs-lite'
import { splitArticle } from '@/features/vocab/article'
import type { VocabWord, ExamWord } from '@/store/types'
import { WordMeaningVisual } from '@/components/vocab/WordMeaningVisual'

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
  saved?: boolean
  learnedBox?: number
  // Optional highlight ranges from Fuse.js match indices
  hlNl?: Ranges
  hlAr?: Ranges
  hlEx?: Ranges
  meaningVisual?: { sentence: string; meaning: string }
}

const LEVEL_STYLE: Record<string, { bg: string; color: string }> = {
  A1: { bg: 'var(--green-l)',  color: 'var(--green-text)'  },
  A2: { bg: 'var(--blue-l)',   color: 'var(--blue-text)'   },
  B1: { bg: 'var(--orange-l)', color: 'var(--orange-text)' },
  B2: { bg: 'var(--amber-l)',  color: 'var(--amber-text)'  },
  C1: { bg: 'var(--purple-l)', color: 'var(--purple-text)' },
}

export function WordCard({ word, onDelete, onAdd, showAdd, saved, learnedBox = 4, hlNl, hlAr, hlEx, meaningVisual }: Props) {
  const reduced = useReducedMotion()
  const [showPractice, setShowPractice] = useState(false)
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'error'>('idle')
  const now = useNow()
  const nl = getNl(word)
  const ar = getAr(word)
  const ex = getEx(word)
  const split = splitArticle(nl)
  const lvStyle = LEVEL_STYLE[word.level] ?? { bg: 'var(--surface3)', color: 'var(--muted)' }
  const isDue = !showAdd && (word.due ?? 0) <= now
  const learned = word.fsrs_state !== undefined ? isFsrsLearned(word) : word.box >= learnedBox

  const playWord = async () => {
    setAudioState('playing')
    let failed = false
    await speakDutch(nl, undefined, { onError: () => { failed = true } })
    setAudioState(failed ? 'error' : 'idle')
  }

  return (
    <motion.div
      className="rounded-[var(--r-sm)] p-[12px_14px] mb-2"
      style={{
        /* glass tint without backdrop blur — these cards render by the
           hundreds in the vocab list; blurring each would kill scrolling */
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--elev-1)',
      }}
      whileHover={reduced ? undefined : { translateY: -2, boxShadow: 'var(--elev-2)', borderColor: 'var(--orange-m)' }}
      transition={{ duration: 0.18 }}
    >
      <div className="flex flex-wrap items-start gap-3">
        {meaningVisual && <WordMeaningVisual word={nl} sentence={meaningVisual.sentence} meaning={meaningVisual.meaning} />}
        <div style={{ flex: '1 1 220px', minWidth: 0 }}>
          <div dir="ltr" className="flex items-center gap-2 font-semibold text-[var(--text)] text-[var(--text-lg)]">
            {/* The article as its own chip — the part NT2 learners forget most.
                While searching, the full text stays so highlights land on the
                right letters. */}
            {split.article && !hlNl?.length && (
              <span className={`chip ${split.article === 'het' ? 'chip--brand' : 'chip--info'}`} lang="nl" title={split.article === 'het' ? 'أداة الأسماء المحايدة' : 'أداة معظم الأسماء'}>
                {split.article}
              </span>
            )}
            {/* A real space: flex gap is not text, and the accessible name
                must stay "de fiets", not "defiets". */}
            {split.article && !hlNl?.length ? ' ' : null}
            <span lang="nl" style={{ fontFamily: 'var(--font-latin)', overflowWrap: 'anywhere', minWidth: 0 }}>
              {split.article && !hlNl?.length ? split.word : <HighlightText text={nl} indices={hlNl} />}
            </span>
            <button
              onClick={playWord}
              disabled={audioState === 'playing'}
              className="text-[var(--text-xs)] px-1.5 py-0.5 rounded border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[var(--muted)] cursor-pointer hover:text-[var(--orange-text)] hover:border-[var(--orange)]"
              title="استمع للنطق"
              aria-label={`استمع لنطق ${nl}`}
              style={{ minWidth: 44, minHeight: 44, flexShrink: 0 }}
            >{audioState === 'playing' ? '⏳' : '🔊'}</button>
          </div>
          {audioState === 'error' && <p role="alert" style={{ color: 'var(--red-text)', fontSize: 'var(--text-sm)', margin: 'var(--sp-1) 0' }}>⚠ تعذّر تشغيل الصوت. حاول مجددًا عند توفر الاتصال أو صوت هولندي على الجهاز.</p>}
          <div dir="rtl" lang="ar" className="text-[var(--text2)] text-[var(--text-base)] mt-0.5"><HighlightText text={ar} indices={hlAr} /></div>
          {ex && (
            <div className="flex items-start gap-1.5 mt-2" dir="ltr">
              <span lang="nl" className="text-[var(--text2)] text-[var(--text-sm)]" style={{ fontFamily: 'var(--font-latin)', overflowWrap: 'anywhere', minWidth: 0, lineHeight: 'var(--lh-body)' }}><HighlightText text={ex} indices={hlEx} /></span>
              <button
                onClick={() => setShowPractice((v) => !v)}
                aria-label={showPractice ? 'أخفِ تمرين النطق' : 'تدرّب على نطق جملة المثال'}
                aria-expanded={showPractice}
                title="🎙️ كرّر بعدي"
                className="text-[var(--text-2xs)] px-1 py-[1px] rounded border cursor-pointer"
                style={{
                  borderColor: showPractice ? 'var(--orange)' : 'var(--border2)',
                  color: showPractice ? 'var(--orange-text)' : 'var(--muted)',
                  background: showPractice ? 'var(--orange-l)' : 'transparent',
                  flexShrink: 0,
                  minWidth: 44,
                  minHeight: 44,
                }}
              >
                🎙️
              </button>
            </div>
          )}
          <div className="flex gap-1.5 items-center flex-wrap mt-1.5">
            <span dir="ltr" className="chip" style={{ background: lvStyle.bg, color: lvStyle.color }}>{word.level}</span>
            {!showAdd && <span className={`chip${learned ? ' chip--success' : ''}`}>{learned ? '✓ راسخة في الذاكرة' : word.reps > 0 ? '↻ قيد التعلّم' : '+ كلمة جديدة'}</span>}
            {isDue && <span className="chip chip--brand">⏰ مستحقّة للمراجعة</span>}
          </div>
        </div>
        <div className="flex gap-1.5">
          {showAdd && onAdd && (
            <button
              type="button"
              onClick={() => onAdd(word)}
              disabled={saved}
              className={`btn${saved ? ' btn--ghost' : ''}`}
              style={{ minHeight: 44 }}
              aria-label={saved ? `${nl} محفوظة في كلماتك` : `أضف ${nl} إلى كلماتي`}
            >{saved ? '✓ محفوظة' : '+ أضف إلى كلماتي'}</button>
          )}
          {onDelete && (
            <button
              onClick={() => { if (confirm('حذف هذه الكلمة؟')) onDelete(word.id) }}
              className="text-[var(--text-xs)] px-2.5 py-1.5 rounded-[var(--r-xs)] border cursor-pointer"
              style={{ minHeight: 44, minWidth: 44, borderColor: 'var(--border2)', color: 'var(--muted)', background: 'transparent' }}
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
