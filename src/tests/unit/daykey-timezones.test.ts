import { describe, it, expect, afterAll, vi } from 'vitest'
import { todayKey, dayKeyOffset } from '@/lib/utils'
import { addDays, dayDiff, dayRange, keyToUtc, utcToKey } from '@/features/plan/schedule'

/**
 * Timezone matrix for day keys.
 *
 * daykey-local.test.ts already pins the local-date contract, but it builds its
 * Dates in local time, so on a UTC machine it passes even against the old
 * toISOString() implementation — exactly the machine CI is most likely to be.
 * This file forces specific zones so the regression is caught regardless of
 * where the suite runs.
 *
 * Zones are switched with vi.stubEnv rather than a TZ= env var: TZ= is silently
 * ignored by Node on Windows for everything except UTC, so an env-var harness
 * would report seven passes while only ever exercising one zone. The first test
 * asserts the switching actually works, so this file fails loudly rather than
 * quietly verifying nothing.
 */

const ZONES = [
  'UTC',
  'Pacific/Kiritimati',   // UTC+14 — earliest on earth
  'Pacific/Midway',       // UTC-11 — latest
  'Asia/Kathmandu',       // UTC+5:45 — fractional offset
  'Europe/Amsterdam',     // the app's audience
  'America/New_York',
  'Australia/Sydney',
]

afterAll(() => { vi.unstubAllEnvs() })

const localDate = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

describe('day keys across timezones', () => {
  it('vi.stubEnv really does change the zone', () => {
    vi.stubEnv('TZ', 'Pacific/Kiritimati')
    const east = new Date().getTimezoneOffset()
    vi.stubEnv('TZ', 'Pacific/Midway')
    const west = new Date().getTimezoneOffset()
    expect(east).not.toBe(west)
  })

  for (const tz of ZONES) {
    describe(tz, () => {
      it('todayKey is the local calendar date at every hour of the day', () => {
        vi.stubEnv('TZ', tz)
        for (let h = 0; h < 24; h++) {
          const d = new Date()
          d.setHours(h, 30, 0, 0)
          expect(todayKey(d)).toBe(localDate(d))
        }
      })

      it('just past local midnight stays on today, not yesterday', () => {
        vi.stubEnv('TZ', tz)
        // The exact case that sent Amsterdam study minutes to the wrong bucket.
        expect(todayKey(new Date(2026, 0, 15, 0, 30))).toBe('2026-01-15')
        expect(todayKey(new Date(2026, 6, 18, 23, 30))).toBe('2026-07-18')
      })

      it('key arithmetic agrees with local day offsets', () => {
        vi.stubEnv('TZ', tz)
        expect(dayKeyOffset(0)).toBe(todayKey())
        expect(addDays(todayKey(), 1)).toBe(dayKeyOffset(1))
        expect(addDays(dayKeyOffset(-1), 1)).toBe(todayKey())
        expect(dayDiff(dayKeyOffset(-3), todayKey())).toBe(3)
      })

      it('arithmetic is immune to month, year, leap and DST boundaries', () => {
        vi.stubEnv('TZ', tz)
        expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
        expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
        expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
        expect(addDays('2029-02-28', 1)).toBe('2029-03-01')
        // Netherlands DST ends 2026-10-25; a local-time implementation can
        // land back on the same date across that boundary.
        expect(addDays('2026-10-24', 1)).toBe('2026-10-25')
        expect(addDays('2026-10-25', 1)).toBe('2026-10-26')
        expect(dayDiff('2026-10-24', '2026-10-26')).toBe(2)
        expect(dayRange('2026-10-24', '2026-10-26')).toEqual(['2026-10-24', '2026-10-25', '2026-10-26'])
      })

      it('keyToUtc/utcToKey round-trip without drifting a day', () => {
        vi.stubEnv('TZ', tz)
        for (const k of ['2026-01-01', '2026-06-15', '2026-10-25', '2026-12-31']) {
          expect(utcToKey(keyToUtc(k))).toBe(k)
        }
      })

      it('a full plan window has no gaps or duplicates', () => {
        vi.stubEnv('TZ', tz)
        const range = dayRange('2026-08-21', '2026-09-16')
        expect(range).toHaveLength(27)
        expect(new Set(range).size).toBe(27)
        for (let i = 1; i < range.length; i++) {
          expect(dayDiff(range[i - 1], range[i])).toBe(1)
        }
      })
    })
  }
})
