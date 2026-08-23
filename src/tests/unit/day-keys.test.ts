import { describe, it, expect } from 'vitest'
import { todayKey, dayKeyOffset } from '@/lib/utils'
import { localKey, localToday, keyToDate, addDays } from '@/features/program/dates'

/** مكوّنات التاريخ المحلّي — التعريف المرجعي الذي يجب أن يطابقه المفتاح. */
const localParts = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('مفتاح اليوم محلّي لا UTC', () => {
  it('todayKey يطابق التاريخ المحلّي لأي لحظة', () => {
    // لحظات موزّعة على مدار اليوم عبر شهور وسنوات مختلفة
    for (const iso of [
      '2026-08-21T22:30:00Z', '2026-08-21T00:30:00Z', '2026-08-21T12:00:00Z',
      '2026-12-31T23:59:00Z', '2027-01-01T00:01:00Z', '2028-02-28T23:00:00Z',
      '2026-10-25T00:30:00Z', '2026-06-15T13:45:00Z',
    ]) {
      const d = new Date(iso)
      expect(todayKey(d)).toBe(localParts(d))
    }
  })

  it('يختلف عن UTC حين تختلف المنطقة الزمنية عن غرينتش', () => {
    const offsetMin = new Date('2026-08-21T22:30:00Z').getTimezoneOffset()
    const d = new Date('2026-08-21T22:30:00Z')
    const utcKey = d.toISOString().slice(0, 10)
    if (offsetMin !== 0) {
      // في منطقة غير UTC يجب أن يتبع المفتاح الساعة المحلّية
      expect(todayKey(d)).toBe(localParts(d))
      // وفي المناطق شرق غرينتش تحديدًا يسبق المفتاح مفتاح UTC
      if (offsetMin < 0) expect(todayKey(d) > utcKey).toBe(true)
    } else {
      expect(todayKey(d)).toBe(utcKey)
    }
  })

  it('لا مسافة زمنية بين مفتاح اليوم ومنتصف ليله المحلّي', () => {
    const k = todayKey()
    const mid = keyToDate(k)
    expect(mid.getHours()).toBe(0)
    expect(localParts(mid)).toBe(k)
  })

  it('dayKeyOffset يتبع الأيام المحلّية', () => {
    expect(dayKeyOffset(0)).toBe(todayKey())
    expect(addDays(dayKeyOffset(-1), 1)).toBe(todayKey())
    expect(addDays(todayKey(), 1)).toBe(dayKeyOffset(1))
  })
})

describe('مفتاح واحد للتطبيق كلّه', () => {
  it('البرنامج والسجلّ اليومي يستخدمان التعريف نفسه', () => {
    expect(localToday()).toBe(todayKey())
    const d = new Date('2026-08-21T22:30:00Z')
    expect(localKey(d)).toBe(todayKey(d))
    expect(localToday(d.getTime())).toBe(todayKey(d))
  })

  it('جلسة قرب منتصف الليل تُسجَّل في يومها المحلّي لا في يوم آخر', () => {
    // 00:30 محلّيًا — أخطر لحظة: UTC قد يكون في اليوم السابق
    const nearMidnight = new Date()
    nearMidnight.setHours(0, 30, 0, 0)
    const programDay = localToday(nearMidnight.getTime())
    const historyKey = todayKey(nearMidnight)
    expect(programDay).toBe(historyKey)
    expect(programDay).toBe(localParts(nearMidnight))
  })

  it('تقليم السجلّ يفسّر المفاتيح كما تُكتب (منتصف ليل محلّي)', () => {
    const k = todayKey()
    // migration.ts يقلّم عبر new Date(k + 'T00:00:00') — تفسير محلّي
    expect(todayKey(new Date(k + 'T00:00:00'))).toBe(k)
  })
})
