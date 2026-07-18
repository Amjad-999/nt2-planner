import { describe, it, expect } from 'vitest'
import { todayKey, dayKeyOffset } from '@/lib/utils'

/**
 * Regression tests for the UTC day-key bug: todayKey used toISOString(),
 * so a user in Amsterdam (UTC+1/+2) studying just after local midnight got
 * yesterday's key — minutes, streaks and exam logs landed on the wrong day.
 */

describe('todayKey — local calendar date', () => {
  it('uses the local date even just after local midnight', () => {
    // Constructed in LOCAL time. Under the old UTC implementation this
    // returned '2026-01-14' in any UTC+ timezone.
    const d = new Date(2026, 0, 15, 0, 30)
    expect(todayKey(d)).toBe('2026-01-15')
  })

  it('uses the local date just before local midnight', () => {
    // Old implementation returned '2026-07-19' in any UTC− timezone.
    const d = new Date(2026, 6, 18, 23, 30)
    expect(todayKey(d)).toBe('2026-07-18')
  })

  it('keeps the stored YYYY-MM-DD format (zero-padded)', () => {
    expect(todayKey(new Date(2026, 2, 5))).toBe('2026-03-05')
    expect(todayKey()).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('dayKeyOffset(-1) is exactly one calendar day before todayKey()', () => {
    const y = new Date()
    y.setDate(y.getDate() - 1)
    expect(dayKeyOffset(-1)).toBe(todayKey(y))
    expect(dayKeyOffset(0)).toBe(todayKey())
  })
})
