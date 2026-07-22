import { useAppStore, getDaysLeft } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { useNow } from '@/hooks/useNow'

type Period = 'morning' | 'afternoon' | 'evening' | 'night'
type Phase = 'normal' | 'late' | 'examDay' | 'passed'

/* عدد الأيام التي يبدأ عندها لهجة «التركيز الأخير» */
const LATE_THRESHOLD = 7

const GREETINGS: Record<Period, Record<Phase, string>> = {
  morning: {
    normal:  'صباح الدراسة — {days} يوم متبقي، وأنت أقرب مما تظن',
    late:    'صباح التركيز — متبقي {days} يوم فقط، اِجعل كل دقيقة تُحسب',
    examDay: 'اليوم هو يومك — اِقرأ بتركيز، وتنفّس بعمق',
    passed:  '🎉 مبروك! B1 أصبح وراءك',
  },
  afternoon: {
    normal:  'نصف النهار — خطّط للمساء، اِقرأ 20 دقيقة',
    late:    'نصف النهار — {days} يوم فقط! ركّز على نقاط الضعف',
    examDay: 'ساعات قليلة — راجع ملاحظاتك، ونام مبكرًا',
    passed:  'استمتع بإنجازك — هولندا تنتظرك',
  },
  evening: {
    normal:  'مساء المراجعة — {lessons} دروس اليوم، أنهِها بقوة',
    late:    'مساء الجدية — {days} يوم! لا تؤجل إلى الغد',
    examDay: 'غدًا الامتحان — جهّز أوراقك، واسترخِ',
    passed:  'مساء الاحتفال — تستحق كل لحظة فرح',
  },
  night: {
    normal:  'ليلة هادئة؟ راجع 10 كلمات قبل النوم',
    late:    'ليلة مراجعة — {days} يوم، كل ساعة تُحسب',
    examDay: 'استرخِ — غدًا يومك، والنوم مهم',
    passed:  'ليلة النجاح — احلم بمستقبلك في هولندا',
  },
}

/* 30 اقتباسًا هولنديًا — واحد لكل يوم من الشهر (يتكرر دوريًا) */
const QUOTES: { nl: string; ar: string }[] = [
  { nl: 'Oefening baart kunst', ar: 'الممارسة تصنع الإتقان' },
  { nl: 'Langzaam maar zeker', ar: 'ببطء لكن بثبات' },
  { nl: 'Doorzetten is belangrijker dan talent', ar: 'الإصرار أهم من الموهبة' },
  { nl: 'Wie niet waagt, die niet wint', ar: 'من لا يجازف لا يربح' },
  { nl: 'Al doende leert men', ar: 'بالممارسة نتعلّم' },
  { nl: 'Rome is niet op één dag gebouwd', ar: 'روما لم تُبنَ في يوم واحد' },
  { nl: 'Een goed begin is het halve werk', ar: 'حسن البداية نصف العمل' },
  { nl: 'Zonder vlijt geen prijs', ar: 'بلا اجتهاد لا جائزة' },
  { nl: 'Waar een wil is, is een weg', ar: 'حيث توجد إرادة توجد طريقة' },
  { nl: 'Geduld is een schone zaak', ar: 'الصبر فضيلة جميلة' },
  { nl: 'Elke dag een nieuwe kans', ar: 'كل يوم فرصة جديدة' },
  { nl: 'Stap voor stap komt men ver', ar: 'خطوة بخطوة نصل بعيدًا' },
  { nl: 'Wat je zaait, zal je oogsten', ar: 'كما تزرع تحصد' },
  { nl: 'De aanhouder wint', ar: 'المثابر ينتصر' },
  { nl: 'Beter laat dan nooit', ar: 'أفضل متأخرًا من ألّا يكون أبدًا' },
  { nl: 'Wie het laatst lacht, lacht het best', ar: 'من يضحك أخيرًا يضحك أفضل' },
  { nl: 'Je kunt meer dan je denkt', ar: 'تستطيع أكثر مما تظن' },
  { nl: 'Wie zoekt, die vindt', ar: 'من يبحث يجد' },
  { nl: 'Van fouten leert men', ar: 'من الأخطاء نتعلّم' },
  { nl: 'Elke dag een beetje beter', ar: 'كل يوم أفضل قليلًا' },
  { nl: 'Rustig aan, dan breekt het lijntje niet', ar: 'تمهّل كي لا ينقطع الخيط' },
  { nl: 'Kleine stappen, groot resultaat', ar: 'خطوات صغيرة، نتيجة كبيرة' },
  { nl: 'Niet geschoten is altijd mis', ar: 'من لا يحاول يخسر دائمًا' },
  { nl: 'Oefening maakt de meester', ar: 'الممارسة تصنع المعلّم' },
  { nl: 'Bezint eer ge begint', ar: 'فكّر قبل أن تبدأ' },
  { nl: 'Stel niet uit tot morgen wat je vandaag kunt doen', ar: 'لا تؤجل إلى الغد ما يمكنك فعله اليوم' },
  { nl: 'De tijd vliegt voorbij', ar: 'الوقت يطير' },
  { nl: 'Kennis is macht', ar: 'المعرفة قوة' },
  { nl: 'Wie goed doet, goed ontmoet', ar: 'من يُحسن يُلاقَ بالإحسان' },
  { nl: 'Alle beetjes helpen', ar: 'كل قليل يُسهم' },
]

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

function dayOfYear(now: number): number {
  const d = new Date(now)
  const start = new Date(d.getFullYear(), 0, 0)
  return Math.floor((d.getTime() - start.getTime()) / 86400000)
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
    <div style={{ marginBottom: 16 }}>
      <h1
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 'clamp(1.35rem, 3vw, 1.7rem)',
          fontWeight: 600,
          color: 'var(--text)',
          letterSpacing: '-.3px',
          margin: 0,
        }}
      >
        {text}
      </h1>
      <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 6 }}>
        <span style={{ fontWeight: 600 }}>{quote.nl}</span>
        <span style={{ margin: '0 6px' }} aria-hidden="true">—</span>
        <span>{quote.ar}</span>
      </div>
    </div>
  )
}
