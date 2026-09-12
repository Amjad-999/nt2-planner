import { useAppStore, totalLearnedWords } from '@/store/useAppStore'
import { grammarSummary } from '@/features/grammar/progress'
import { nextProgressFocus } from '@/features/progress/insights'
import { dueCount as countDue } from '@/features/vocab/queue'
import { useNow } from '@/hooks/useNow'
import { Callout } from '@/components/ui/Callout'

export function ProgressOverview() {
  const vocab = useAppStore(s => s.vocab)
  const skill = useAppStore(s => s.skill)
  const grammarProgress = useAppStore(s => s.grammarProgress)
  const setActiveTab = useAppStore(s => s.setActiveTab)
  const now = useNow()
  const words = totalLearnedWords(vocab)
  const dueCount = countDue(vocab, now)
  const grammar = grammarSummary(grammarProgress)
  const focus = nextProgressFocus(skill, dueCount, grammar.completedLessons === grammar.lessonsWithExercises)

  return (
    <section aria-label="ملخّص التقدّم والخطوة التالية" style={{ marginBottom: 'var(--sp-5)' }}>
      <Callout tone="brand" icon="◎" style={{ marginBottom: 'var(--sp-4)' }}>
        <h3 style={{ margin: '0 0 var(--sp-2)', color: 'var(--text)', fontSize: 'var(--text-md)' }}>{focus.title}</h3>
        <p style={{ margin: '0 0 var(--sp-3)' }}>{focus.description}</p>
        <button type="button" className="btn-glass" onClick={() => setActiveTab(focus.tab)} style={{ minHeight: 44, padding: 'var(--sp-2) var(--sp-4)', color: 'var(--text)', fontWeight: 'var(--fw-cta)' }}>{focus.action}</button>
      </Callout>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(220px, 100%), 1fr))', gap: 'var(--sp-3)' }}>
        <article style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r)', padding: 'var(--sp-4)' }}>
          <h3 style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--text-base)', color: 'var(--text)' }}>المفردات</h3>
          <p style={{ margin: '0 0 var(--sp-2)', color: 'var(--text)' }}><strong style={{ fontSize: 'var(--text-xl)' }}>{words.learned}</strong> كلمة راسخة من {words.all}</p>
          <p style={{ margin: '0 0 var(--sp-3)', color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>{words.all - words.learned} قيد التعلّم · {dueCount} مستحقّة للمراجعة</p>
          <button type="button" className="btn-glass" onClick={() => setActiveTab('vocab')} style={{ minHeight: 44, color: 'var(--text)' }}>{words.all ? 'فتح المفردات والمراجعة' : 'إضافة أول كلماتك'}</button>
        </article>
        <article style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r)', padding: 'var(--sp-4)' }}>
          <h3 style={{ margin: '0 0 var(--sp-2)', fontSize: 'var(--text-base)', color: 'var(--text)' }}>القواعد</h3>
          <p style={{ margin: '0 0 var(--sp-2)', color: 'var(--text)' }}><strong style={{ fontSize: 'var(--text-xl)' }}>{grammar.completedLessons}</strong> درسًا مكتمل التمارين من {grammar.lessonsWithExercises}</p>
          <p style={{ margin: '0 0 var(--sp-3)', color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>{grammar.correct} إجابة صحيحة محفوظة من {grammar.total}</p>
          <button type="button" className="btn-glass" onClick={() => setActiveTab('grammar')} style={{ minHeight: 44, color: 'var(--text)' }}>{grammar.correct ? 'متابعة دروس القواعد' : 'بدء مسار القواعد'}</button>
        </article>
      </div>
    </section>
  )
}
