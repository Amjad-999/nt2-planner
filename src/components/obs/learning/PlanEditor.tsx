import { useObs } from '@/hooks/useObs'
import { useNow } from '@/hooks/useNow'
import { todayKey } from '@/lib/utils'
import { CONTEXTS } from '@/features/observatory/state'
import { CONTEXT_AR } from '@/features/observatory/format'
import type { ContextKey, SessionLength } from '@/features/observatory/types'
import { useDebouncedText } from '../useDebouncedText'
import { ICheck } from '../icons'

/* A simple, editable study plan: which weekdays, how long, which situations
   to favour. The week strip below keeps planned and done visibly apart —
   an outlined day is a plan, a filled day is a finished session. */

const DAYS_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const DAYS_SHORT = ['أحد', 'اثنين', 'ثلاثاء', 'أربعاء', 'خميس', 'جمعة', 'سبت']

export function PlanEditor() {
  const [o, update] = useObs()
  const now = useNow()
  const plan = o.plan
  const [note, setNote] = useDebouncedText(plan.note, (v) => update((x) => ({ ...x, plan: { ...x.plan, note: v.slice(0, 1000) }, updatedAt: Date.now() })))
  const setPlan = (patch: Partial<typeof plan>) => update((x) => ({ ...x, plan: { ...x.plan, ...patch }, updatedAt: Date.now() }))
  const toggleDay = (d: number) => setPlan({ days: plan.days.includes(d) ? plan.days.filter((x) => x !== d) : [...plan.days, d].sort() })
  const toggleFocus = (c: ContextKey) => setPlan({ focus: plan.focus.includes(c) ? plan.focus.filter((x) => x !== c) : [...plan.focus, c] })

  // Last 7 days: planned (from the weekday plan) vs. done (finished sessions).
  const week = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now - (6 - i) * 86_400_000)
    const key = todayKey(d)
    const done = o.history.filter((h) => todayKey(new Date(h.finishedAt)) === key)
    return { key, dow: d.getDay(), planned: plan.days.includes(d.getDay()), done: done.length, mins: done.reduce((n, h) => n + h.actualMin, 0) }
  })

  return (
    <div className="o-stack">
      <div>
        <h3 className="o-label" id="week-title">آخر 7 أيام</h3>
        <ol className="o-week" aria-labelledby="week-title">
          {week.map((d) => (
            <li key={d.key} className={`o-week__day${d.planned ? ' is-planned' : ''}${d.done ? ' is-done' : ''}`}>
              <span className="o-week__dot" aria-hidden="true">{d.done ? <ICheck size={14} /> : null}</span>
              <span className="o-small" aria-hidden="true">{DAYS_SHORT[d.dow]}</span>
              <span className="o-sr">{DAYS_AR[d.dow]}: {d.planned ? 'مخطط' : 'غير مخطط'}، {d.done ? `${d.done} جلسة منجزة (${Math.round(d.mins)} دقيقة فعلية)` : 'لا جلسة منجزة'}</span>
            </li>
          ))}
        </ol>
        <p className="o-small">إطار = يوم مخطط · ممتلئ مع ✓ = جلسة منجزة فعلًا.</p>
      </div>

      <fieldset className="o-ctx-pick">
        <legend className="o-label" style={{ marginBottom: 8 }}>أيام الدراسة</legend>
        {DAYS_AR.map((name, d) => (
          <label key={d}><input type="checkbox" checked={plan.days.includes(d)} onChange={() => toggleDay(d)} /><span>{name}</span></label>
        ))}
      </fieldset>

      <fieldset className="o-ctx-pick">
        <legend className="o-label" style={{ marginBottom: 8 }}>مدة الجلسة (تقدير)</legend>
        {([20, 25, 30] as SessionLength[]).map((m) => (
          <label key={m}><input type="radio" name="plan-len" checked={o.settings.sessionMinutes === m}
            onChange={() => update((x) => ({ ...x, settings: { ...x.settings, sessionMinutes: m }, updatedAt: Date.now() }))} /><span>{m} دقيقة</span></label>
        ))}
      </fieldset>

      <fieldset className="o-ctx-pick">
        <legend className="o-label" style={{ marginBottom: 8 }}>مواقف أريد التركيز عليها</legend>
        {CONTEXTS.map((c) => (
          <label key={c}><input type="checkbox" checked={plan.focus.includes(c)} onChange={() => toggleFocus(c)} /><span>{CONTEXT_AR[c]}</span></label>
        ))}
      </fieldset>

      <label className="o-field">
        <span className="o-label">ملاحظة للخطة</span>
        <textarea className="o-textarea" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثلًا: موعد عند الطبيب يوم الخميس — أتدرّب على المكالمة قبله." />
      </label>
    </div>
  )
}
