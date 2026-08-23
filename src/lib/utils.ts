import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/**
 * مفتاح اليوم YYYY-MM-DD **بالتوقيت المحلّي للمستخدم**.
 *
 * كان يستخدم `toISOString()` وهو UTC دائمًا. الفارق ليس نظريًا: في هولندا
 * (UTC+2 صيفًا) كل جلسة تبدأ بين 00:00 و02:00 محلّيًا كانت تُسجَّل في بوابة
 * *أمس*، فينقسم اليوم الواحد على يومين في السجلّ، وتنكسر السلسلة اليومية،
 * وتظهر خريطة النشاط مزاحة. والعكس في المناطق غربي غرينتش: العمل المسائي
 * يُسجَّل على *الغد*.
 *
 * هذه الدالة هي المصدر الوحيد لمفاتيح الأيام في التطبيق كلّه — سجلّ الدراسة،
 * السلسلة، التحليلات، والشارات، وكذلك جدول البرنامج عبر `program/dates.ts`.
 */
export function todayKey(d?: Date): string {
  const x = d ?? new Date()
  return `${x.getFullYear()}-${pad2(x.getMonth() + 1)}-${pad2(x.getDate())}`
}

export function dayKeyOffset(off: number): string {
  const d = new Date()
  d.setDate(d.getDate() + off)
  return todayKey(d)
}

export function daysBetween(aISO: string, bISO: string): number {
  const a = new Date(aISO).getTime(), b = new Date(bISO).getTime()
  if (isNaN(a) || isNaN(b)) return 0
  return Math.round((b - a) / 86400000)
}

export function escapeHtml(s: unknown): string {
  return String(s == null ? '' : s).replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] ?? c),
  )
}

export function hexA(hex: string, alpha: number): string {
  const h = (hex ?? '').replace('#', '').trim()
  if (h.length !== 6) return `rgba(91,87,240,${alpha})`
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function wordCount(t: string): number {
  return String(t ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length
}

export function clampNum(val: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, val))
}
