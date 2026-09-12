import { describe, it, expect } from 'vitest'
import { SITUATIONS } from '@/data/situations'

/**
 * محتوى المواقف اليومية.
 *
 * Conversation practice teaches by example, so the content itself has to hold
 * up: one fitting reply per turn, distractors that are wrong because they do
 * not FIT (never because the Dutch is broken), the formal register this app
 * uses throughout, and a reason in Arabic for every option — a wrong pick has
 * to teach something.
 */

describe('every situation is complete', () => {
  it('carries a real scene, turns and phrases to keep', () => {
    expect(SITUATIONS.length).toBeGreaterThanOrEqual(8)
    for (const s of SITUATIONS) {
      expect(s.turns.length, `${s.id} has too few turns`).toBeGreaterThanOrEqual(3)
      expect(s.phrases.length, `${s.id} keeps no phrases`).toBeGreaterThanOrEqual(3)
      expect(s.contextAr.length, `${s.id} has no scene`).toBeGreaterThan(20)
      expect(s.titleNl.length).toBeGreaterThan(3)
      expect(s.titleAr.length).toBeGreaterThan(3)
    }
  })

  it('gives every id exactly once', () => {
    expect(new Set(SITUATIONS.map((s) => s.id)).size).toBe(SITUATIONS.length)
  })
})

describe('every turn is answerable', () => {
  it('offers exactly one fitting reply among at least three options', () => {
    for (const s of SITUATIONS) {
      for (const [i, t] of s.turns.entries()) {
        expect(t.choices.length, `${s.id} turn ${i}`).toBeGreaterThanOrEqual(3)
        expect(t.choices.filter((c) => c.ok).length, `${s.id} turn ${i} must have one fitting reply`).toBe(1)
      }
    }
  })

  it('does not park the right answer in the same slot every time', () => {
    const positions = new Set(
      SITUATIONS.flatMap((s) => s.turns.map((t) => t.choices.findIndex((c) => c.ok))),
    )
    expect(positions.size, 'a learner would pass by always tapping the same option').toBeGreaterThan(1)
  })

  it('explains every option, right or wrong', () => {
    for (const s of SITUATIONS) {
      for (const t of s.turns) {
        for (const c of t.choices) {
          expect(c.whyAr.length, `${s.id}: "${c.nl}" has no reason`).toBeGreaterThan(10)
          expect(c.ar.length, `${s.id}: "${c.nl}" has no Arabic meaning`).toBeGreaterThan(2)
        }
      }
    }
  })
})

describe('the Dutch is the Dutch this app teaches', () => {
  it('stays formal — never je, jij, jouw or jou', () => {
    const informal = /\b(je|jij|jouw|jou)\b/i
    for (const s of SITUATIONS) {
      expect(s.titleNl, `${s.id} title`).not.toMatch(informal)
      for (const t of s.turns) {
        expect(t.nl, `${s.id}: "${t.nl}"`).not.toMatch(informal)
        for (const c of t.choices) expect(c.nl, `${s.id}: "${c.nl}"`).not.toMatch(informal)
      }
      for (const p of s.phrases) expect(p.nl, `${s.id}: "${p.nl}"`).not.toMatch(informal)
    }
  })

  it('uses ASCII digits only, so check:digits can never fail on it', () => {
    const text = JSON.stringify(SITUATIONS)
    // Escaped on purpose: writing the range literally would itself trip check:digits.
    expect(/[\u0660-\u0669]/.test(text)).toBe(false)
  })
})
