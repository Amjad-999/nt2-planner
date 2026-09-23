import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { BuildExercise } from '@/features/observatory/types'
import { recordBuild, setSub } from '@/features/observatory/session'
import { checkBuild, buildSentence } from '@/features/observatory/evaluate'
import { noteDifficulty } from '@/features/observatory/insights'
import { revealVariants } from '@/features/observatory/motion'
import { useMotionLevel } from '@/hooks/useObs'
import { StepFrame, SpeakButton, type StepProps } from './shared'
import { useDraft } from './useDraft'
import { Button, Feedback } from '../ui'
import { IArrowRight } from '../icons'
import { TileBuilder } from '../TileBuilder'

/* Step 4 — two sentence-building exercises. Tap (or Enter/Space) a tile to
   place it, tap a placed tile to send it back: no dragging required. Undo and
   clear make every move reversible. The first wrong check marks which tiles
   sit right and names the rule; the second shows the sentence. */

export function BuildStep(p: StepProps) {
  const { item, run, readOnly, onComplete, update } = p
  const n = run.buildIds.length
  const sub = Math.min(run.subIndex, n - 1)
  if (readOnly) {
    return (
      <StepFrame kicker="STAP 04 · ZINNEN BOUWEN · TERUGBLIK" title="الجمل التي بنيتها">
        <ul className="o-list">
          {run.buildIds.map((id) => {
            const ex = item.builds.find((b) => b.id === id)
            const a = run.answers.builds[id]
            return ex ? (
              <li key={id} className="o-card">
                <span className="o-nl" lang="nl">{buildSentence(ex.tokens.map((_, i) => i), ex)}</span>
                <span className="o-small">{a?.correct ? `صحيحة${a.tries > 1 ? ' في المحاولة ' + a.tries : ''}` : a ? 'عُرضت الجملة الصحيحة' : 'لم تُحل'} · {ex.ruleAr}</span>
              </li>
            ) : null
          })}
        </ul>
      </StepFrame>
    )
  }
  const ex = item.builds.find((b) => b.id === run.buildIds[sub])
  if (!ex) return <StepFrame kicker="STAP 04" title="هذا التمرين لم يعد متاحًا"><div><Button variant="primary" onClick={onComplete}>تابِع</Button></div></StepFrame>
  const next = () => (sub + 1 < n ? update((o) => setSub(o, sub + 1, Date.now())) : onComplete())
  return <BuildCard key={ex.id} ex={ex} index={sub} total={n} {...p} onNext={next} />
}

function BuildCard({ ex, index, total, run, update, onNext }: StepProps & { ex: BuildExercise; index: number; total: number; onNext: () => void }) {
  const level = useMotionLevel()
  const saved = run.answers.builds[ex.id]
  const [raw, setRaw] = useDraft(run, `b:${ex.id}`, update)
  const [checkedAt, setCheckedAt] = useState<string | null>(saved && !saved.correct ? raw : null)
  const order = raw ? raw.split(',').map(Number).filter((x) => Number.isInteger(x) && x >= 0 && x < ex.tokens.length) : []
  const resolved = !!saved && (saved.correct || saved.tries >= 2)
  const result = checkedAt !== null && checkedAt === raw ? checkBuild(order, ex) : null
  const set = (o: number[]) => setRaw(o.join(','))
  const complete = order.length === ex.tokens.length

  const check = () => {
    const r = checkBuild(order, ex)
    const tries = (saved?.tries ?? 0) + 1
    setCheckedAt(raw)
    update((o) => {
      let x = recordBuild(o, ex.id, { order, tries, correct: r.correct }, Date.now())
      if (!r.correct) x = noteDifficulty(x, ex.rule === 'v2' ? 'v2-inversion' : 'verb-final', buildSentence(order, ex), Date.now())
      return x
    })
  }

  const sentence = buildSentence(order, ex)
  const correctSentence = buildSentence(ex.tokens.map((_, i) => i), ex)

  return (
    <StepFrame kicker={`STAP 04 · ZINNEN BOUWEN · ${index + 1}/${total}`} title={ex.promptAr} lede="اضغط الكلمات بالترتيب الصحيح. اضغط كلمة موضوعة لإعادتها.">
      <TileBuilder ex={ex} order={order} onChange={set} result={result} locked={resolved} solvedRight={!!saved?.correct} />

      <div aria-live="polite" style={{ marginTop: 14 }}>
        <AnimatePresence mode="wait" initial={false}>
          {saved?.correct && (
            <motion.div key="ok" variants={revealVariants(level)} initial="hidden" animate="show" exit="exit">
              <Feedback tone="right" title="جملة صحيحة."><p className="o-nl" lang="nl">{sentence}</p><p className="o-small">{ex.ruleAr}</p></Feedback>
            </motion.div>
          )}
          {saved && !saved.correct && saved.tries < 2 && result && (
            <motion.div key="try" variants={revealVariants(level)} initial="hidden" animate="show" exit="exit">
              <Feedback tone="wrong" title="ليست بالترتيب الصحيح بعد.">
                <p>الكلمات المعلَّمة بـ ✓ في مكانها. {result.hint === 'verb-second' ? 'انتبه لمكان الفعل: بعد كلمة الزمن في البداية يأتي الفعل ثانيًا.' : result.hint === 'verb-final' ? 'انتبه لمكان الفعل: في هذه الجملة الداخلية يذهب إلى الآخر.' : 'راجع ترتيب بقية الكلمات.'}</p>
              </Feedback>
            </motion.div>
          )}
          {saved && !saved.correct && saved.tries >= 2 && (
            <motion.div key="show" variants={revealVariants(level)} initial="hidden" animate="show" exit="exit">
              <Feedback tone="info" title="الجملة الصحيحة:"><p className="o-nl" lang="nl">{correctSentence}</p><p className="o-small">{ex.ruleAr}</p></Feedback>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="o-actions">
        {resolved ? (
          <>
            <Button variant="primary" iconEnd={IArrowRight} flipEnd onClick={onNext}>{index + 1 < total ? 'الجملة التالية' : 'إلى إعادة السرد'}</Button>
            <SpeakButton text={correctSentence} label="استمع للجملة" />
          </>
        ) : (
          <>
            <Button variant="primary" onClick={check} disabled={!complete || (result !== null && !result.correct && checkedAt === raw)}>
              {saved ? 'تحقّق مرة أخرى' : 'تحقّق'}
            </Button>
            <span className="o-small">{!complete ? `ضع كل الكلمات (${order.length}/${ex.tokens.length}).` : result && !result.correct ? 'غيّر ترتيب كلمة واحدة على الأقل ثم تحقّق.' : ''}</span>
          </>
        )}
      </div>
    </StepFrame>
  )
}
