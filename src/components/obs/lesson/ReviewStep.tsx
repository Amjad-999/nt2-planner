import { motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { activeMinutes, estTotal, finishSession } from '@/features/observatory/session'
import { evidenceOf } from '@/features/observatory/evidence'
import { mins } from '@/features/observatory/format'
import { EASE_EMPH } from '@/features/observatory/motion'
import { useMotionLevel } from '@/hooks/useObs'
import { StepFrame, type StepProps } from './shared'
import { WordToken } from '../WordToken'
import { Button, StageBadge } from '../ui'
import { ICheckCircle } from '../icons'

/* Step 7 — a concise review. The session's word objects assemble into one
   row (≤ 700 ms, once), next to the plain facts of what was done: answers,
   sentences, retelling, recall, and planned vs. measured time. */

export function ReviewStep({ item, run, readOnly, update, onComplete }: StepProps) {
  const level = useMotionLevel()
  const o = useAppStore((s) => s.observatory)
  const qa = run.questionIds.map((id) => run.answers.questions[id]).filter(Boolean)
  const first = qa.filter((a) => a.correct && a.tries === 1).length
  const builds = run.buildIds.map((id) => run.answers.builds[id]).filter(Boolean)
  const recalled = run.recall.filter((t) => ['correct', 'close'].includes(run.answers.recall[t.id]?.result ?? '')).length
  const own = run.wordIds.filter((id) => run.answers.words[id]?.ownResult === 'independent').length
  const saved = run.wordIds.filter((id) => o.expressions[id]?.savedAt)
  const actual = activeMinutes(run)
  const rt = run.answers.retell

  const finish = () => {
    update((x) => finishSession(x, saved, Date.now()).o)
    onComplete()
  }

  return (
    <StepFrame kicker="STAP 07 · TERUGBLIK" title="هذا ما أنجزته في الجلسة" lede="حقائق لا نسب: ما فعلته فعلًا، وما يستحق الرجوع إليه.">
      <div className="o-night o-assembly" aria-label="كلمات الجلسة">
        {run.wordIds.map((id, i) => {
          const x = item.expressions.find((e) => e.id === id)
          if (!x) return null
          const stage = evidenceOf(o.expressions[id], o.settings.activeRule).stage
          return (
            <motion.div key={id}
              initial={level === 'reduced' ? { opacity: 0 } : { opacity: 0, y: 26, scale: 0.9, rotateX: 30 }}
              animate={{ opacity: 1, y: 0, scale: 1, rotateX: 0 }}
              transition={level === 'reduced' ? { duration: 0.12 } : { duration: 0.55, delay: 0.06 * i, ease: EASE_EMPH }}
              style={{ display: 'grid', justifyItems: 'center', gap: 8 }}>
              <WordToken nl={x.nl} gloss={x.ar} tone={o.expressions[id]?.savedAt ? 'mint' : 'paper'} />
              <StageBadge stage={stage} />
            </motion.div>
          )
        })}
      </div>

      <div className="o-stats" style={{ marginTop: 16 }}>
        <div><b>{first}/{qa.length || run.questionIds.length}</b><span>أسئلة صحيحة من المحاولة الأولى</span></div>
        <div><b>{builds.filter((b) => b.correct).length}/{run.buildIds.length}</b><span>جمل بنيتها بترتيب صحيح</span></div>
        <div><b>{own}</b><span>جمل كتبتها بنفسك (استخدام مستقل)</span></div>
        <div><b>{recalled}/{run.recall.length}</b><span>عناصر تذكّرتها من الذاكرة</span></div>
        <div><b>{rt.skipped ? '—' : rt.recordingId ? `${Math.round(rt.durationSec)}s` : rt.typed ? '✓' : '—'}</b><span>{rt.skipped ? 'إعادة السرد: تُخطّيت' : rt.recordingId ? 'إعادة سرد مسجّلة' : rt.typed ? 'إعادة سرد مكتوبة' : 'إعادة السرد'}</span></div>
        <div><b>{mins(actual)}/{estTotal(run)}</b><span>دقائق فعلية / مخطَّطة</span></div>
      </div>

      <p className="o-small" style={{ marginTop: 12 }}>
        {saved.length ? `حفظت ${saved.length} تعابير في «كلماتي». ` : 'لم تحفظ تعابير هذه المرة — يمكنك ذلك من «كلماتي». '}
        الحالات (شوهِد ← تدرّب ← استخدام مستقل ← نشِط) تتغيّر فقط بما تفعله أنت.
      </p>

      {!readOnly && (
        <div className="o-actions">
          <Button variant="primary" icon={ICheckCircle} onClick={finish} data-testid="finish-session">أنهِ الجلسة</Button>
        </div>
      )}
    </StepFrame>
  )
}
