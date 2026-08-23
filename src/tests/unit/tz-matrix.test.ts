import { describe, it, expect, afterAll, vi } from 'vitest'
import { todayKey, dayKeyOffset } from '@/lib/utils'
import { localToday, keyToDate, addDays, dayStartMs } from '@/features/program/dates'
import { buildProgram, DEFAULT_CONFIG } from '@/features/program/schedule'
import { buildTimeline } from '@/features/program/timeline'

/**
 * مصفوفة المناطق الزمنية.
 *
 * `TZ=` كمتغيّر بيئة يُتجاهَل على ويندوز (إلا UTC)، لكن ضبط `process.env.TZ`
 * **داخل** العملية يُغيّر التوقيت فعليًا حتى بعد إنشاء تواريخ سابقة — تحقّقنا
 * من ذلك قبل الاعتماد عليه. لذلك تدور الفحوص هنا بدل تشغيل عملية لكل منطقة.
 */
const ZONES = [
  'UTC',
  'Pacific/Kiritimati',   // UTC+14 — أقصى شرق
  'Pacific/Midway',       // UTC-11 — أقصى غرب
  'Asia/Kathmandu',       // UTC+5:45 — إزاحة كسرية
  'Europe/Amsterdam',     // منطقة المستخدم
  'America/New_York',
  'Australia/Sydney',
]

// vi.stubEnv يضبط process.env بشكل مُنمَّط ويُعيده تلقائيًا — لا حاجة لأنواع Node.
const setTZ = (tz: string) => vi.stubEnv('TZ', tz)
afterAll(() => { vi.unstubAllEnvs() })

const localParts = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('مفاتيح الأيام عبر المناطق الزمنية', () => {
  it('التبديل داخل العملية يُغيّر التوقيت فعلًا (وإلا فالمصفوفة بلا معنى)', () => {
    setTZ('Pacific/Kiritimati')
    const east = new Date().getTimezoneOffset()
    setTZ('Pacific/Midway')
    const west = new Date().getTimezoneOffset()
    expect(east).not.toBe(west)
  })

  for (const tz of ZONES) {
    describe(tz, () => {
      it('المفتاح = اليوم المحلّي في كل ساعات اليوم', () => {
        setTZ(tz)
        for (let h = 0; h < 24; h++) {
          const d = new Date()
          d.setHours(h, 30, 0, 0)
          expect(todayKey(d)).toBe(localParts(d))
        }
      })

      it('البرنامج والسجلّ اليومي يستخدمان المفتاح نفسه', () => {
        setTZ(tz)
        expect(localToday()).toBe(todayKey())
        expect(dayKeyOffset(0)).toBe(todayKey())
        expect(addDays(dayKeyOffset(-1), 1)).toBe(todayKey())
      })

      it('المفتاح ↔ منتصف الليل المحلّي بلا انزلاق', () => {
        setTZ(tz)
        const k = todayKey()
        const mid = keyToDate(k)
        expect(mid.getHours()).toBe(0)
        expect(localParts(mid)).toBe(k)
        // تقليم السجلّ في migration يفسّر المفاتيح هكذا
        expect(todayKey(new Date(k + 'T00:00:00'))).toBe(k)
      })

      it('كل أيام الجدول تبدأ بالساعة المحلّية المضبوطة', () => {
        setTZ(tz)
        const plan = buildProgram(DEFAULT_CONFIG)
        for (const d of plan.days) {
          const start = new Date(buildTimeline(d, plan.config).dayStartMs)
          expect(start.getHours()).toBe(8)
          expect(start.getMinutes()).toBe(30)
        }
        const dd = new Date(dayStartMs('2026-08-21', '08:30'))
        expect(dd.getHours()).toBe(8)
      })

      it('عبور حدود الشهر والسنة والسنة الكبيسة', () => {
        setTZ(tz)
        expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
        expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
      })
    })
  }
})
