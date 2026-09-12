import { useAppStore } from '@/store/useAppStore'
import { useTodayPlan, REVIEW_BATCH } from '@/hooks/useTodayPlan'
import { nextTask, weakest, dueCount, type DailyTask } from '@/features/plan/todayPlan'
import { setNavIntent } from '@/lib/navIntent'
import { useNow } from '@/hooks/useNow'
import { SKILL_AR } from '@/data/phases'
import { Button } from '@/components/ui/Button'
import { SKILL_NL } from './lastMock'

/** Why each kind of step matters — one sentence, so the button is never a bare order. */
const WHY: Record<string, string> = {
  mock: 'المؤقّت يعمل منذ بدأت. إكماله الآن يعطيك نتيجة يمكن مقارنتها بالامتحان الحقيقي.',
  vocab: 'مراجعة الكلمة في موعدها تنقلها إلى الذاكرة الطويلة، وتأجيلها يضيّع جزءًا ممّا تعلّمته.',
  program: 'دروس اليوم هي ما يُبقيك على جدولك حتى موعد الامتحان.',
  focus: 'تدريب قصير يساعدك على معرفة ما يحتاج إلى مراجعة قبل المحاولة التالية.',
  grammar: 'درس قصير مع تمارينه يثبّت قاعدة واحدة تستعملها في الكتابة والتحدّث.',
  minutes: 'الانتظام اليومي أنفع من جلسات طويلة متقطّعة.',
}

/**
 * The one dominant action on the home screen: what to do now, why, and what
 * comes after it. It is the first unfinished row of today's checklist — the
 * same object TodayPlan renders below — so the two can never disagree.
 */
export function TodayFocus({ onStartSession }: { onStartSession: () => void }) {
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const skill = useAppStore((s) => s.skill)
  const vocab = useAppStore((s) => s.vocab)
  const now = useNow()
  const plan = useTodayPlan()
  const task = nextTask(plan)
  const focus = weakest(skill)

  const open = (t: DailyTask) => {
    if (t.id === 'vocab') setNavIntent({ to: 'vocab', view: 'review' })
    if (t.id === 'focus') setNavIntent({ to: 'exam', view: focus })
    if (t.id === 'mock') setNavIntent({ to: 'exam', view: 'mock' })
    if (t.id === 'minutes') return onStartSession()
    setActiveTab(t.tab)
  }

  const cta = (t: DailyTask): string => {
    switch (t.id) {
      case 'mock': return 'أكمل الامتحان'
      case 'vocab': return `راجع ${Math.min(dueCount(vocab, now), REVIEW_BATCH)} كلمة الآن`
      case 'program': return 'افتح دروس اليوم'
      case 'focus': return `تدرّب على ${SKILL_AR[focus]}`
      case 'grammar': return 'افتح درس القواعد'
      default: return 'ابدأ جلسة اليوم'
    }
  }

  const index = task ? plan.tasks.indexOf(task) : -1
  const after = task ? plan.tasks.slice(index + 1).find((t) => !t.done) : null

  return (
    <section
      aria-labelledby="next-step-title"
      style={{
        padding: 'var(--hero-pad-y) var(--hero-pad-x)',
        borderRadius: 'var(--r)',
        background: 'var(--surface3)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--elev-2)',
        marginBottom: 'var(--sp-4)',
      }}
    >
      {task ? (
        <>
          <p className="eyebrow">خطوتك التالية · {plan.doneCount + 1} من {plan.tasks.length}</p>
          <h2 id="next-step-title" style={{ margin: '0 0 var(--sp-1)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-cta)', color: 'var(--text)', lineHeight: 'var(--lh-heading)' }}>
            {task.id === 'focus' ? <>{task.ar} <span dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)' }}>({SKILL_NL[focus]})</span></> : task.ar}
          </h2>
          <p style={{ margin: '0 0 var(--sp-1)', color: 'var(--text)', fontSize: 'var(--text-base)' }}>{task.detailAr}</p>
          <p style={{ margin: '0 0 var(--sp-4)', color: 'var(--text2)', fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-arabic)' }}>{WHY[task.id]}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <Button variant="primary" size="lg" icon="▶" onClick={() => open(task)}>{cta(task)}</Button>
            {task.tab !== 'plan' && (
              <Button variant="ghost" onClick={onStartSession}>برنامج اليوم الكامل</Button>
            )}
          </div>
          {after && (
            <p style={{ margin: 'var(--sp-3) 0 0', color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>
              بعدها: {after.ar}
            </p>
          )}
        </>
      ) : (
        <>
          <p className="eyebrow"><span aria-hidden="true">✓ </span>اكتملت مهام اليوم</p>
          <h2 id="next-step-title" style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-cta)', color: 'var(--text)', lineHeight: 'var(--lh-heading)' }}>
            أحسنت. أنجزت كلّ ما خُطِّط لليوم.
          </h2>
          <p style={{ margin: '0 0 var(--sp-4)', color: 'var(--text2)', fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-arabic)' }}>
            إن كان لديك وقت إضافي، تدرّب على موقف من الحياة اليومية بجمل ستحتاجها فعلًا.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
            <Button variant="primary" size="lg" icon="💬" onClick={() => setActiveTab('situations')}>تدرّب على موقف يومي</Button>
            <Button variant="ghost" onClick={onStartSession}>برنامج اليوم</Button>
          </div>
        </>
      )}
    </section>
  )
}
