import { describe, it, expect } from 'vitest'
import { phaseOfHour, msToNextBoundary } from '@/components/hero/journeyPhase'

// Local-time Date construction throughout (never ISO strings) so these pass
// on any machine timezone — same pitfall daykey-local.test.ts guards.
const at = (h: number, m = 0, s = 0) => new Date(2026, 6, 25, h, m, s).getTime()

describe('phaseOfHour', () => {
  it('maps every boundary to the phase that starts there', () => {
    expect(phaseOfHour(5)).toBe('dawn')
    expect(phaseOfHour(9)).toBe('day')
    expect(phaseOfHour(17)).toBe('dusk')
    expect(phaseOfHour(21)).toBe('night')
  })

  it('maps the last hour of each phase correctly', () => {
    expect(phaseOfHour(8)).toBe('dawn')
    expect(phaseOfHour(16)).toBe('day')
    expect(phaseOfHour(20)).toBe('dusk')
    expect(phaseOfHour(4)).toBe('night')
  })

  it('covers the midnight wrap', () => {
    expect(phaseOfHour(0)).toBe('night')
    expect(phaseOfHour(23)).toBe('night')
  })
})

describe('msToNextBoundary', () => {
  it('targets the next boundary within the same day', () => {
    // 10:00 → next boundary is 17:00, i.e. 7 hours away
    expect(msToNextBoundary(at(10))).toBe(7 * 3600000)
  })

  it('crosses midnight to 5:00 when past the last boundary', () => {
    // 22:00 → tomorrow 05:00 = 7 hours
    expect(msToNextBoundary(at(22))).toBe(7 * 3600000)
  })

  it('targets 5:00 same-day in the small hours', () => {
    // 03:00 → 05:00 = 2 hours
    expect(msToNextBoundary(at(3))).toBe(2 * 3600000)
  })

  it('lands exactly on a boundary → aims at the following one, not zero', () => {
    // Exactly 09:00 is already "day"; the next crossing is 17:00
    expect(msToNextBoundary(at(9))).toBe(8 * 3600000)
  })

  it('never arms a sub-second timer at a boundary edge', () => {
    // 16:59:59.5 → raw distance is 500ms; the clamp must return ≥1000
    expect(msToNextBoundary(at(16, 59, 59) + 500)).toBe(1000)
  })
})
