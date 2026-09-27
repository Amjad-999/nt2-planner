import { useAppStore, avgBestScore, getPlanTotal, sumLastNDays, totalLearnedWords } from '@/store/useAppStore'
import { dueCount as countDue } from '@/features/vocab/queue'
import { useTodayPlan } from '@/hooks/useTodayPlan'
import { useNow } from '@/hooks/useNow'
import { dayKeyOffset, todayKey } from '@/lib/utils'
import { AppIcon } from '@/components/AppIcon'
import { BookOpen, ChartLineUp, Fire, Translate } from '@/components/icons'

const WEEK_LABELS = ['س', 'ح', 'ن', 'ث', 'ر', 'خ', 'ج']

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? ''
}

export function HomeOverview() {
  const name = useAppStore((s) => s.name)
  const planDay = useAppStore((s) => s.planDay)
  const planStart = useAppStore((s) => s.planStart)
  const examDate = useAppStore((s) => s.examDate)
  const streak = useAppStore((s) => s.streak)
  const skill = useAppStore((s) => s.skill)
  const vocab = useAppStore((s) => s.vocab)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const prefs = useAppStore((s) => s.prefs)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const now = useNow()
  const plan = useTodayPlan()

  const todayMinutes = dailyHistory[todayKey()]?.mins ?? 0
  const targetMinutes = Math.max(1, prefs.studyDayMinutes ?? 60)
  const dayProgress = Math.min(100, Math.round((todayMinutes / targetMinutes) * 100))
  const words = totalLearnedWords(vocab)
  const due = countDue(vocab, now)
  const readiness = avgBestScore(skill)
  const hasAttempts = Object.values(skill).some((item) => item.attempts > 0 || item.best > 0)
  const planTotal = getPlanTotal({ planStart, examDate })
  const currentDay = Math.min(planTotal, Math.max(1, planDay ?? 1))
  const weekMinutes = sumLastNDays(dailyHistory, 'mins', 7)
  const weekValues = Array.from({ length: 7 }, (_, index) => dailyHistory[dayKeyOffset(-(6 - index))]?.mins ?? 0)
  const maxWeekValue = Math.max(targetMinutes, ...weekValues, 1)
  const greeting = firstName(name) ? `صباح الخير، ${firstName(name)}!` : 'صباح الخير!'

  return (
    <>
      <section className="home-overview" aria-labelledby="home-overview-title">
        <div className="home-overview__heading">
          <div>
            <p className="eyebrow">مساحتك اليومية</p>
            <h1 id="home-overview-title">{greeting}</h1>
            <p className="home-overview__subtitle">خطوة صغيرة اليوم تقرّبك من هدفك في امتحان NT2.</p>
          </div>
          <div className="home-level" aria-label="المسار المستهدف: مستوى B1">
            <span className="home-level__value" dir="ltr">B1</span>
            <span>المسار المستهدف</span>
          </div>
        </div>

        <div className="home-overview__progress" aria-label={`تقدم اليوم: ${dayProgress}%`}>
          <div className="home-overview__progress-label">
            <span>تقدمك اليوم</span>
            <strong dir="ltr">{dayProgress}%</strong>
          </div>
          <div className="progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={dayProgress}>
            <span className="home-overview__progress-fill" style={{ transform: `scaleX(${dayProgress / 100})` }} />
          </div>
          <p>{todayMinutes} من {targetMinutes} دقيقة • اليوم {currentDay} من {planTotal}</p>
        </div>

        <div className="home-overview__stats" aria-label="ملخص سريع">
          <div className="home-stat">
            <AppIcon icon={Fire} size={20} style={{ color: 'var(--orange-text)' }} />
            <strong dir="ltr">{streak.count}</strong>
            <span>يوم مواظبة</span>
          </div>
          <div className="home-stat">
            <AppIcon icon={Translate} size={20} style={{ color: 'var(--ui-blue-text)' }} />
            <strong dir="ltr">{words.learned}</strong>
            <span>كلمة راسخة</span>
          </div>
          <div className="home-stat">
            <AppIcon icon={ChartLineUp} size={20} style={{ color: 'var(--ui-green-text)' }} />
            <strong dir="ltr">{hasAttempts ? `${readiness}%` : '—'}</strong>
            <span>استعدادك</span>
          </div>
        </div>
      </section>

      <section className="home-actions" aria-label="اختصارات التعلّم">
        <button type="button" className="home-action-card" onClick={() => setActiveTab('plan')}>
          <span className="home-action-card__icon home-action-card__icon--blue"><AppIcon icon={BookOpen} size={22} /></span>
          <span className="home-action-card__copy"><strong>درس اليوم</strong><span>{plan.doneCount} من {plan.tasks.length} مهام مكتملة</span></span>
        </button>
        <button type="button" className="home-action-card" onClick={() => setActiveTab('vocab')}>
          <span className="home-action-card__icon home-action-card__icon--orange"><AppIcon icon={Translate} size={22} /></span>
          <span className="home-action-card__copy"><strong>كلمات للمراجعة</strong><span>{due ? `${due} كلمة مستحقّة الآن` : 'لا توجد كلمات مستحقّة الآن'}</span></span>
        </button>
      </section>

      <section className="home-week card" aria-labelledby="home-week-title">
        <div className="home-week__heading">
          <div>
            <p className="eyebrow">إيقاعك هذا الأسبوع</p>
            <h2 id="home-week-title">{weekMinutes} دقيقة دراسة</h2>
          </div>
          <button type="button" className="btn btn--ghost" onClick={() => setActiveTab('stats')}>عرض التقدم</button>
        </div>
        <div className="home-week__chart" aria-label={`الدراسة خلال آخر 7 أيام: ${weekMinutes} دقيقة`}>
          {weekValues.map((value, index) => (
            <div className="home-week__day" key={index}>
              <span className="home-week__bar-track"><span className="home-week__bar" style={{ blockSize: `${Math.max(value ? 12 : 4, Math.round((value / maxWeekValue) * 100))}%` }} /></span>
              <span>{WEEK_LABELS[index]}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
