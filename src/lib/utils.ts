import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function todayKey(d?: Date): string {
  return (d ?? new Date()).toISOString().slice(0, 10)
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
