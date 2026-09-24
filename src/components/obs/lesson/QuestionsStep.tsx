import { useState, type FormEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import type { LessonQuestion } from '@/features/observatory/types'
import { recordQuestion, setSub } from '@/features/observatory/session'
import { noteDifficulty } from '@/features/observatory/insights'
import { revealVariants } from '@/features/observatory/motion'
import { useMotionLevel } from '@/hooks/useObs'
import { useAppStore } from '@/store/useAppStore'
import { StepFrame, Passage, SpeakButton, Highlight, type StepProps } from './shared'
import { useDraft } from './useDraft'
import { Button, Feedback, Notice } from '../ui'
import { ILightbulb, IArrowRight, ICheck, IX } from '../icons'

/* Step 2 — up to three comprehension questions, one at a time.
   The text stays still beside the question. Help opens rung by rung
   (keyword + where → simpler Dutch → Arabic) and never shows the answer.
   A first wrong attempt explains why THAT option is wrong and invites a
   second try; only after the second try is the right option revealed —
   always with the supporting sentence and the paraphrase that links them. */

const LETTERS = ['A', 'B', 'C', 'D']

export function QuestionsStep(p: StepProps) {
  const { item, run, readOnly, onComplete, update } = p
  const n = run.questionIds.length
  if (readOnly) return <QuestionsReview {...p} />
  const sub = Math.min(run.subIndex, n - 1)
  const q = item.questions.find((x) => x.id === run.questionIds[sub])
  if (!q) return <Notice tone="warn" title="هذا السؤال لم يعد متاحًا.">يمكنك المتابعة إلى الخطوة التالية.<Button size="sm" onClick={onComplete}>تابِع</Button></Notice>
  const next = () => (sub + 1 < n ? update((o) => setSub(o, sub + 1, Date.now())) : onComplete())
  return <QuestionCard key={q.id} q={q} index={sub} total={n} {...p} onNext={next} />
}

function QuestionCard({ q, index, total, item, run, update, onNext }: StepProps & { q: LessonQuestion; index: number; total: number; onNext: () => void }) {
  const level = useMotionLevel()
  const assist = useAppStore((s) => s.observatory.settings.assistLang)
  const saved = run.answers.questions[q.id]
  const [choice, setChoice] = useDraft(run, `q:${q.id}`, update)
  const [helpRaw, setHelpRaw] = useDraft(run, `h:${q.id}`, update)
  const [wrongRaw, setWrongRaw] = useDraft(run, `w:${q.id}`, update)
  const [error, setError] = useState('')
  const help = Math.min(3, Number(helpRaw) || 0)
  const maxHelp = assist === 'ar' ? 3 : 2
  const wrong = wrongRaw ? wrongRaw.split(',') : []
  const tries = saved?.tries ?? 0
  const resolved = !!saved && (saved.correct || saved.tries >= 2)
  const wrongOnce = !!saved && !saved.correct && saved.tries === 1
  const shownSupport = resolved ? q.support : null

  const check = (e?: FormEvent) => {
    e?.preventDefault()
    if (resolved) { onNext(); return }
    if (!choice) { setError('اختر إجابة أولًا — لا يوجد جواب يُحسب قبل محاولتك.'); return }
    setError('')
    const correct = choice === q.correct
    update((o) => {
      const now = Date.now()
      let x = recordQuestion(o, q.id, { choice, tries: tries + 1, correct, help }, now)
      if (!correct) x = noteDifficulty(x, q.skill, q.promptNl, now)
      return x
    })
    if (!correct) {
      setWrongRaw([...wrong, choice].join(','))
      if (tries + 1 < 2) setChoice('')
    }
  }

  const chosen = q.options.find((o) => o.id === (saved?.choice ?? ''))
  const right = q.options.find((o) => o.id === q.correct)!

  return (
    <StepFrame kicker={`STAP 02 · BEGRIJPEN · VRAAG ${index + 1}/${total}`} title="اختر الإجابة التي يدعمها النص"
      lede="ابحث في النص عن الجملة التي تجيب عن السؤال، ثم اختر.">
      <div className="o-q-grid">
        <div className="o-q-passage">
          <details open className="o-plane o-plane--raised o-q-details">
            <summary><span className="o-nl-display" lang="nl">{item.titleNl}</span><span className="o-small"> · النص</span></summary>
            <Passage item={item} locate={help >= 1 && !resolved ? q.support.paragraph : null} support={shownSupport} />
          </details>
        </div>

        <form className="o-plane o-plane--raised o-q-panel" onSubmit={check} noValidate>
          <p className="o-q-prompt o-nl" lang="nl"><Highlight text={q.promptNl} keywords={q.keywords} on={help >= 1} /></p>
          <div className="o-row" style={{ marginBottom: 12 }}>
            <SpeakButton text={q.promptNl} label="استمع للسؤال" />
            {!resolved && help < maxHelp && (
              <Button size="sm" variant="ghost" icon={ILightbulb} onClick={() => setHelpRaw(String(help + 1))} aria-controls={`help-${q.id}`}>
                {help === 0 ? 'مساعدة' : 'مساعدة إضافية'} <span className="o-meta" style={{ color: 'inherit' }}>{help + 1}/{maxHelp}</span>
              </Button>
            )}
          </div>

          <div id={`help-${q.id}`} className="o-help" aria-live="polite">
            <AnimatePresence initial={false}>
              {help >= 1 && (
                <motion.div key="h1" className="o-help__rung" variants={revealVariants(level)} initial="hidden" animate="show" exit="exit">
                  <span className="o-help__n">1</span>
                  <p>الكلمة المفتاحية مظلّلة في السؤال: <b className="o-nl" lang="nl">{q.keywords.join(' · ')}</b>. {q.locateAr} (الفقرة التي تبحث فيها مظلّلة في النص.)</p>
                </motion.div>
              )}
              {help >= 2 && (
                <motion.div key="h2" className="o-help__rung" variants={revealVariants(level)} initial="hidden" animate="show" exit="exit">
                  <span className="o-help__n">2</span>
                  <p>بهولندية أبسط: <span className="o-nl" lang="nl">{q.simpleNl}</span></p>
                </motion.div>
              )}
              {help >= 3 && (
                <motion.div key="h3" className="o-help__rung" variants={revealVariants(level)} initial="hidden" animate="show" exit="exit">
                  <span className="o-help__n">3</span>
                  <p>{q.explainAr}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <fieldset className={`o-options${resolved ? ' is-locked' : ''}`} style={{ marginTop: 14 }}>
            <legend className="o-sr">الخيارات</legend>
            {q.options.map((opt, i) => {
              const isRight = resolved && opt.id === q.correct
              const isWrong = wrong.includes(opt.id)
              const selected = choice === opt.id && !resolved
              const cls = ['o-option', selected ? 'is-selected' : '', isRight ? 'is-right' : '', isWrong ? 'is-wrong' : '', resolved && !isRight && !isWrong ? 'is-dim' : ''].join(' ')
              return (
                <label key={opt.id} className={cls}>
                  <input type="radio" name={`opt-${q.id}`} value={opt.id} checked={choice === opt.id || (resolved && saved?.choice === opt.id)}
                    disabled={resolved || isWrong} onChange={() => { setChoice(opt.id); setError('') }} />
                  <span className="o-option__key" aria-hidden="true">{LETTERS[i]}</span>
                  <span className="o-option__text o-nl" lang="nl">{opt.textNl}</span>
                  {isRight && <span className="o-option__mark"><ICheck size={16} />صحيح</span>}
                  {isWrong && <span className="o-option__mark"><IX size={16} />ليس هذا</span>}
                </label>
              )
            })}
          </fieldset>
          {error && <p role="alert" className="o-small" style={{ color: 'var(--o-error-ink)', marginTop: 8 }}>{error}</p>}

          <div aria-live="polite" style={{ marginTop: 14 }}>
            <AnimatePresence mode="wait" initial={false}>
              {saved && (
                <motion.div key={`${saved.tries}-${saved.correct}`} variants={revealVariants(level)} initial="hidden" animate="show" exit="exit">
                  {saved.correct ? (
                    <Feedback tone="right" title={saved.tries === 1 ? 'صحيح من المحاولة الأولى.' : 'صحيح.'}>
                      <p>{right.whyAr}</p>
                      <Paraphrase q={q} />
                    </Feedback>
                  ) : wrongOnce ? (
                    <Feedback tone="wrong" title="ليس هذا بعد — لديك محاولة أخرى.">
                      <p>{chosen?.whyAr}</p>
                      <p className="o-small">{help === 0 ? 'افتح «مساعدة» لترى الكلمة المفتاحية ومكان البحث.' : 'أعد قراءة الفقرة المظلّلة، وابحث عن كلمة بالمعنى نفسه.'}</p>
                    </Feedback>
                  ) : (
                    <Feedback tone="info" title={`الإجابة الصحيحة: ${LETTERS[q.options.indexOf(right)]}`}>
                      <p>{right.whyAr}</p>
                      <Paraphrase q={q} />
                    </Feedback>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {resolved && (
              <details className="o-evaluate">
                <summary>قيّم اختيارك: لماذا الخيارات الأخرى غير صحيحة؟</summary>
                <ul className="o-list" style={{ marginTop: 8 }}>
                  {q.options.filter((o) => o.id !== q.correct).map((o) => (
                    <li key={o.id} className="o-small"><span className="o-nl" lang="nl">{o.textNl}</span> — {o.whyAr}</li>
                  ))}
                </ul>
              </details>
            )}
          </div>

          <div className="o-actions">
            <Button type="submit" variant="primary" iconEnd={resolved ? IArrowRight : undefined} flipEnd>
              {resolved ? (index + 1 < total ? 'السؤال التالي' : 'إلى الكلمات') : wrongOnce ? 'تحقّق مرة أخرى' : 'تحقّق'}
            </Button>
          </div>
        </form>
      </div>
    </StepFrame>
  )
}

function Paraphrase({ q }: { q: LessonQuestion }) {
  return (
    <div className="o-paraphrase">
      <p className="o-small">الجملة الداعمة مظلّلة في النص. إعادة الصياغة:</p>
      <p><span className="o-small">في النص: </span><b className="o-nl" lang="nl">{q.paraphrase.text}</b></p>
      <p><span className="o-small">في الخيار: </span><b className="o-nl" lang="nl">{q.paraphrase.option}</b></p>
    </div>
  )
}

function QuestionsReview({ item, run }: StepProps) {
  return (
    <StepFrame kicker="STAP 02 · BEGRIJPEN · TERUGBLIK" title="مراجعة أسئلة الفهم" lede="إجاباتك كما سجّلتها. لا شيء هنا يغيّر تقدّمك.">
      <ul className="o-list">
        {run.questionIds.map((id, i) => {
          const q = item.questions.find((x) => x.id === id)
          const a = run.answers.questions[id]
          if (!q) return null
          const right = q.options.find((o) => o.id === q.correct)!
          return (
            <li key={id} className="o-card">
              <span className="o-meta">VRAAG {i + 1}</span>
              <strong className="o-nl" lang="nl">{q.promptNl}</strong>
              <span className="o-nl" lang="nl">{right.textNl}</span>
              <span className="o-small">{!a ? 'لم تُجب بعد.' : a.correct ? (a.tries === 1 ? 'صحيح من المحاولة الأولى' : 'صحيح في المحاولة الثانية') : 'عُرضت الإجابة بعد محاولتين'}{a?.help ? ` · استخدمت ${a.help} درجة مساعدة` : ''}</span>
              <span className="o-small">الجملة الداعمة: <span className="o-nl" lang="nl">{q.support.sentences.join(' ')}</span></span>
            </li>
          )
        })}
      </ul>
    </StepFrame>
  )
}
