import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useHotkeys } from 'react-hotkeys-hook'
import { speakDutch, stopSpeak } from '@/features/tts/speakDutch'
import { useWordDetail } from '@/hooks/useWordDetail'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { useNow } from '@/hooks/useNow'
import type { VocabWord, ExamWord } from '@/store/types'
import type { FsrsQuality } from '@/features/vocab/fsrs-lite'
import { formatIntervalAr, formatWaitAr } from '@/features/vocab/fsrs-lite'
import { splitArticle } from '@/features/vocab/article'
import { Callout } from '@/components/ui/Callout'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { Button } from '@/components/ui/Button'

type FsrsEngine = typeof import('@/features/vocab/fsrs')

type Word = VocabWord | ExamWord
const getNl = (w: Word) => 'dutch' in w ? w.dutch : w.nl
const getAr = (w: Word) => 'arabic' in w ? w.arabic : w.ar
const getEx = (w: Word) => 'example' in w ? w.example : w.ex

interface Props {
  queue: Word[]
  /** gradeFlash أصبح لا-متزامنًا (يحمّل محرك FSRS ديناميكيًا عند أول نداء) */
  onGrade: (wordId: string, quality: FsrsQuality) => Promise<number> | number
  onDone: () => void
}

const GRADE_BUTTONS: {
  quality: FsrsQuality; label: string; icon: string
  color: string; bg: string; key: string
}[] = [
  { quality: 0, label: 'لم أعرفها', icon: '❌', color: 'var(--red-text)',   bg: 'var(--red-l)',   key: '1' },
  { quality: 1, label: 'صعبة',      icon: '🤔', color: 'var(--amber-text)', bg: 'var(--amber-l)', key: '2' },
  { quality: 2, label: 'عرفتها',    icon: '👍', color: 'var(--blue-text)',  bg: 'var(--blue-l)',  key: '3' },
  { quality: 3, label: 'سهلة',      icon: '✅', color: 'var(--green-text)', bg: 'var(--green-l)', key: '4' },
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
  // Grading removes due words from the parent's queue. A session keeps its
  // original order so advancing never skips the next word as that list shrinks.
  const [sessionQueue] = useState(() => [...queue])
  const [idx, setIdx]                   = useState(0)
  const [flipped, setFlipped]           = useState(false)
  const [nextInterval, setNextInterval] = useState<string | null>(null)
  const [helpOpen, setHelpOpen]         = useState(false)
  const [isGrading, setIsGrading]       = useState(false)
  const [gradeError, setGradeError]     = useState(false)
  const [audioState, setAudioState] = useState<'idle' | 'playing' | 'error'>('idle')
  /** The rating given to each reviewed card, in order — for the end summary. */
  const [results, setResults]           = useState<FsrsQuality[]>([])
  const [engine, setEngine]             = useState<FsrsEngine | null>(null)
  const reduced = useReducedMotion()
  const now = useNow()
  const revealRef = useRef<HTMLButtonElement>(null)
  const mountedRef = useRef(true)
  const advTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const gradingRef = useRef(false)
  const audioRequest = useRef(0)
  const audioActive = useRef(false)

  useEffect(() => () => {
    audioRequest.current += 1
    if (audioActive.current) {
      audioActive.current = false
      stopSpeak()
    }
  }, [idx])

  // ── Advance to next card (cancels any pending delay) ──────────────────────
  const advance = useCallback(() => {
    if (advTimerRef.current) { clearTimeout(advTimerRef.current); advTimerRef.current = null }
    setNextInterval(null)
    setFlipped(false)
    setAudioState('idle')
    gradingRef.current = false
    setIdx((current) => current + 1)
  }, [])

  const word: Word | undefined = sessionQueue[idx]

  // تفاصيل النطق من ويكاموس — تُطلَب عند قلب البطاقة فقط، لا عند عرضها:
  // البطاقات التي يتخطّاها المستخدم بلا قلب لا تستهلك طلبًا.
  const detail = useWordDetail(word ? getNl(word) : null, flipped)

  // موعد العودة لكل تقييم، يُعرض تحت الزرّ قبل الضغط: «صعبة» تصبح قرارًا
  // مفهومًا («بعد 10 دقائق») لا كلمة مجرّدة.
  const waits = useMemo(() => {
    if (!engine || !word || !flipped) return null
    try { return engine.previewWaits(word, new Date(now)) } catch { return null }
  }, [engine, word, flipped, now])

  // تسخين محرك FSRS فور فتح المراجعة — قبل أول تقييم بثوانٍ. يُحفظ أيضًا
  // لحساب موعد العودة تحت كل زرّ تقييم قبل الضغط عليه.
  useEffect(() => {
    mountedRef.current = true
    import('@/features/vocab/fsrs')
      .then((m) => { if (mountedRef.current) setEngine(m) })
      .catch(() => { /* the rating action offers a retry; buttons just lose their preview */ })
    return () => {
      mountedRef.current = false
      if (advTimerRef.current) clearTimeout(advTimerRef.current)
    }
  }, [])

  useEffect(() => {
    if (idx > 0) revealRef.current?.focus()
  }, [idx])

  const grade = async (q: FsrsQuality) => {
    if (!word || !flipped || nextInterval || gradingRef.current) return
    gradingRef.current = true
    setIsGrading(true)
    setGradeError(false)
    try {
      const days = await onGrade(word.id, q)
      if (!mountedRef.current) return
      setResults((r) => [...r, q])
      setNextInterval(formatIntervalAr(days))
      setFlipped(false)
      advTimerRef.current = setTimeout(advance, 1400)
    } catch {
      if (mountedRef.current) setGradeError(true)
      gradingRef.current = false
    } finally {
      if (mountedRef.current) setIsGrading(false)
    }
  }

  // ── Keyboard shortcuts ────────────────────────────────────────────────────
  // enableOnFormTags defaults to false in react-hotkeys-hook v5, so these
  // never fire when the user is typing in an <input> or <textarea>.
  // Hooks must run on every render (before the early returns below);
  // `enabled: !!word` keeps them inert while no card is showing.
  const hotkeyOpts = { enabled: !!word }

  // Space / Enter → flip (front only)
  useHotkeys(['space', 'enter'], (e) => {
    // Let focused controls keep their native Enter/Space activation.
    if (e.target instanceof Element && e.target.closest('button, a, input, select, textarea')) return
    e.preventDefault()
    if (!flipped && !nextInterval) setFlipped(true)
  }, hotkeyOpts)

  // 1–4 → grade (back only, not during interval display)
  useHotkeys('1', () => { if (flipped && !nextInterval) grade(0) }, hotkeyOpts)
  useHotkeys('2', () => { if (flipped && !nextInterval) grade(1) }, hotkeyOpts)
  useHotkeys('3', () => { if (flipped && !nextInterval) grade(2) }, hotkeyOpts)
  useHotkeys('4', () => { if (flipped && !nextInterval) grade(3) }, hotkeyOpts)

  // ArrowRight → flip if on front, or skip interval delay if grading
  useHotkeys('arrowright', () => {
    if (nextInterval) advance()
    else if (!flipped) setFlipped(true)
  }, hotkeyOpts)

  // Esc → exit (close help first if open, then exit)
  useHotkeys('escape', () => {
    if (helpOpen) { setHelpOpen(false); return }
    if (!gradingRef.current || nextInterval) onDone()
  }, hotkeyOpts)

  // ? → toggle help
  useHotkeys('shift+slash', (e) => { e.preventDefault(); setHelpOpen(o => !o) }, hotkeyOpts)

  if (!sessionQueue.length) {
    return (
      <Callout tone="success">
        <p style={{ margin: '0 0 var(--sp-3)' }}>لا كلمات مستحقّة الآن. ستظهر كلماتك هنا عندما يحين موعد مراجعتها.</p>
        <button className="btn-glass" onClick={onDone} style={{ minHeight: 44, padding: 'var(--sp-2) var(--sp-4)' }}>العودة إلى الكلمات</button>
      </Callout>
    )
  }

  if (!word) {
    const again = results.filter((q) => q === 0).length
    return (
      <Callout tone="success" role="status">
        <h3 style={{ margin: '0 0 var(--sp-2)', color: 'var(--text)' }}>اكتملت المراجعة</h3>
        <p style={{ margin: '0 0 var(--sp-3)' }}>راجعت {results.length} من {sessionQueue.length} كلمة، وحُدّد موعد عودة كل كلمة حسب تقييمك.</p>
        <ul style={{ listStyle: 'none', margin: '0 0 var(--sp-3)', padding: 0, display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
          {GRADE_BUTTONS.map(({ quality, label, icon }) => (
            <li key={quality} className="chip"><span aria-hidden="true">{icon}</span>{label}: {results.filter((q) => q === quality).length}</li>
          ))}
        </ul>
        {again > 0 && <p style={{ margin: '0 0 var(--sp-3)' }}>الكلمات التي لم تعرفها تعود خلال دقائق، فتكرارها اليوم يثبّتها أسرع.</p>}
        <Button variant="primary" onClick={onDone}>العودة إلى الكلمات</Button>
      </Callout>
    )
  }

  const nl = getNl(word)
  const parts = splitArticle(nl)
  const ar = getAr(word)
  const ex = getEx(word)
  const playWord = async () => {
    const request = ++audioRequest.current
    audioActive.current = true
    setAudioState('playing')
    let failed = false
    await speakDutch(nl, undefined, { onError: () => { failed = true } })
    if (mountedRef.current && audioRequest.current === request) {
      audioActive.current = false
      setAudioState(failed ? 'error' : 'idle')
    }
  }

  return (
    <div
      className="flashcard-shell"
      style={{ position: 'relative', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: 'var(--sp-8) 18px', boxShadow: 'var(--elev-2)' }}
    >
      {/* Progress + actions row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
        <div className="text-[var(--text-sm)] text-[var(--text2)]" aria-live="polite" style={{ flex: 1, textAlign: 'start' }}>الكلمة {idx + 1} من {sessionQueue.length}</div>
        <button type="button" onClick={onDone} disabled={isGrading} className="btn btn--ghost" style={{ minHeight: 44 }}>إنهاء الجلسة</button>
        <button
          onClick={() => setHelpOpen(o => !o)}
          aria-label="اختصارات لوحة المفاتيح"
          aria-expanded={helpOpen}
          aria-controls="flashcard-help"
          style={{
            width: 44, height: 44, borderRadius: 'var(--r-full)',
            border: '1px solid var(--btn-border)',
            background: helpOpen ? 'var(--orange-l)' : 'var(--btn-bg)',
            color: helpOpen ? 'var(--orange-text)' : 'var(--muted)',
            cursor: 'pointer', fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-cta)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
          }}
        >?</button>
      </div>
      <ProgressBar value={(idx / sessionQueue.length) * 100} label="تقدّم جلسة المراجعة" valueText={`${idx} من ${sessionQueue.length}`} />

      {/* Help overlay */}
      <AnimatePresence>
        {helpOpen && (
          <motion.div
            id="flashcard-help"
            role="region"
            aria-label="اختصارات لوحة المفاتيح"
            initial={reduced ? false : { opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: reduced ? 0 : 0.15 }}
            dir="rtl"
            style={{
              position: 'absolute', top: 84, insetInlineEnd: 0, zIndex: 20,
              background: 'var(--modal-bg)',
              backdropFilter: 'blur(30px) saturate(2)', WebkitBackdropFilter: 'blur(30px) saturate(2)',
              border: '1px solid var(--modal-border)',
              borderRadius: 'var(--r-sm)',
              padding: '14px 16px',
              boxShadow: 'var(--elev-2)',
              minWidth: 220, textAlign: 'start',
            }}
          >
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-cta)', color: 'var(--muted)', marginBottom: 'var(--sp-3)', letterSpacing: .5 }}>
              ⌨️ اختصارات لوحة المفاتيح
            </div>
            {/* الغلاف نفسه الذي تحمله بقيّة الجداول. هذا الجدول لا يفيض
                عمليًّا (لوحة بعرض المحتوى)، لكنّ قاعدة موحّدة أنظف من قائمة
                استثناءات تُنسى. */}
            <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse', width: '100%' }}>
              <tbody>
                {SHORTCUTS.map(({ keys, desc }) => (
                  <tr key={keys}>
                    <td style={{ paddingBottom: 6, paddingInlineEnd: 12 }}>
                      <kbd style={{
                        display: 'inline-block', padding: '1px 6px',
                        border: '1px solid var(--border2)',
                        borderRadius: 'var(--r-2xs)', background: 'var(--surface3)',
                        fontSize: 'var(--text-2xs)', fontFamily: 'inherit',
                        color: 'var(--text2)', whiteSpace: 'nowrap',
                        direction: 'ltr',
                      }}>{keys}</kbd>
                    </td>
                    <td style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', paddingBottom: 6 }}>{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)', marginTop: 'var(--sp-2)', borderTop: '1px solid var(--border)', paddingTop: 8 }}>
              الاختصارات لا تعمل أثناء الكتابة في الحقول.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <h3 dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)', fontSize: 'var(--text-3xl)', fontWeight: 'var(--fw-cta)', color: 'var(--text)', margin: 'var(--sp-4) 0 var(--sp-3)', overflowWrap: 'anywhere', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        {/* The article is part of what must be remembered — shown, not buried. */}
        {parts.article && <span className="chip chip--info" style={{ fontSize: 'var(--text-base)' }}>{parts.article}</span>}
        {/* A real space, so the accessible name stays "de afspraak" — flex gap
            is not text and screen readers would read "deafspraak". */}
        {parts.article ? ' ' : null}
        <span>{parts.word}</span>
      </h3>

      <button onClick={playWord} disabled={audioState === 'playing'}
        aria-label="استمع إلى الكلمة"
        className="btn-glass text-[var(--text-sm)] px-3 py-1.5 rounded-[var(--r-xs)] text-[var(--muted)] cursor-pointer hover:text-[var(--orange-text)]" style={{ minHeight: 44 }}>
        {audioState === 'playing' ? '⏳ جارٍ تشغيل الصوت' : '🔊 استمع'}
      </button>
      {audioState === 'error' && <Callout tone="warn" role="alert" style={{ marginTop: 'var(--sp-3)' }}>تعذّر تشغيل الصوت. يمكنك متابعة المراجعة والمحاولة مجددًا عند توفر الاتصال أو صوت هولندي على الجهاز.</Callout>}

      {/* Interval toast after grading */}
      <AnimatePresence>
        {nextInterval && (
          <motion.div key="interval" role="status" initial={reduced ? false : { opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={reduced ? undefined : { opacity: 0 }}
            style={{ marginTop: 'var(--sp-3)', padding: '8px 16px', borderRadius: 'var(--r-sm)', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', display: 'inline-block', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
            ✓ المراجعة التالية {nextInterval}
            <button
              onClick={advance}
              aria-label="التالي فوراً"
              style={{ minHeight: 44, marginInlineStart: 'var(--sp-3)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text)', fontSize: 'var(--text-sm)' }}
            >التالي</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!nextInterval && flipped ? (
          <motion.div key="back" initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={reduced ? undefined : { opacity: 0 }}>
            <div dir="rtl" lang="ar" className="mt-5 text-[var(--text-lg)] text-[var(--text)] font-medium" aria-live="polite">{ar}</div>

            {/* سطر النطق من ويكاموس. يظهر حين يصل ويختفي بلا أثر حين لا
                تتوفّر الكلمة أو ينقطع الاتصال — لا رسالة خطأ أثناء المراجعة. */}
            {detail && (detail.ipa || detail.syllables || detail.typeAR) && (
              <div
                dir="rtl"
                style={{
                  marginTop: 'var(--sp-3)', display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap',
                  justifyContent: 'center', alignItems: 'center',
                  fontSize: 'var(--text-xs)', color: 'var(--muted)',
                }}
              >
                {detail.ipa && (
                  <span dir="ltr" style={{ fontFamily: 'var(--font-latin)' }} title="النطق بالأبجدية الصوتية">
                    /{detail.ipa}/
                  </span>
                )}
                {detail.syllables && (
                  <span dir="ltr" style={{ fontFamily: 'var(--font-latin)' }} title="تقطيع المقاطع">
                    {detail.syllables}
                  </span>
                )}
                {detail.typeAR && <span>{detail.typeAR}</span>}
              </div>
            )}

            {ex
              ? <div dir="ltr" lang="nl" className="mt-2.5 text-[var(--text-base)] text-[var(--text2)]" style={{ fontFamily: 'var(--font-latin)', overflowWrap: 'anywhere', lineHeight: 'var(--lh-body)' }}>{ex}</div>
              /* لا مثال محفوظ مع الكلمة — ويكاموس يسدّ الفراغ بمثال حقيقي */
              : detail?.examples[0] && (
                <div
                  dir="ltr" lang="nl"
                  className="mt-2.5 text-[var(--text-sm)] text-[var(--text2)] italic"
                  style={{ fontFamily: 'var(--font-latin)' }}
                >
                  "{detail.examples[0]}"
                </div>
              )}
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', margin: 'var(--sp-5) 0 var(--sp-2)' }}>كيف كان تذكّرك للمعنى قبل إظهاره؟</p>
            {gradeError && <Callout tone="danger" role="alert">تعذّر حفظ التقييم. اختر تقييمك مرة أخرى للمحاولة.</Callout>}
            <div className="grid grid-cols-2 gap-2" aria-busy={isGrading}>
              {GRADE_BUTTONS.map(({ quality, label, icon, color, bg, key }) => (
                <button key={quality} type="button" onClick={() => grade(quality)} disabled={isGrading}
                  aria-label={waits ? `${label} — تعود ${formatWaitAr(waits[quality])}` : label}
                  style={{ minHeight: 56, color, borderColor: color, background: bg, borderRadius: 'var(--r-sm)', padding: 'var(--sp-2) var(--sp-3)', border: '1px solid', cursor: isGrading ? 'wait' : 'pointer', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-0)' }}>
                  <span>
                    <span aria-hidden="true" style={{ opacity: .6, fontSize: 'var(--text-2xs)', marginInlineEnd: 'var(--sp-1)' }}>{key}</span>
                    <span aria-hidden="true">{icon}</span> {label}
                  </span>
                  {/* ما يفعله الزرّ فعلًا: موعد عودة الكلمة إن اخترته */}
                  {waits && <span aria-hidden="true" style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-body)', color: 'var(--text2)' }}>{formatWaitAr(waits[quality])}</span>}
                </button>
              ))}
            </div>
          </motion.div>
        ) : !nextInterval ? (
          <motion.div key="front" className="mt-5" initial={reduced ? false : { opacity: 0 }} animate={{ opacity: 1 }}>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', margin: '0 0 var(--sp-3)' }}>تذكّر معنى الكلمة، ثم أظهر الإجابة.</p>
            <Button ref={revealRef} variant="primary" size="lg" block onClick={() => setFlipped(true)}>
              إظهار المعنى
            </Button>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}
