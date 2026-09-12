import type { SkillKey, State, TabId } from '@/store/types'
import { PASS_THRESHOLD, SKILL_AR } from '@/data/phases'

export function weeklyChange(current: number, previous: number): string {
  if (previous === 0) return current > 0 ? 'بداية جديدة هذا الأسبوع' : 'لم يُسجّل نشاط بعد'
  const percent = Math.round(((current - previous) / previous) * 100)
  return `${percent >= 0 ? '+' : ''}${percent}%`
}

export function nextProgressFocus(skill: State['skill'], dueCount: number, grammarComplete: boolean): {
  title: string; description: string; action: string; tab: TabId
} {
  if (dueCount > 0) return {
    title: 'ابدأ بالمراجعة المستحقّة', description: `لديك ${dueCount} كلمة حان موعد مراجعتها. استرجاعها الآن يساعد على تثبيتها.`, action: 'مراجعة الكلمات', tab: 'vocab',
  }
  const keys: SkillKey[] = ['reading', 'listening', 'writing', 'speaking']
  const attempted = keys.filter(key => skill[key].attempts > 0)
  const recentScore = (key: SkillKey) => skill[key].history.at(-1)?.score ?? skill[key].best
  const weakest = attempted.toSorted((a, b) => recentScore(a) - recentScore(b))[0]
  if (weakest && recentScore(weakest) < PASS_THRESHOLD) return {
    title: `التركيز التالي: ${SKILL_AR[weakest]}`,
    description: `آخر نتيجة مسجّلة في هذه المهارة ${recentScore(weakest)}%. افتح تدريب الامتحان واختر ${SKILL_AR[weakest]} لمراجعة الأخطاء ثم جرّب محاولة جديدة.`,
    action: 'فتح تدريب الامتحان', tab: 'exam',
  }
  if (!grammarComplete) return {
    title: 'تابع قاعدة واحدة وطبّقها', description: 'افتح مسار القواعد للعودة إلى درس جارٍ أو الدرس التالي. حلّ التمارين لتسجيل تقدّمك.', action: 'متابعة مسار القواعد', tab: 'grammar',
  }
  const untried = keys.find(key => skill[key].attempts === 0)
  return {
    title: untried ? `جرّب مهارة ${SKILL_AR[untried]}` : 'طبّق ما تعلّمته في تدريب جديد',
    description: untried ? 'لم تسجّل محاولة لهذه المهارة بعد. اخترها في تدريب الامتحان لتعرف ما يحتاج إلى مراجعة.' : 'لديك تقدّم في القواعد والمهارات. استخدم محاولة جديدة لمتابعة مستواك في التدريب.',
    action: 'فتح تدريب الامتحان', tab: 'exam',
  }
}
