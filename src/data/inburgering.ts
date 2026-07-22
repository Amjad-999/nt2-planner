import type { InburgeringExam } from '@/store/types'

/**
 * الامتحانات الخمسة لامتحان الاندماج الهولندي (Inburgering).
 * الأسماء وبذرة الأيام (daysLeft) مصدرها الكود؛ ما يملكه المستخدم ويُزامَن
 * سحابيًّا هو `passed` و`examDate` فقط (انظر reconcileInburgeringExams).
 */
export const DEFAULT_INBURGERING_EXAMS: readonly InburgeringExam[] = [
  { id: 'lezen',     nameNL: 'Lezen',     nameAR: 'القراءة',  daysLeft: 57, passed: false, examDate: null },
  { id: 'luisteren', nameNL: 'Luisteren', nameAR: 'الاستماع', daysLeft: 44, passed: false, examDate: null },
  { id: 'schrijven', nameNL: 'Schrijven', nameAR: 'الكتابة',  daysLeft: 30, passed: false, examDate: null },
  { id: 'spreken',   nameNL: 'Spreken',   nameAR: 'التحدث',   daysLeft: 60, passed: false, examDate: null },
  { id: 'knm',       nameNL: 'KNM',       nameAR: 'المعرفة',  daysLeft: 25, passed: false, examDate: null },
]

function validDate(v: unknown): string | null {
  return typeof v === 'string' && !isNaN(new Date(v).getTime()) ? v : null
}

/**
 * يعيد بناء قائمة الامتحانات الخمسة: الأسماء وبذرة الأيام من الافتراضيات،
 * وحالة المستخدم (passed + examDate) من المحفوظ إن وُجدت وكانت صالحة.
 * يتحمّل أي شكل مُدخل (null، مصفوفة ناقصة، عناصر تالفة) بأمان.
 */
export function reconcileInburgeringExams(saved: unknown): InburgeringExam[] {
  const byId = new Map<string, Record<string, unknown>>()
  if (Array.isArray(saved)) {
    for (const e of saved) {
      if (e && typeof e === 'object' && typeof (e as { id?: unknown }).id === 'string') {
        byId.set((e as { id: string }).id, e as Record<string, unknown>)
      }
    }
  }
  return DEFAULT_INBURGERING_EXAMS.map((d) => {
    const s = byId.get(d.id)
    return s
      ? { ...d, passed: !!s.passed, examDate: validDate(s.examDate) }
      : { ...d }
  })
}
