import { useEffect, useRef, useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RoleplayScenario, RoleplayRun } from '@/features/observatory/types'
import { addTurn, setRoleplayDraft, undoTurn, finishRoleplay } from '@/features/observatory/roleplay'
import { stepVariants, revealVariants } from '@/features/observatory/motion'
import { playDutch } from '@/features/observatory/speech'
import { useObs, useMotionLevel } from '@/hooks/useObs'
import { todayKey } from '@/lib/utils'
import { useDebouncedText } from '../useDebouncedText'
import { VoiceRecorder } from '../VoiceRecorder'
import { SpeakButton } from '../lesson/shared'
import { Button, Chip, Meta, Nl } from '../ui'
import { IArrowRight, IArrowLeft, ILightbulb, IArrowCounterClockwise, IMicrophone, IKeyboard, IChatCircleText, IInfo } from '../icons'

/* A role-play in progress. The partner's line, the learner's turn, the
   transcript so far. No correction interrupts the exchange: issues are
   gathered and shown only in the review. Voice is an alternative to typing
   (recording only — nothing is transcribed). */

export function RoleplayView({ sc, run, onBack }: { sc: RoleplayScenario; run: RoleplayRun; onBack: () => void }) {
  const [o, update] = useObs()
  const level = useMotionLevel()
  const i = run.turns.length
  const spec = sc.turns[i]
  const ended = i >= sc.turns.length
  const [draft, setDraft] = useDebouncedText(run.draft, (v) => update((x) => setRoleplayDraft(x, v, Date.now())))
  const [hint, setHint] = useState(false)
  const [mode, setMode] = useState<'type' | 'speak'>('type')
  const [pendingRec, setPendingRec] = useState('')
  const [msg, setMsg] = useState('')
  const inputRef = useRef<HTMLTextAreaElement>(null)
  // After a reply the next turn mounts once the previous one has animated out;
  // focus then goes to its input (or to the closing heading).
  const focusNext = useRef('')
  const onTurn = (el: HTMLElement | null) => {
    // Only the ENTERING turn takes focus (the exiting one re-renders too).
    if (!el || !focusNext.current || el.dataset.turn !== focusNext.current) return
    focusNext.current = ''
    el.querySelector<HTMLElement>('textarea, h2')?.focus({ preventScroll: true })
  }
  const autoplay = o.settings.audioAutoplay

  // Optional: speak the partner's new line (setting «تشغيل تلقائي»).
  useEffect(() => {
    if (autoplay && spec) void playDutch(spec.partnerNl)
  }, [autoplay, spec])

  const send = (e?: FormEvent) => {
    e?.preventDefault()
    if (!draft.trim() && !pendingRec) { setMsg('اكتب ردّك أو سجّله أولًا.'); return }
    setMsg('')
    const text = draft
    const rec = pendingRec
    update((x) => addTurn(x, text, rec, Date.now()))
    setDraft('')
    setPendingRec('')
    setHint(false)
    focusNext.current = i + 1 >= sc.turns.length ? 'end' : String(i + 1)
  }

  return (
    <div className="o-rp">
      <div className="o-row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <Button variant="ghost" icon={IArrowLeft} flipIcon onClick={onBack}>كل المواقف</Button>
        <Chip tone="neutral" icon={IInfo}>محاور بسيناريو ثابت: لا يفهم ردّك، بل يتابع الحوار</Chip>
      </div>

      <header className="o-night o-rp__head">
        <Meta>{`ROLLENSPEL · ${sc.titleNl.toUpperCase()} · ${Math.min(i + 1, sc.turns.length)}/${sc.turns.length}`}</Meta>
        <h1 className="o-h2">{sc.titleAr}</h1>
        <p className="o-lede">{sc.situationAr}</p>
        <Nl as="p" className="o-rp__role">{sc.roleNl}</Nl>
      </header>

      <ol className="o-rp__log" aria-label="الحوار حتى الآن">
        {run.turns.map((t, k) => (
          <li key={k} className="o-rp__pair">
            <Bubble who="partner" label={sc.partnerAr} text={sc.turns[k].partnerNl} />
            <Bubble who="me" label="أنت" text={t.text || '(ردّ صوتي مسجّل)'} />
          </li>
        ))}
      </ol>

      <AnimatePresence mode="wait" initial={false}>
        {!ended ? (
          <motion.section ref={onTurn} data-turn={String(i)} key={i} variants={stepVariants(level)} initial="enter" animate="center" exit="exit" className="o-step-plane o-rp__turn" aria-labelledby="rp-turn-title">
            <Bubble who="partner" label={sc.partnerAr} text={spec.partnerNl} current />
            <SpeakButton text={spec.partnerNl} label="استمع للجملة" />
            <h2 id="rp-turn-title" className="o-h3" style={{ marginTop: 14 }}>دورك: {spec.goalAr}</h2>
            <div className="o-row">
              <Button size="sm" variant="ghost" icon={ILightbulb} aria-expanded={hint} onClick={() => setHint(!hint)}>{hint ? 'أخفِ التلميح' : 'تلميح: بداية جملة'}</Button>
              <div className="o-seg" role="radiogroup" aria-label="طريقة الرد">
                <label><input type="radio" name="rp-mode" checked={mode === 'type'} onChange={() => setMode('type')} /><span><IKeyboard size={16} />&nbsp;اكتب</span></label>
                <label><input type="radio" name="rp-mode" checked={mode === 'speak'} onChange={() => setMode('speak')} /><span><IMicrophone size={16} />&nbsp;تحدّث</span></label>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {hint && (
                <motion.p key="hint" className="o-help__rung" variants={revealVariants(level)} initial="hidden" animate="show" exit="exit" style={{ display: 'block' }}>
                  <span className="o-nl" lang="nl">{spec.hintNl}</span>
                </motion.p>
              )}
            </AnimatePresence>

            {mode === 'speak' && (
              <div style={{ marginTop: 12 }}>
                <VoiceRecorder key={i} maxSec={45} target="5–20" onSaved={(id) => setPendingRec(id)} onDiscard={() => setPendingRec('')} onTypeInstead={() => setMode('type')} />
              </div>
            )}
            <form onSubmit={send} className="o-field" style={{ marginTop: 12 }} noValidate>
              <label className="o-label" htmlFor="rp-input">{mode === 'speak' ? 'اكتب ما قلته (اختياري — يسمح بمراجعة اللغة)' : 'ردّك بالهولندية'}</label>
              <textarea id="rp-input" ref={inputRef} className="o-textarea" lang="nl" dir="ltr" rows={3} value={draft}
                onChange={(e) => { setDraft(e.target.value); setMsg('') }}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) send() }} />
              {msg && <p role="alert" className="o-small" style={{ color: 'var(--o-error-ink)' }}>{msg}</p>}
              <div className="o-actions" style={{ marginTop: 8 }}>
                <Button type="submit" variant="primary" icon={IChatCircleText}>أرسل الرد <span className="o-kbd">Ctrl+Enter</span></Button>
                {i > 0 && <Button variant="ghost" icon={IArrowCounterClockwise} onClick={() => { focusNext.current = String(i - 1); update((x) => undoTurn(x, Date.now())) }}>تراجع عن ردّي السابق</Button>}
              </div>
            </form>
          </motion.section>
        ) : (
          <motion.section ref={onTurn} data-turn="end" key="end" variants={stepVariants(level)} initial="enter" animate="center" exit="exit" className="o-step-plane">
            <Bubble who="partner" label={sc.partnerAr} text={sc.closingNl} current />
            <h2 className="o-h3" tabIndex={-1} style={{ marginTop: 14, outline: 'none' }}>انتهى الحوار.</h2>
            <p className="o-small">الآن فقط نعرض ما جمعناه أثناء الحوار: جملك، ونسخة أكثر طبيعية، وشرح قصير واحد لكل ردّ.</p>
            <div className="o-actions">
              <Button variant="primary" iconEnd={IArrowRight} flipEnd onClick={() => update((x) => finishRoleplay(x, sc, Date.now(), todayKey()))}>اعرض المراجعة</Button>
              <Button variant="ghost" icon={IArrowCounterClockwise} onClick={() => { focusNext.current = String(sc.turns.length - 1); update((x) => undoTurn(x, Date.now())) }}>عدّل ردّي الأخير</Button>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}

export function Bubble({ who, label, text, current }: { who: 'partner' | 'me'; label: string; text: string; current?: boolean }) {
  return (
    <div className={`o-bubble o-bubble--${who}${current ? ' is-current' : ''}`}>
      <span className="o-bubble__who">{label}</span>
      <p className="o-nl" lang="nl">{text}</p>
    </div>
  )
}
