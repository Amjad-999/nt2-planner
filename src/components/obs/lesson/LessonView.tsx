import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LessonItem, SessionRun, StepKind } from '@/features/observatory/types'
import { completeStep, touchStep, remainingEst, STEP_AR } from '@/features/observatory/session'
import { stepVariants, layoutTransition } from '@/features/observatory/motion'
import { useObs, useMotionLevel, useMedia } from '@/hooks/useObs'
import { LessonLayers } from '../LessonLayers'
import { Sheet } from '../Sheet'
import { StatusStrip } from '../StatusStrip'
import { Button, Meta, Nl, Notice } from '../ui'
import { IArrowRight, IBookmarkSimple, IArrowLeft } from '../icons'
import { ContextPanel } from './ContextPanel'
import { useActiveTime } from './useActiveTime'
import type { StepProps } from './shared'
import { InputStep } from './InputStep'
import { QuestionsStep } from './QuestionsStep'
import { WordsStep } from './WordsStep'
import { BuildStep } from './BuildStep'
import { RetellStep } from './RetellStep'
import { RecallStep } from './RecallStep'
import { ReviewStep } from './ReviewStep'

/* ── The focused lesson ─────────────────────────────────────────────────────
   One activity plane dominates. Around it: an exit that saves, the lesson
   layers (finished steps can be reopened read-only), and supporting context
   (side panel on wide screens, a sheet elsewhere). The plane that opens
   first shares its layoutId with Today's "next" card, so resuming reads as
   the summary expanding into the activity. */

const STEPS: Record<StepKind, (p: StepProps) => React.ReactNode> = {
  input: InputStep, questions: QuestionsStep, words: WordsStep, build: BuildStep,
  retell: RetellStep, recall: RecallStep, review: ReviewStep,
}

export function LessonView({ item, run, onExit }: { item: LessonItem; run: SessionRun; onExit: () => void }) {
  const [, update] = useObs()
  const level = useMotionLevel()
  const wide = useMedia('(min-width: 1200px)')
  const [review, setReview] = useState<number | null>(null)
  const [ctxOpen, setCtxOpen] = useState(false)
  const [entryStep] = useState(run.stepIndex)
  const heading = useRef<HTMLDivElement>(null)
  // Focus follows the activity: when a step plane mounts (after the previous
  // one's exit animation), its heading takes focus — on entry too.
  const focusNext = useRef<string>('*')
  const onPlane = (el: HTMLElement | null) => {
    // Only the ENTERING plane takes focus ('*' = whichever mounts first).
    if (!el || !focusNext.current || (focusNext.current !== '*' && el.dataset.plane !== focusNext.current)) return
    focusNext.current = ''
    el.querySelector<HTMLElement>('.o-step__title')?.focus({ preventScroll: true })
  }
  const flush = useActiveTime(update)
  const shown = review ?? run.stepIndex
  const kind = run.steps[shown].kind
  const Step = STEPS[kind]

  // Lesson chrome: hide the phone bottom bar, start at the top.
  useEffect(() => {
    document.documentElement.setAttribute('data-lesson', 'open')
    window.scrollTo({ top: 0 })
    return () => document.documentElement.removeAttribute('data-lesson')
  }, [])

  // Stamp the step's start once it is actually on screen.
  useEffect(() => { update((o) => touchStep(o, Date.now())) }, [run.stepIndex, update])

  const complete = () => {
    flush()
    if (kind === 'review') { onExit(); return }
    focusNext.current = `${run.steps[Math.min(run.stepIndex + 1, run.steps.length - 1)].kind}-live`
    update((o) => completeStep(o, Date.now()))
    requestAnimationFrame(() => heading.current?.scrollIntoView({ block: 'start', behavior: level === 'reduced' ? 'auto' : 'smooth' }))
  }

  const exit = () => { flush(); onExit() }
  const q = kind === 'questions' ? item.questions.find((x) => x.id === run.questionIds[Math.min(run.subIndex, run.questionIds.length - 1)]) : undefined

  return (
    <div className="o-lesson">
      <StatusStrip />
      <div className="o-lesson-head">
        <Button variant="ghost" icon={IArrowLeft} flipIcon onClick={exit} className="o-lesson-exit">
          <span>احفظ واخرج</span>
        </Button>
        <div className="o-lesson-head__title">
          <Nl display className="is-italic">{item.titleNl}</Nl>
          <Meta>{`STAP ${shown + 1}/7 · NOG ≈ ${remainingEst(run)} MIN`}</Meta>
        </div>
        {!wide && (
          <Button size="sm" variant="secondary" icon={IBookmarkSimple} onClick={() => setCtxOpen(true)} aria-haspopup="dialog">السياق والمفردات</Button>
        )}
      </div>

      <LessonLayers steps={run.steps.map((s) => ({ kind: s.kind, done: !!s.doneAt }))} current={run.stepIndex} viewing={shown}
        onSelect={(i) => { focusNext.current = `${run.steps[i].kind}-${i === run.stepIndex ? 'live' : 'review'}`; setReview(i === run.stepIndex ? null : i) }} />
      <p className="o-sr" aria-live="polite">{`الخطوة ${run.stepIndex + 1} من 7: ${STEP_AR[run.steps[run.stepIndex].kind]}`}</p>

      <div className="o-lesson-grid">
        <div ref={heading} style={{ scrollMarginTop: 140 }}>
          {review !== null && (
            <div style={{ marginBottom: 12 }}>
              <Notice tone="info" title={`تراجع: ${STEP_AR[kind]}.`}
                actions={<Button size="sm" variant="secondary" iconEnd={IArrowRight} flipEnd onClick={() => { focusNext.current = `${run.steps[run.stepIndex].kind}-live`; setReview(null) }}>العودة إلى الخطوة الحالية</Button>}>
                هذه خطوة مكتملة للعرض فقط؛ لا شيء هنا يغيّر تقدّمك.
              </Notice>
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.section
              ref={onPlane}
              data-plane={`${kind}-${review === null ? 'live' : 'review'}`}
              key={`${kind}-${review === null ? 'live' : 'review'}`}
              className="o-step-plane"
              layoutId={level !== 'reduced' && review === null && shown === entryStep ? 'o-step-plane' : undefined}
              transition={layoutTransition(level)}
              variants={stepVariants(level)} initial="enter" animate="center" exit="exit"
              aria-label={STEP_AR[kind]}
            >
              <Step item={item} run={run} readOnly={review !== null} onComplete={complete} update={update} />
            </motion.section>
          </AnimatePresence>
        </div>
        {wide && (
          <aside className="o-lesson-aside o-plane" aria-label="السياق والمفردات">
            <ContextPanel item={item} showText={shown > 0} />
          </aside>
        )}
      </div>

      {!wide && ctxOpen && (
        <Sheet title="السياق والمفردات" onClose={() => setCtxOpen(false)}
          pinned={q ? <p className="o-small">السؤال الحالي: <span className="o-nl" lang="nl">{q.promptNl}</span></p> : undefined}>
          <ContextPanel item={item} showText={shown > 0} />
        </Sheet>
      )}
    </div>
  )
}
