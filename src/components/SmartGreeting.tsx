import { useAppStore, getDaysLeft } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { useNow } from '@/hooks/useNow'

type Period = 'morning' | 'afternoon' | 'evening' | 'night'
type Phase = 'normal' | 'late' | 'examDay' | 'passed'

const LATE_THRESHOLD = 7

const GREETINGS: Record<Period, Record<Phase, string>> = {
  morning: {
    normal:  'صباح الدراسة — {days} يوم متبقي',
    late:    'صباح التركيز — {days} يوم فقط!',
    examDay: 'اليوم هو يومك — اقرأ بتركيز',
    passed:  '🎉 مبروك! أصبح وراءك B1',
  },
  afternoon: {
    normal:  'نصف النهار — خطّط للمساء',
    late:    'نصف النهار — {days} يوم فقط!',
    examDay: 'ساعات قليلة — راجع ملاحظاتك',
    passed:  'استمتع بإنجازك',
  },
  evening: {
    normal:  'مساء المراجعة — {lessons} دروس',
    late:    'مساء الجدية — {days} يوم!',
    examDay: 'غداً الامتحان — استرخِ',
    passed:  'مساء الفرح — تستحقها',
  },
  night: {
    normal:  'ليلة هادئة؟ راجع 10 كلمات',
    late:    'ليلة مراجعة — {days} يوم!',
    examDay: 'استرخِ — غداً يومك',
    passed:  'ليلة النجاح — احلم',
  },
}

function getPeriod(hour: number): Period {
  if (hour >= 5 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

function getGreetingState(examDate: string, now: number): { phase: Phase; daysLeft: number | null } {
  const daysLeft = getDaysLeft(examDate)
  const exam = new Date(examDate)
  if (isNaN(exam.getTime())) return { phase: 'normal', daysLeft }

  const today = new Date(now)
  const examDay  = new Date(exam.getFullYear(), exam.getMonth(), exam.getDate()).getTime()
  const todayDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const diff = Math.round((examDay - todayDay) / 86400000)

  if (diff < 0) return { phase: 'passed', daysLeft }
  if (diff === 0) return { phase: 'examDay', daysLeft }
  if (diff <= LATE_THRESHOLD) return { phase: 'late', daysLeft }
  return { phase: 'normal', daysLeft }
}

/* 'normal' is the only phase reachable with daysLeft === null (no exam date
 *  chosen yet — see getGreetingState), and morning.normal is the only
 *  template that embeds {days}. Filling it with the ?? 0 fallback used below
 *  would print "0 يوم متبقي" — an invented countdown for a date the user
 *  never picked, exactly what the rest of the app (ExamCountdownRing, the
 *  TopBar pill, JourneyHero) is careful never to show. */
function greetingText(period: Period, phase: Phase, daysLeft: number | null, lessons: number): string {
  if (phase === 'normal' && period === 'morning' && daysLeft == null) {
    return 'صباح الدراسة — حدّد موعد امتحانك لتبدأ رحلتك'
  }
  return GREETINGS[period][phase]
    .replace('{days}', String(daysLeft ?? 0))
    .replace('{lessons}', String(lessons))
}

export function SmartGreeting() {
  const examDate     = useAppStore((s) => s.examDate)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const now = useNow()

  const period = getPeriod(new Date(now).getHours())
  const { phase, daysLeft } = getGreetingState(examDate, now)
  const lessons = dailyHistory[todayKey()]?.tasks ?? 0

  const text = greetingText(period, phase, daysLeft, lessons)

  return (
    <div>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'var(--text-2xl)',
          fontWeight: 'var(--fw-heading)',
          color: 'var(--hero-ink)',
          margin: 0,
          lineHeight: 'var(--lh-heading)',
        }}
      >
        {text}
      </h1>
      {/* السطر الثاني — يوضّح ما الذي يقيسه العدّاد المجاور */}
      <p style={{ margin: '6px 0 0', fontSize: 'var(--text-sm)', color: 'var(--hero-ink2)', lineHeight: 'var(--lh-arabic)' }}>
        {daysLeft == null
          ? 'حدّد موعد امتحانك ليبدأ العدّ التنازلي ويُضبط إيقاع خطّتك عليه.'
          : `${lessons} مهمّة أنجزتها اليوم — تابع بخطوة صغيرة الآن.`}
      </p>
    </div>
  )
}