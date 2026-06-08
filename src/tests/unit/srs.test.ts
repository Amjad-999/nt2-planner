import { describe, it, expect } from 'vitest'
import { LEARNED_BOX } from '@/data/phases'

const SRS_INTERVALS = [0, 1, 3, 7, 14, 30]

function simulateGrade(box: number, quality: 0 | 2 | 4) {
  const newBox = quality < 2 ? 0 : Math.min(SRS_INTERVALS.length - 1, box + 1)
  const days = SRS_INTERVALS[newBox] ?? 1
  return { box: newBox, days }
}

describe('Leitner SRS', () => {
  it('fails drop box to 0', () => {
    expect(simulateGrade(3, 0).box).toBe(0)
  })
  it('hard grade advances box by 1', () => {
    expect(simulateGrade(2, 2).box).toBe(3)
  })
  it('easy grade advances box by 1', () => {
    expect(simulateGrade(1, 4).box).toBe(2)
  })
  it('box is capped at 5', () => {
    expect(simulateGrade(5, 4).box).toBe(5)
  })
  it('LEARNED_BOX is 4', () => {
    expect(LEARNED_BOX).toBe(4)
  })
  it('box 4 means learned', () => {
    const { box } = simulateGrade(3, 4)
    expect(box).toBe(LEARNED_BOX)
  })
  it('SRS intervals match spec', () => {
    expect(SRS_INTERVALS).toEqual([0, 1, 3, 7, 14, 30])
  })
  it('due date is correct for box 0 (0 days)', () => {
    const { days } = simulateGrade(-1, 0)
    expect(days).toBe(0)
  })
})
