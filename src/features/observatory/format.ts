import type { ContextKey, BuildRule } from './types'

/* Display helpers. Metadata is Dutch in a mono face (it names the target
   language's world); prose is Arabic. Digits are always ASCII. */

export const CONTEXT_NL: Record<ContextKey, string> = {
  gezondheid: 'GEZONDHEID', afspraken: 'AFSPRAKEN', werk: 'WERK', nieuws: 'NIEUWS',
  winkel: 'WINKEL', telefoon: 'TELEFOON', thuis: 'THUIS', overig: 'DAGELIJKS',
}

export const CONTEXT_AR: Record<ContextKey, string> = {
  gezondheid: 'الصحة', afspraken: 'المواعيد', werk: 'العمل', nieuws: 'الأخبار',
  winkel: 'التسوّق', telefoon: 'الهاتف', thuis: 'البيت', overig: 'الحياة اليومية',
}

/** "wo 23 sep" */
export function nlDate(ts: number): string {
  try {
    return new Intl.DateTimeFormat('nl-NL', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(ts)).replace('.', '')
  } catch { return '' }
}

/** Arabic weekday for a YYYY-MM-DD key, ASCII digits locale. */
export function arWeekday(dayKey: string): string {
  const [y, m, d] = dayKey.split('-').map(Number)
  try {
    return new Intl.DateTimeFormat('ar-u-nu-latn', { weekday: 'long' }).format(new Date(y, (m || 1) - 1, d || 1))
  } catch { return dayKey }
}

/** "23/9" style short date with ASCII digits. */
export function shortDate(ts: number): string {
  const d = new Date(ts)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

/** Minutes for display: whole numbers above 10, one decimal below. */
export function mins(n: number): string {
  if (!isFinite(n) || n <= 0) return '0'
  return n >= 10 ? String(Math.round(n)) : String(Math.round(n * 10) / 10)
}

export function pad2(n: number): string { return String(n).padStart(2, '0') }

export const DRILL_TITLE: Record<BuildRule, string> = {
  v2: 'الفعل ثانيًا بعد كلمة الزمن',
  'verb-final': 'الفعل في آخر الجملة الداخلية',
}
