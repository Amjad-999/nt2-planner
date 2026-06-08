import type { Phase } from '@/store/types'

export const TOTAL_PLAN_DAYS = 46
export const PASS_THRESHOLD = 65
export const LEARNED_BOX = 4

export const PHASES: Phase[] = [
  {
    id: 'p1', title: 'المرحلة ١ — الأساسيات', days: '1–9', dayFrom: 1, dayTo: 9,
    tasks: [
      { name: 'مراجعة قواعد B1 الأساسية', mins: 40, skill: 'writing' },
      { name: 'تعلّم 25 كلمة B1 جديدة عبر AI', mins: 25, skill: 'vocab' },
      { name: 'قراءة نص قصير على Oefenen.nl', mins: 20, skill: 'reading' },
      { name: 'استماع لـ Jeugdjournaal (5 دقائق + إعادة)', mins: 20, skill: 'listening' },
    ],
  },
  {
    id: 'p2', title: 'المرحلة ٢ — بناء المهارات', days: '10–20', dayFrom: 10, dayTo: 20,
    tasks: [
      { name: 'محاكاة قراءة DUO — نص واحد', mins: 25, skill: 'reading' },
      { name: 'محاكاة استماع DUO — حوار قصير', mins: 20, skill: 'listening' },
      { name: 'كتابة بريد إلكتروني قصير (Schrijven)', mins: 25, skill: 'writing' },
      { name: 'تسجيل ردّ شفهي 30 ثانية (Spreken)', mins: 15, skill: 'speaking' },
      { name: 'مراجعة المفردات المستحقّة (SRS)', mins: 15, skill: 'vocab' },
    ],
  },
  {
    id: 'p3', title: 'المرحلة ٣ — التعمّق', days: '21–32', dayFrom: 21, dayTo: 32,
    tasks: [
      { name: 'نصّ قراءة طويل + 6 أسئلة', mins: 35, skill: 'reading' },
      { name: 'استماع لخبر إذاعي + ملاحظات', mins: 25, skill: 'listening' },
      { name: 'كتابة رسالة شكوى رسمية', mins: 30, skill: 'writing' },
      { name: 'وصف صورة شفهيًا (90 ثانية)', mins: 20, skill: 'speaking' },
    ],
  },
  {
    id: 'p4', title: 'المرحلة ٤ — التدريب الكثيف', days: '33–42', dayFrom: 33, dayTo: 42,
    tasks: [
      { name: 'محاكاة Lezen كاملة (٦ نصوص — مع المؤقّت)', mins: 110, skill: 'reading' },
      { name: 'محاكاة Luisteren كاملة', mins: 60, skill: 'listening' },
      { name: 'محاكاة Schrijven كاملة (١٢ مهمّة)', mins: 100, skill: 'writing' },
      { name: 'محاكاة Spreken كاملة', mins: 30, skill: 'speaking' },
    ],
  },
  {
    id: 'p5', title: 'المرحلة ٥ — الصقل قبل الامتحان', days: '43–46', dayFrom: 43, dayTo: 46,
    tasks: [
      { name: 'مراجعة سريعة لأخطاء الأسبوع الماضي', mins: 30, skill: 'reading' },
      { name: 'حلّ ورقة DUO حقيقية من مجلد NT', mins: 60, skill: 'reading' },
      { name: 'مراجعة شاملة لمفردات الامتحان', mins: 25, skill: 'vocab' },
      { name: 'استرخاء + نوم جيّد قبل اليوم الموعد', mins: 0, skill: 'all' },
    ],
  },
]

export function planTaskId(phaseId: string, day: number, idx: number): string {
  return `${phaseId}_d${day}_t${idx}`
}

export const SKILL_AR: Record<string, string> = {
  reading: 'القراءة',
  listening: 'الاستماع',
  writing: 'الكتابة',
  speaking: 'التحدّث',
  vocab: 'المفردات',
  all: 'عام',
}
