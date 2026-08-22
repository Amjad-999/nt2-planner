import { describe, it, expect } from 'vitest'
import { checkWriting } from '@/features/exam/writingCheck'
import { EXAM_WRITING } from '@/data/examContent'
import type { ExamWritingItem } from '@/store/types'

const formalTask: ExamWritingItem = {
  id: 't1', kind: 'email', ar: 'اختبار', titleNl: 'Test', briefNl: 'Test brief', briefAr: 'اختبار',
  minWords: 20, maxWords: 40, register: 'formeel',
  points: [
    { ar: 'اذكر السبب', any: ['omdat', 'want'] },
    { ar: 'اذكر الموعد', any: ['maandag', 'dinsdag'] },
  ],
}

describe('checkWriting — empty input', () => {
  it('scores zero and never throws', () => {
    const r = checkWriting('', formalTask)
    expect(r.total).toBe(0)
    expect(r.wordCount).toBe(0)
    expect(r.missingPointsAr).toHaveLength(2)
  })
})

describe('checkWriting — content coverage', () => {
  it('counts a point as covered when any of its wordings appears', () => {
    const r = checkWriting('Ik kan niet komen omdat ik moet werken op maandag.', formalTask)
    expect(r.coveredPoints).toBe(2)
    expect(r.missingPointsAr).toHaveLength(0)
  })

  it('reports the missing point by its Arabic label', () => {
    const r = checkWriting('Ik kan niet komen omdat ik moet werken.', formalTask)
    expect(r.coveredPoints).toBe(1)
    expect(r.missingPointsAr).toEqual(['اذكر الموعد'])
  })

  it('is case insensitive on the keywords', () => {
    const r = checkWriting('OMDAT ik ziek ben. Op MAANDAG kan ik niet.', formalTask)
    expect(r.coveredPoints).toBe(2)
  })
})

describe('checkWriting — register', () => {
  it('penalises informal pronouns when the task is formal', () => {
    const informal = checkWriting('Beste Lisa, ik kan niet komen omdat je les op maandag is. Met vriendelijke groet.', formalTask)
    const formal = checkWriting('Beste Lisa, ik kan niet komen omdat uw les op maandag is. Met vriendelijke groet.', formalTask)
    const scoreOf = (r: ReturnType<typeof checkWriting>) => r.criteria.find((c) => c.key === 'register')!.score
    expect(scoreOf(informal)).toBeLessThan(scoreOf(formal))
    expect(scoreOf(formal)).toBe(100)
  })

  it('does not penalise informal pronouns when the task allows them', () => {
    const casual: ExamWritingItem = { ...formalTask, register: 'informeel' }
    const r = checkWriting('Hoi Daan, bedankt! Kun je op maandag de post checken omdat ik weg ben?', casual)
    expect(r.criteria.find((c) => c.key === 'register')!.score).toBe(100)
  })
})

describe('checkWriting — the sure-thing error rules', () => {
  const cases: [string, string][] = [
    ['Deze bank is groter als die stoel.', 'dan'],
    ['Hun hebben gisteren gebeld.', 'zij'],
    ['Me broer woont in Utrecht.', 'mijn'],
    ['Ik wordt morgen vroeg wakker.', 'ik word'],
  ]
  for (const [text, expectedFix] of cases) {
    it(`flags: ${text}`, () => {
      const r = checkWriting(text, formalTask)
      expect(r.issues.length).toBeGreaterThan(0)
      expect(r.issues.some((i) => i.fixNl.toLowerCase().includes(expectedFix))).toBe(true)
      expect(r.issues.every((i) => i.whyAr.length > 0)).toBe(true)
    })
  }

  it('stays quiet on clean formal Dutch — no false accusations', () => {
    const clean = 'Geachte heer De Wit, ik kan maandag niet komen omdat ik moet werken. Deze week is drukker dan vorige week. Mijn collega heeft het doorgegeven. Met vriendelijke groet, Amjad.'
    const r = checkWriting(clean, formalTask)
    expect(r.issues).toHaveLength(0)
  })
})

describe('checkWriting — length', () => {
  const words = (n: number) => Array.from({ length: n }, () => 'woord').join(' ') + '.'

  it('gives full marks inside the range', () => {
    const r = checkWriting(words(30), formalTask)
    expect(r.criteria.find((c) => c.key === 'lengte')!.score).toBe(100)
  })

  it('scores a far-too-short text below a slightly-short one', () => {
    const veryShort = checkWriting(words(5), formalTask)
    const nearlyThere = checkWriting(words(18), formalTask)
    const of = (r: ReturnType<typeof checkWriting>) => r.criteria.find((c) => c.key === 'lengte')!.score
    expect(of(veryShort)).toBeLessThan(of(nearlyThere))
  })

  it('penalises overlong texts', () => {
    expect(checkWriting(words(90), formalTask).criteria.find((c) => c.key === 'lengte')!.score).toBeLessThan(60)
  })
})

describe('checkWriting — totals and weights', () => {
  it('keeps the total between zero and one hundred', () => {
    for (const t of EXAM_WRITING) {
      for (const sample of ['', 'kort', 'Geachte heer, omdat ik maandag moet werken kan ik niet komen. Met vriendelijke groet.']) {
        const r = checkWriting(sample, t)
        expect(r.total).toBeGreaterThanOrEqual(0)
        expect(r.total).toBeLessThanOrEqual(100)
      }
    }
  })

  it('has weights that add up to one hundred', () => {
    const r = checkWriting('test', formalTask)
    expect(r.criteria.reduce((sum, c) => sum + c.weight, 0)).toBe(100)
  })
})

describe('EXAM_WRITING data integrity', () => {
  it('every task has a register and at least three content points', () => {
    for (const t of EXAM_WRITING) {
      expect(['formeel', 'informeel']).toContain(t.register)
      expect(t.points.length).toBeGreaterThanOrEqual(3)
      for (const p of t.points) {
        expect(p.ar.trim().length).toBeGreaterThan(0)
        expect(p.any.length).toBeGreaterThan(0)
        // keywords must be lowercase, otherwise the includes() check silently misses
        for (const k of p.any) expect(k).toBe(k.toLowerCase())
      }
    }
  })

  it('has a sane word range on every task', () => {
    for (const t of EXAM_WRITING) {
      expect(t.minWords).toBeGreaterThan(0)
      expect(t.maxWords).toBeGreaterThan(t.minWords)
    }
  })
})
