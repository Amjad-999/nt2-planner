/**
 * أدوات التاريخ الخاصّة بالبرنامج — كلّها بالتوقيت المحلّي للجهاز.
 *
 * مفتاح اليوم يأتي من `todayKey()` في `lib/utils` وهو المصدر الوحيد لمفاتيح
 * الأيام في التطبيق كلّه. كان هنا تعريف موازٍ (محلّي) بينما بقيّة التطبيق
 * تستخدم UTC، فينقسم اليوم الواحد بين بوابتين في `dailyHistory` قرب منتصف
 * الليل. التعريفان صارا واحدًا.
 */

import { todayKey } from '@/lib/utils'

const pad = (n: number) => String(n).padStart(2, '0')

/** مفتاح يوم محلّي YYYY-MM-DD من كائن Date. */
export const localKey = (d: Date): string => todayKey(d)

/** مفتاح اليوم المحلّي الحالي. */
export function localToday(nowMs: number = Date.now()): string {
  return todayKey(new Date(nowMs))
}

/** تحويل مفتاح يوم محلّي إلى Date عند منتصف الليل المحلّي. */
export function keyToDate(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1, 0, 0, 0, 0)
}

/** إضافة أيام إلى مفتاح يوم — آمنة مع التوقيت الصيفي لأنها تمرّ عبر Date المحلّي. */
export function addDays(key: string, n: number): string {
  const d = keyToDate(key)
  d.setDate(d.getDate() + n)
  return localKey(d)
}

/** عدد الأيام بين مفتاحين (b - a). */
export function diffDays(a: string, b: string): number {
  const ms = keyToDate(b).getTime() - keyToDate(a).getTime()
  return Math.round(ms / 86400000)
}

/** كل مفاتيح الأيام من a إلى b شاملةً الطرفين. */
export function dateRange(a: string, b: string): string[] {
  const out: string[] = []
  const n = diffDays(a, b)
  for (let i = 0; i <= n; i++) out.push(addDays(a, i))
  return out
}

const AR_DOW = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']
const AR_MONTH = [
  'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر',
]

export function dayOfWeekAr(key: string): string {
  return AR_DOW[keyToDate(key).getDay()]
}

/** «الجمعة 21 أغسطس». */
export function formatDayAr(key: string): string {
  const d = keyToDate(key)
  return `${AR_DOW[d.getDay()]} ${d.getDate()} ${AR_MONTH[d.getMonth()]}`
}

/** «21 أغسطس». */
export function formatShortAr(key: string): string {
  const d = keyToDate(key)
  return `${d.getDate()} ${AR_MONTH[d.getMonth()]}`
}

/** تحويل "HH:MM" + مفتاح يوم إلى epoch ms محلّي. */
export function dayStartMs(key: string, hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  const d = keyToDate(key)
  d.setHours(
    Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 8,
    Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
    0, 0,
  )
  return d.getTime()
}

/** «08:30» من epoch ms. */
export function clockHHMM(ms: number): string {
  const d = new Date(ms)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** تنسيق مدّة بالملّي ثانية إلى MM:SS أو HH:MM:SS. */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** تنسيق دقائق إلى «5س 10د» أو «45د». */
export function formatMinutesAr(mins: number): string {
  const m = Math.max(0, Math.round(mins))
  const h = Math.floor(m / 60)
  const r = m % 60
  if (h === 0) return `${r}د`
  if (r === 0) return `${h}س`
  return `${h}س ${pad(r)}د`
}
