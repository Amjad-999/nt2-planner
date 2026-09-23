import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { RecallTarget } from '@/features/observatory/types'
import { recordRecall, setSub } from '@/features/observatory/session'
import { checkTyped } from '@/features/observatory/evaluate'
import { addUse } from '@/features/observatory/evidence'
import { noteDifficulty } from '@/features/observatory/insights'
import { revealVariants } from '@/features/observatory/motion'
import { todayKey } from '@/lib/utils'
import { useMotionLevel } from '@/hooks/useObs'
import { StepFrame, type StepProps } from './shared'
import { useDraft } from './useDraft'
import { Button, Feedback, Chip } from '../ui'
import { IArrowRight } from '../icons'

/* Step 6 — retrieve two previously learned items from memory.
   Sources, in order: expressions from earlier sessions, the learner's own
   vocabulary list, and (first session only) this session's words — each
   labelled, so "previously learned" never overstates. */

const SOURCE_AR: Record<RecallTarget['source'], string> = {
  expression: 'من جلسة سابقة',
  vocab: 'من قائمة كلماتك',
  session: 'من بداية هذه الجلسة',
}

export function RecallStep(p: StepProps) {
  const { run, readOnly, onComplete, update } = p
  const n = run.recall.length
  if (n === 0) {
    return (
      <StepFrame kicker="STAP 06 · HERHALEN" title="لا توجد عناصر سابقة للتذكّر بعد">
        <p className="o-small">بعد جلستك الأولى ستعود هنا كلمات من جلسات سابقة.</p>
        <div className="o-actions"><Button variant="primary" onClick={onComplete}>إلى المراجعة</Button></div>
      </StepFrame>
    )
  }
  if (readOnly) {
    return (
      <StepFrame kicker="STAP 06 · HERHALEN · TERUGBLIK" title="ما تذكّرته">
        <ul className="o-list">
          {run.recall.map((t) => {
            const a = run.answers.recall[t.id]
            return <li key={t.id} className="o-card"><span className="o-nl" lang="nl">{t.answer}</span><span className="o-small">{t.ar} · {a?.result === 'correct' || a?.result === 'close' ? 'تذكّرتها' : a ? 'عُرضت بعد محاولتين' : 'لم تُجب'}</span></li>
          })}
        </ul>
      </StepFrame>
    )
  }
  const sub = Math.min(run.subIndex, n - 1)
  const t = run.recall[sub]
  const next = () => (sub + 1 < n ? update((o) => setSub(o, sub + 1, Date.now())) : onComplete())
  return <RecallCard key={t.id} t={t} index={sub} total={n} {...p} onNext={next} />
}

function RecallCard({ t, index, total, run, update, item, onNext }: StepProps & { t: RecallTarget; index: number; total: number; onNext: () => void }) {
  const level = useMotionLevel()
  const a = run.answers.recall[t.id]
  const [typed, setTyped] = useDraft(run, `r:${t.id}`, update)
  const [msg, setMsg] = useState('')
  const done = a?.result === 'correct' || a?.result === 'close' || (a?.tries ?? 0) >= 2

  const check = (e: FormEvent) => {
    e.preventDefault()
    if (done) { onNext(); return }
    const r = checkTyped(typed, t.answer)
    if (!r) { setMsg('اكتب ما تتذكّره أولًا.'); return }
    setMsg('')
    const now = Date.now()
    const tries = (a?.tries ?? 0) + 1
    update((o) => {
      let x = recordRecall(o, t.id, { typed, result: r, tries }, now)
      if ((r === 'correct' || r === 'close') && t.source !== 'vocab') x = addUse(x, t.id, 'practised', item.context, typed, 'recall', now, todayKey())
      if (r === 'wrong' && tries >= 2) x = noteDifficulty(x, 'recall', t.answer, now)
      return x
    })
  }

  return (
    <StepFrame kicker={`STAP 06 · HERHALEN · ${index + 1}/${total}`} title="تذكّر من الذاكرة، بلا نظر">
      <form onSubmit={check} noValidate className="o-plane o-plane--raised" style={{ display: 'grid', gap: 12 }}>
        <div className="o-row"><Chip tone="cobalt">{SOURCE_AR[t.source]}</Chip></div>
        <p className="o-h3">ما التعبير الهولندي لـ «{t.ar}»؟</p>
        {t.cue && <p className="o-nl o-example" lang="nl">{t.cue}</p>}
        <label className="o-field">
          <span className="o-label">إجابتك</span>
          <input className="o-input" lang="nl" dir="ltr" autoComplete="off" autoCapitalize="off" spellCheck={false} value={typed} readOnly={done}
            onChange={(e) => { setTyped(e.target.value); setMsg('') }} aria-invalid={a?.result === 'wrong' && !done ? true : undefined} />
        </label>
        {msg && <p role="alert" className="o-small" style={{ color: 'var(--o-error-ink)' }}>{msg}</p>}
        <div aria-live="polite">
          <AnimatePresence mode="wait" initial={false}>
            {a?.result && (
              <motion.div key={`${a.result}-${a.tries}`} variants={revealVariants(level)} initial="hidden" animate="show" exit="exit">
                {a.result === 'correct' && <Feedback tone="right" title="تذكّرتها." />}
                {a.result === 'close' && <Feedback tone="close" title="قريبة — محسوبة."><p>الإملاء: <b className="o-nl" lang="nl">{t.answer}</b></p></Feedback>}
                {a.result === 'wrong' && a.tries < 2 && <Feedback tone="wrong" title="ليست هي بعد."><p>تبدأ بـ <b className="o-nl" lang="nl">{t.answer.slice(0, 2)}…</b></p></Feedback>}
                {a.result === 'wrong' && a.tries >= 2 && <Feedback tone="info" title="الإجابة:"><p><b className="o-nl" lang="nl">{t.answer}</b> — ستعود إليك في جلسة قادمة.</p></Feedback>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="o-actions">
          <Button type="submit" variant="primary" iconEnd={done ? IArrowRight : undefined} flipEnd>
            {done ? (index + 1 < total ? 'التالي' : 'إلى مراجعة الجلسة') : a ? 'تحقّق مرة أخرى' : 'تحقّق'}
          </Button>
        </div>
      </form>
    </StepFrame>
  )
}
