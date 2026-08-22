/**
 * تمييز العدد في العربية — لأنّ «9 كتلة» و«6 درسًا» خطأ نحوي.
 *
 * Arabic agreement is not a singular/plural switch: 3–10 takes the plural
 * (6 دروس), 11–99 takes the accusative singular (11 درسًا), and 1 and 2 take
 * their own forms. Interpolating one noun form for every count produces text
 * that reads as broken to a native reader, so counts go through here.
 *
 * The buckets follow the Unicode CLDR plural rules for Arabic.
 */

export interface ArabicForms {
  /** لا شيء: «لا دروس» */
  zero: string
  /** واحد: «درس واحد» */
  one: string
  /** اثنان: «درسان» */
  two: string
  /** من 3 إلى 10: «دروس» */
  few: string
  /** من 11 إلى 99: «درسًا» */
  many: string
  /** ما عدا ذلك (مضاعفات المئة): «درس» */
  other: string
}

export const AR_LESSON: ArabicForms = {
  zero: 'دروس', one: 'درس واحد', two: 'درسان', few: 'دروس', many: 'درسًا', other: 'درس',
}

export const AR_DAY: ArabicForms = {
  zero: 'أيام', one: 'يوم واحد', two: 'يومان', few: 'أيام', many: 'يومًا', other: 'يوم',
}

export const AR_BLOCK: ArabicForms = {
  zero: 'كتل', one: 'كتلة واحدة', two: 'كتلتان', few: 'كتل', many: 'كتلة', other: 'كتلة',
}

/** صيغة الاسم المناسبة لهذا العدد، بلا العدد نفسه. */
export function pluralAr(n: number, f: ArabicForms): string {
  const abs = Math.abs(Math.trunc(n))
  const tail = abs % 100
  if (abs === 0) return f.zero
  if (abs === 1) return f.one
  if (abs === 2) return f.two
  if (tail >= 3 && tail <= 10) return f.few
  if (tail >= 11 && tail <= 99) return f.many
  return f.other
}

/**
 * العدد مع تمييزه: «6 دروس»، «11 درسًا»، «درسان».
 * الواحد والاثنان يُذكران بصيغتهما بلا رقم، كما تفعل العربية.
 */
export function countAr(n: number, f: ArabicForms): string {
  const abs = Math.abs(Math.trunc(n))
  if (abs === 1) return f.one
  if (abs === 2) return f.two
  return `${abs} ${pluralAr(abs, f)}`
}
