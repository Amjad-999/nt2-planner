import { describe, it, expect } from 'vitest'
import { ringState } from '@/components/countdown/countdownRing'

const DAY = 86400000
const NOW = new Date('2026-03-01T12:00:00Z').getTime()
const iso = (offsetDays: number) => new Date(NOW + offsetDays * DAY).toISOString()

describe('ringState', () => {
  it('CRITICAL: reports "unset" — never an invented day count — when no date was picked', () => {
    for (const bad of ['', 'not-a-date']) {
      const r = ringState(bad, iso(-10), NOW)
      expect(r.phase).toBe('unset')
      expect(r.daysLeft).toBeNull()
      expect(r.elapsed).toBe(0)
    }
  })

  it('counts CALENDAR days, so the number cannot drift with the time of day', () => {
    expect(ringState(iso(10), iso(-2), NOW).daysLeft).toBe(10)

    // The date picker always stores 09:00. Whether "now" is before or after
    // that hour must not change the answer — the old hours-based count showed
    // 5 in the afternoon and 6 in the morning for the same picked date.
    const pick = (h: number) => {
      const d = new Date(NOW + 5 * DAY); d.setHours(h, 0, 0, 0); return d.toISOString()
    }
    const morning = new Date(NOW); morning.setHours(8, 0, 0, 0)
    const evening = new Date(NOW); evening.setHours(20, 0, 0, 0)
    expect(ringState(pick(9), iso(-2), morning.getTime()).daysLeft).toBe(5)
    expect(ringState(pick(9), iso(-2), evening.getTime()).daysLeft).toBe(5)
  })

  it('fills the ring with the share of the study window already spent', () => {
    // window = 2 days behind + 10 ahead = 12; 2 spent
    expect(ringState(iso(10), iso(-2), NOW).elapsed).toBeCloseTo(2 / 12, 5)
    expect(ringState(iso(30), iso(0), NOW).elapsed).toBe(0)
  })

  it('clamps the fill to 0…1 for nonsensical windows instead of overflowing the ring', () => {
    expect(ringState(iso(10), iso(20), NOW).elapsed).toBe(1)   // start after the exam
    expect(ringState(iso(10), iso(5), NOW).elapsed).toBe(0)    // start still in the future
    expect(ringState(iso(1), iso(-99), NOW).elapsed).toBeLessThanOrEqual(1)
  })

  it('distinguishes exam day from a date that has already gone by', () => {
    // Exam day is a CALENDAR question: an exam timed 09:00 is still "today"
    // at 14:00, even though its timestamp is already behind us.
    const today9am = new Date(NOW); today9am.setHours(9, 0, 0, 0)
    expect(ringState(today9am.toISOString(), iso(-30), NOW).phase).toBe('today')

    const today10pm = new Date(NOW); today10pm.setHours(22, 0, 0, 0)
    expect(ringState(today10pm.toISOString(), iso(-30), NOW).phase).toBe('today')

    expect(ringState(iso(-2), iso(-30), NOW).phase).toBe('past')
    expect(ringState(iso(3), iso(-30), NOW).phase).toBe('counting')
  })
})
