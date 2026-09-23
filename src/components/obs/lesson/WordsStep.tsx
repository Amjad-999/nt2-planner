import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { ContextKey, ExpressionSeed } from '@/features/observatory/types'
import { recordWord, setSub } from '@/features/observatory/session'
import { checkTyped, classifyOwnSentence } from '@/features/observatory/evaluate'
import { addUse, ensureExpression, saveExpression } from '@/features/observatory/evidence'
import { revealVariants, layoutTransition } from '@/features/observatory/motion'
import { CONTEXT_AR } from '@/features/observatory/format'
import { CONTEXTS } from '@/features/observatory/state'
import { todayKey } from '@/lib/utils'
import { useMotionLevel } from '@/hooks/useObs'
import { useAppStore } from '@/store/useAppStore'
import { StepFrame, SpeakButton, type StepProps } from './shared'
import { useDraft } from './useDraft'
import { WordToken } from '../WordToken'
import { Button, Feedback, Chip } from '../ui'
import { IArrowRight, IBookmarkSimple, ICheck, INotePencil, ITranslate } from '../icons'

/* Step 3 — up to four useful words/expressions.
   Open the word (spatial expansion into its meaning in context), recall it
   into a new sentence, optionally write one's own sentence, save it.
   Recall right after seeing = "practised". Only a sentence of one's own,
   not a copy of anything on screen, counts as "used independently". */

export function WordsStep(p: StepProps) {
  const { item, run, readOnly, onComplete, update } = p
  const n = run.wordIds.length
  const sub = Math.min(run.subIndex, n - 1)
  if (readOnly) {
    return (
      <StepFrame kicker="STAP 03 · WOORDEN · TERUGBLIK" title="كلمات هذه الجلسة">
        <div className="o-assembly">
          {run.wordIds.map((id) => {
            const x = item.expressions.find((e) => e.id === id)
            const a = run.answers.words[id]
            return x ? <WordToken key={id} nl={x.nl} gloss={`${x.ar}${a?.ownResult === 'independent' ? ' · جملتك ✓' : ''}`} /> : null
          })}
        </div>
      </StepFrame>
    )
  }
  const seed = item.expressions.find((e) => e.id === run.wordIds[sub])
  if (!seed) {
    return (
      <StepFrame kicker="STAP 03 · WOORDEN" title="هذه الكلمة لم تعد متاحة">
        <div><Button variant="primary" onClick={onComplete}>تابِع</Button></div>
      </StepFrame>
    )
  }
  const next = () => (sub + 1 < n ? update((o) => setSub(o, sub + 1, Date.now())) : onComplete())
  return <WordCard key={seed.id} seed={seed} index={sub} total={n} {...p} onNext={next} />
}

function WordCard({ seed, index, total, item, run, update, onNext }: StepProps & { seed: ExpressionSeed; index: number; total: number; onNext: () => void }) {
  const level = useMotionLevel()
  const assist = useAppStore((s) => s.observatory.settings.assistLang)
  const saved = useAppStore((s) => !!s.observatory.expressions[seed.id]?.savedAt)
  const a = run.answers.words[seed.id]
  const [open, setOpen] = useState(!!a)
  const [showAr, setShowAr] = useState(false)
  const [typed, setTyped] = useDraft(run, `wt:${seed.id}`, update)
  const [own, setOwn] = useDraft(run, `wo:${seed.id}`, update)
  const [ctx, setCtx] = useState<ContextKey>((a?.ownContext || seed.contexts[0]) as ContextKey)
  const [msg, setMsg] = useState('')

  const recallDone = a?.result === 'correct' || a?.result === 'close' || (a?.tries ?? 0) >= 2
  const counted = a?.ownResult === 'independent'
  const clozeFull = seed.clozeNl.replace('___', seed.answer)

  const openWord = () => {
    setOpen(true)
    update((o) => ensureExpression(o, seed, item, Date.now()))
  }

  const checkRecall = (e: FormEvent) => {
    e.preventDefault()
    if (recallDone) return
    const r = checkTyped(typed, seed.answer)
    if (!r) { setMsg('اكتب الكلمة أولًا.'); return }
    setMsg('')
    const now = Date.now()
    update((o) => {
      let x = recordWord(o, seed.id, { typed, result: r, tries: (a?.tries ?? 0) + 1 }, now)
      if (r === 'correct' || r === 'close') x = addUse(ensureExpression(x, seed, item, now), seed.id, 'practised', item.context, typed, 'lesson', now, todayKey())
      return x
    })
  }

  const checkOwn = () => {
    const shown = [seed.example, clozeFull, ...item.paragraphs]
    const r = classifyOwnSentence(own, seed, shown)
    const now = Date.now()
    update((o) => {
      let x = recordWord(o, seed.id, { own, ownContext: ctx, ownResult: r }, now)
      if (r === 'independent' && !counted) x = addUse(ensureExpression(x, seed, item, now), seed.id, 'independent', ctx, own, 'lesson', now, todayKey())
      return x
    })
  }

  const toggleSave = () => update((o) => saveExpression(o, seed, item, Date.now(), !saved))

  return (
    <StepFrame kicker={`STAP 03 · WOORDEN · ${index + 1}/${total}`} title={open ? 'افهمها، تذكّرها، استخدمها' : 'افتح الكلمة'}
      lede={open ? undefined : 'اضغط على الكلمة لترى معناها في النص.'}>
      <div className="o-word">
        {!open ? (
          <div className="o-night o-word__stage">
            <WordToken nl={seed.nl} onOpen={openWord} layoutId={`w-${seed.id}`} label={`افتح: ${seed.nl}`} />
          </div>
        ) : (
          <motion.div className="o-word__detail" layoutId={level === 'reduced' ? undefined : `w-${seed.id}`} transition={layoutTransition(level, 'panel')}>
            <div className="o-row" style={{ justifyContent: 'space-between' }}>
              <p className="o-nl-display" lang="nl">{seed.nl}</p>
              <div className="o-row" style={{ gap: 6 }}>
                <SpeakButton text={seed.nl} />
                <Button size="sm" variant={saved ? 'secondary' : 'ghost'} icon={IBookmarkSimple} aria-pressed={saved} onClick={toggleSave}>
                  {saved ? 'محفوظة في «كلماتي» (اضغط للإلغاء)' : 'احفظ في «كلماتي»'}
                </Button>
              </div>
            </div>
            <p className="o-small">في النص:</p>
            <p className="o-example o-nl" lang="nl"><ExampleWithWord example={seed.example} seed={seed} /></p>
            <p><span className="o-small">بهولندية أبسط: </span><span className="o-nl" lang="nl">{seed.simpleNl}</span></p>
            {assist === 'ar' && (showAr
              ? <p><span className="o-small">بالعربية: </span><b>{seed.ar}</b></p>
              : <div><Button size="sm" variant="ghost" icon={ITranslate} onClick={() => setShowAr(true)}>أظهر المعنى بالعربية</Button></div>)}
          </motion.div>
        )}

        {open && (
          <form className="o-part" onSubmit={checkRecall} noValidate>
            <div className="o-part__head"><Chip tone="cobalt">تذكّر</Chip><span className="o-small">أكمل جملة جديدة من الذاكرة.</span></div>
            <label className="o-field">
              <span className="o-label o-nl" lang="nl">{seed.clozeNl}</span>
              <input className={`o-input${recallDone && a?.result !== 'wrong' ? ' o-input--ok' : ''}`} lang="nl" dir="ltr" autoComplete="off" autoCapitalize="off" spellCheck={false}
                value={typed} onChange={(e) => { setTyped(e.target.value); setMsg('') }} readOnly={recallDone}
                aria-invalid={a?.result === 'wrong' && !recallDone ? true : undefined} placeholder="اكتب الكلمة الناقصة" />
            </label>
            {msg && <p role="alert" className="o-small" style={{ color: 'var(--o-error-ink)' }}>{msg}</p>}
            <div aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                {a?.result && (
                  <motion.div key={`${a.result}-${a.tries}`} variants={revealVariants(level)} initial="hidden" animate="show" exit="exit">
                    {a.result === 'correct' && <Feedback tone="right" title="صحيح." />}
                    {a.result === 'close' && <Feedback tone="close" title="قريب جدًا — محسوبة صحيحة."><p>الإملاء: <b className="o-nl" lang="nl">{seed.answer}</b></p></Feedback>}
                    {a.result === 'wrong' && a.tries < 2 && <Feedback tone="wrong" title="ليست هي — جرّب مرة أخرى."><p>تلميح: تبدأ بـ <b className="o-nl" lang="nl">{seed.answer.slice(0, 2)}…</b> ({seed.answer.length} أحرف).</p></Feedback>}
                    {a.result === 'wrong' && a.tries >= 2 && <Feedback tone="info" title="الكلمة هي:"><p><b className="o-nl" lang="nl">{clozeFull}</b></p><p className="o-small">لا بأس — ستعود إليها في «تذكّر ما سبق».</p></Feedback>}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            {!recallDone && <div><Button type="submit" variant="secondary">تحقّق</Button></div>}
          </form>
        )}

        {open && recallDone && (
          <div className="o-part">
            <div className="o-part__head"><Chip tone="coral" icon={INotePencil}>استخدمها بنفسك</Chip><span className="o-small">اختياري، لكنه الدليل الأقوى على التعلّم.</span></div>
            <label className="o-field">
              <span className="o-label">اكتب جملة من حياتك بـ <span className="o-nl" lang="nl">{seed.nl}</span></span>
              <textarea className="o-textarea" lang="nl" dir="ltr" rows={2} value={own} onChange={(e) => setOwn(e.target.value)} placeholder="Bijvoorbeeld over uw eigen week…" />
            </label>
            <fieldset className="o-ctx-pick">
              <legend className="o-small" style={{ marginBottom: 6 }}>في أي موقف ستقولها؟</legend>
              {CONTEXTS.map((c) => (
                <label key={c}><input type="radio" name={`ctx-${seed.id}`} checked={ctx === c} onChange={() => setCtx(c)} /><span>{CONTEXT_AR[c]}</span></label>
              ))}
            </fieldset>
            <div aria-live="polite">
              {a?.ownResult === 'independent' && <Feedback tone="right" title="محسوبة: استخدام مستقل." icon={ICheck}><p className="o-small">جملة من كتابتك في سياق «{CONTEXT_AR[a.ownContext || ctx]}». تستطيع تعديلها؛ لن تُحسب مرتين.</p></Feedback>}
              {a?.ownResult === 'copied' && <Feedback tone="close" title="قريبة جدًا من جملة معروضة — لا تُحسب استخدامًا مستقلًا."><p className="o-small">غيّرها لتصف موقفًا من حياتك أنت.</p></Feedback>}
              {a?.ownResult === 'missing' && <Feedback tone="close" title="لم نجد التعبير في جملتك."><p className="o-small">استخدم <span className="o-nl" lang="nl">{seed.nl}</span> (أو أحد تصريفاته) داخل الجملة.</p></Feedback>}
              {a?.ownResult === 'too-short' && <Feedback tone="close" title="اكتب جملة كاملة."><p className="o-small">أربع كلمات على الأقل، مع فعل.</p></Feedback>}
            </div>
            <div><Button variant="secondary" onClick={checkOwn} disabled={!own.trim()}>تحقّق من جملتي</Button></div>
          </div>
        )}

        {open && recallDone && (
          <div className="o-actions">
            <Button variant="primary" iconEnd={IArrowRight} flipEnd onClick={onNext}>{index + 1 < total ? 'الكلمة التالية' : 'إلى بناء الجمل'}</Button>
            {!own.trim() && <span className="o-small">يمكنك المتابعة بلا جملة خاصة.</span>}
          </div>
        )}
      </div>
    </StepFrame>
  )
}

/** Bold the expression's words inside its example sentence. */
function ExampleWithWord({ example, seed }: { example: string; seed: ExpressionSeed }) {
  const stems = seed.match.flat().map((s) => s.toLowerCase()).filter((s) => s.length >= 3)
  return (
    <>
      {example.split(/(\s+)/).map((w, i) => {
        const bare = w.toLowerCase().replace(/[^a-zà-ÿ]/g, '')
        return bare && stems.some((s) => bare.startsWith(s)) ? <b key={i}>{w}</b> : <span key={i}>{w}</span>
      })}
    </>
  )
}
