import { useAppStore, getDaysLeft } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { useNow } from '@/hooks/useNow'
import { QUOTES, dayOfYear } from '@/data/dutchQuotes'

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

export function SmartGreeting() {
  const examDate     = useAppStore((s) => s.examDate)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const now = useNow()

  const period = getPeriod(new Date(now).getHours())
  const { phase, daysLeft } = getGreetingState(examDate, now)
  const lessons = dailyHistory[todayKey()]?.tasks ?? 0

  const text = GREETINGS[period][phase]
    .replace('{days}', String(daysLeft ?? 0))
    .replace('{lessons}', String(lessons))

  const quote = QUOTES[dayOfYear(now) % QUOTES.length]

  return (
    <div>
      {/* العنوان */}
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.2rem, 2.5vw, 1.5rem)',
          fontWeight: 'var(--fw-heading)',
          color: '#FBF3EA',
          margin: 0,
          lineHeight: 1.3,
        }}
      >
        {text}
      </h1>

      {/* الاقتباس — مدمج في البطاقة؛ يُخفى في وضع التركيز (زخرفي وليس أساسيًا) */}
      <div
        className="decor-flourish"
        style={{
          marginTop: 10,
          padding: '10px 14px',
          background: 'rgba(255,244,235,0.06)',
          borderRadius: 'var(--r-sm)',
          borderRight: '3px solid var(--orange)',
        }}
      >
        <div
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: '1rem',
            fontStyle: 'italic',
            color: 'rgba(251,243,234,0.95)',
            lineHeight: 1.4,
          }}
        >
          "{quote.nl}"
        </div>
        <div
          style={{
            fontSize: '.82rem',
            color: 'rgba(217,201,184,0.78)',
            marginTop: 4,
          }}
        >
          {quote.ar}
        </div>
      </div>
    </div>
  )
}