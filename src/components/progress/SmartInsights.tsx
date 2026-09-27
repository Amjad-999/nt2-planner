import { useAppStore, weakestSkill, sumLastNDays, sumPrevNDays, planHealth } from '@/store/useAppStore'
import { SKILL_AR } from '@/data/phases'
import { InsightCard } from '@/components/InsightCard'
import { Reveal } from '@/components/MotionFx'
import { dueCount } from '@/features/vocab/queue'
import { useNow } from '@/hooks/useNow'

type Insight = { kind: 'good' | 'warn' | 'bad' | ''; icon: string; title: string; desc: string }

/**
 * رؤى ذكية — observations derived from real state, ranked by urgency.
 * Three are shown; the rest sit behind a disclosure, so nothing is dropped
 * but the page stops showing six cards of equal visual weight.
 */
export function SmartInsights() {
  const examDate = useAppStore((s) => s.examDate)
  const planDay = useAppStore((s) => s.planDay)
  const planStart = useAppStore((s) => s.planStart)
  const done = useAppStore((s) => s.done)
  const vocab = useAppStore((s) => s.vocab)
  const skill = useAppStore((s) => s.skill)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const minutesPerTask = useAppStore((s) => s.prefs.minutesPerTask)
  const studyDayMinutes = useAppStore((s) => s.prefs.studyDayMinutes)
  const now = useNow()

  const weekM = sumLastNDays(dailyHistory, 'mins', 7)
  const lastWM = sumPrevNDays(dailyHistory, 'mins', 7, 7)
  const wkSk = weakestSkill(skill)
  const wkBest = skill[wkSk]?.best ?? 0
  const ph = planHealth({ examDate, planDay, done, planStart }, { minutesPerTask, studyDayMinutes })
  const due = dueCount(vocab, now)
  const remDays = Math.max(0, ph.left ?? 0)

  const insights: Insight[] = []
  if (ph.status === 'ok') insights.push({ kind: 'good', icon: '🎯', title: 'أنت على المسار الصحيح', desc: `إيقاعك جيّد. حافظ على نحو ${ph.needMins} دقيقة يوميًّا.` })
  else if (ph.status === 'tight') insights.push({ kind: 'warn', icon: '⚠️', title: 'الكثافة مشدودة', desc: `ارفع الإيقاع إلى نحو ${ph.needMins} دقيقة يوميًّا وأنجز المهام المتأخّرة أوّلًا.` })
  else insights.push({ kind: 'bad', icon: '🚨', title: 'حالة حرجة — أعد توزيع المهام', desc: `تحتاج نحو ${ph.needMins} دقيقة يوميًّا. افتح خطة الدراسة وأعد توزيع ما تبقّى.` })
  insights.push(skill[wkSk]?.attempts || wkBest
    ? { kind: '', icon: '🧭', title: `تدرّب على ${SKILL_AR[wkSk]}`, desc: `أفضل نتيجة مسجّلة لهذه المهارة ${wkBest}%. جرّب تدريبًا جديدًا وراجع الأخطاء.` }
    : { kind: '', icon: '🧭', title: `جرّب مهارة ${SKILL_AR[wkSk]}`, desc: 'لا توجد نتيجة مسجّلة لهذه المهارة. ستساعدك أول محاولة على تحديد نقطة البداية.' })
  if (weekM > lastWM && lastWM > 0) insights.push({ kind: 'good', icon: '📈', title: 'هذا الأسبوع أفضل', desc: `درست ${weekM - lastWM} دقيقة أكثر من الأسبوع الماضي.` })
  else if (lastWM > 0 && weekM < lastWM) insights.push({ kind: 'warn', icon: '📉', title: 'تباطؤ ملحوظ', desc: `انخفضت دقائق هذا الأسبوع بـ ${lastWM - weekM} دقيقة. جلسة قصيرة اليوم تكفي.` })
  if (due > 0) insights.push({ kind: 'warn', icon: '⏰', title: `${due} كلمة وصلت موعد المراجعة`, desc: 'مراجعتها الآن تحفظها في الذاكرة الطويلة.' })
  else insights.push({ kind: 'good', icon: '✅', title: 'لا توجد كلمات مستحقّة الآن', desc: 'استثمر الوقت في إضافة كلمات جديدة من المواضيع.' })
  if (remDays > 0) insights.push({ kind: '', icon: '📅', title: `${remDays} يومًا حتى الامتحان`, desc: 'استخدم الوقت المتبقي لمراجعة أخطائك ومحاولة تدريب كاملة. لا يمكن استنتاج نتيجة الامتحان من عدد الأيام.' })

  /* الرؤى تُرتَّب بالإلحاح لا بترتيب الإنشاء: ما يحتاج تصرّفًا اليوم أوّلًا. */
  const RANK: Record<string, number> = { bad: 0, warn: 1, '': 2, good: 3 }
  const ranked = [...insights].sort((a, b) => RANK[a.kind] - RANK[b.kind])
  const primary = ranked.slice(0, 3)
  const rest = ranked.slice(3)

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px, 100%),1fr))', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
        {primary.map((ins, i) => (
          <Reveal key={ins.title} delay={Math.min(i * 0.05, 0.3)} stretch>
            <InsightCard kind={ins.kind} icon={ins.icon} title={ins.title} desc={ins.desc} />
          </Reveal>
        ))}
      </div>
      {rest.length > 0 && (
        <details style={{ marginBottom: 'var(--sp-4)' }}>
          <summary style={{ cursor: 'pointer', color: 'var(--orange-text)', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-medium)', minHeight: 'var(--tap-min)', display: 'flex', alignItems: 'center' }}>
            {`عرض ${rest.length} رؤية أخرى`}
          </summary>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(240px, 100%),1fr))', gap: 'var(--sp-3)', marginTop: 'var(--sp-3)' }}>
            {rest.map((ins) => (
              <InsightCard key={ins.title} kind={ins.kind} icon={ins.icon} title={ins.title} desc={ins.desc} />
            ))}
          </div>
        </details>
      )}
    </>
  )
}
