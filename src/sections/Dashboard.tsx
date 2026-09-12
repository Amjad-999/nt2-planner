import { useAppStore } from '@/store/useAppStore'
import { JourneyHero } from '@/components/hero/JourneyHero'
import { TodayFocus } from '@/components/dashboard/TodayFocus'
import { QuoteTicker } from '@/components/dashboard/QuoteTicker'
import { TodayPlan } from '@/components/dashboard/TodayPlan'
import { HomeOverview } from '@/components/dashboard/HomeOverview'
import { AuthBar } from '@/components/auth/AuthBar'
import { PlanHealth } from '@/components/PlanHealth'
import { ExamCountdowns } from '@/components/ExamCountdowns'
import { motion } from 'framer-motion'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { pressSpring, pressTransition } from '@/lib/animations'

interface Props { onOpenStudyTime?: () => void }

/**
 * الرئيسية — answers one question first: what do I do now?
 *
 * Order is importance: the one next step with a single primary button
 * (TodayFocus), the day's checklist, the daily summary (hero), then the
 * exam dates and plan status. The five KPI cards, the ranked insights and the
 * badges describe the past, so they live on the Progress tab (Stats), one tap
 * away — the home screen had grown to twelve blocks of equal visual weight.
 */
export default function Dashboard({ onOpenStudyTime }: Props) {
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const reduced = useReducedMotion()

  return (
    <div className="page">
      {/* نقطة الدخول إلى الحساب — أعلى الصفحة، لا داخل الإعدادات */}
      <AuthBar />

      <HomeOverview />

      <TodayFocus onStartSession={() => setActiveTab('plan')} />

      <TodayPlan />

      <div className="home-legacy-hero" aria-hidden="true">
        <JourneyHero />
      </div>

      <ExamCountdowns />
      <PlanHealth />
      <QuoteTicker />

      {/* StudyTimeModal لا يُفتح من مكان آخر: يضيف دقائق بأزرار سريعة، بينما
          تعديل بطاقة «دقائق اليوم» في صفحة التقدّم يضبط المجموع. */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
        <motion.button
          type="button"
          onClick={() => onOpenStudyTime?.()}
          whileTap={reduced ? undefined : pressSpring}
          transition={pressTransition}
          className="btn"
          style={{ minHeight: 'var(--tap-min)' }}
        >
          <span aria-hidden="true">⏱️</span> أضف وقت الدراسة
        </motion.button>
        <button type="button" className="btn btn--ghost" onClick={() => setActiveTab('stats')} style={{ minHeight: 'var(--tap-min)' }}>
          <span aria-hidden="true">📈</span> تقدّمك ومؤشّراتك
        </button>
      </div>
    </div>
  )
}
