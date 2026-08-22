/* «متّصلة بالموقع» — ما تعرفه كاتيا عن المستخدم نفسه.
   دالّة خالصة فوق الحالة: لا شبكة، لا تأثيرات جانبية، تعمل دون اتصال
   بالكامل. هذا عمدًا الجزء الأذكى فيها — المعرفة العامة يعطيها أي محرّك
   بحث، أمّا «أنت متأخّر في الاستماع وعندك 12 كلمة مستحقّة اليوم» فلا
   يعرفه إلا التطبيق. */

import type { State } from '@/store/types'
import { planHealth, totalLearnedWords, avgBestScore, weakestSkill, sumLastNDays } from '@/store/useAppStore'
import { SKILL_AR } from '@/data/phases'
import { isFsrsLearned } from '@/features/vocab/fsrs-lite'
import { todayKey } from '@/lib/utils'

export interface InsightLine {
  icon: string
  text: string
  /** تبويب يفتحه السطر حين يكون له إجراء واضح */
  tab?: 'plan' | 'vocab' | 'exam' | 'stats'
}

type InsightState = Pick<State,
  'vocab' | 'examWords' | 'skill' | 'streak' | 'dailyHistory' | 'done' | 'examDate' | 'planDay' | 'prefs'
> & { planStart?: string }

/** عدد الكلمات المستحقّة للمراجعة الآن (نفس تعريف generateTodayPlan). */
export function dueWordCount(st: Pick<State, 'vocab' | 'examWords'>, now = Date.now()): number {
  const due = (w: { due?: number; fsrs_state?: number; box?: number }) =>
    (w.due ?? 0) <= now && !isFsrsLearned(w as never)
  return st.vocab.filter(due).length + st.examWords.filter(due).length
}

/** قراءة كاتيا لحالة المستخدم — مرتّبة بالأولوية، الأهمّ أوّلًا. */
export function buildInsights(st: InsightState): InsightLine[] {
  const out: InsightLine[] = []
  const today = todayKey()

  const due = dueWordCount({ vocab: st.vocab, examWords: st.examWords })
  if (due > 0) {
    out.push({ icon: '📖', text: `عندك ${due} كلمة وصلت موعد مراجعتها اليوم — راجعها قبل أن تُنسى.`, tab: 'vocab' })
  }

  const mins = st.dailyHistory[today]?.mins ?? 0
  const target = st.prefs?.studyDayMinutes ?? 60
  if (mins >= target) {
    out.push({ icon: '🎯', text: `أنجزت ${mins} دقيقة اليوم — تجاوزت هدفك (${target} دقيقة). يوم ممتاز!` })
  } else if (mins > 0) {
    out.push({ icon: '⏱️', text: `درست ${mins} دقيقة اليوم من هدف ${target}. بقي ${target - mins} دقيقة فقط.`, tab: 'plan' })
  } else {
    out.push({ icon: '🌱', text: `لم تبدأ اليوم بعد. هدفك ${target} دقيقة — حتى 5 دقائق تكسر الجمود.`, tab: 'plan' })
  }

  const health = planHealth(
    { examDate: st.examDate, planDay: st.planDay, done: st.done, planStart: st.planStart },
    st.prefs,
  )
  out.push({ icon: health.badge, text: health.why, tab: 'plan' })

  const avg = avgBestScore(st.skill)
  if (avg > 0) {
    const weak = weakestSkill(st.skill)
    const weakScore = st.skill[weak]?.best ?? 0
    out.push({
      icon: '📊',
      text: `متوسّط أفضل درجاتك ${avg}%. أضعف مهاراتك ${SKILL_AR[weak] ?? weak} عند ${weakScore}% — ركّز عليها.`,
      tab: 'exam',
    })
  } else {
    out.push({ icon: '🎓', text: 'لم تُجرِ أي محاكاة امتحان بعد — واحدة تكفي لأعرف نقاط ضعفك وأوجّهك.', tab: 'exam' })
  }

  const words = totalLearnedWords(st.vocab)
  if (words.all > 0) {
    out.push({ icon: '🧠', text: `أتقنت ${words.learned} كلمة من ${words.all} في مفرداتك.`, tab: 'vocab' })
  }

  if (st.streak.count > 0) {
    out.push({ icon: '🔥', text: `سلسلة مواظبتك ${st.streak.count} يوم. لا تكسرها اليوم!` })
  }

  const week = sumLastNDays(st.dailyHistory, 'mins', 7)
  if (week > 0) {
    out.push({ icon: '📈', text: `مجموع دراستك هذا الأسبوع ${week} دقيقة.`, tab: 'stats' })
  }

  return out
}
