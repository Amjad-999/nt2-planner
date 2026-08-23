import { describe, it, expect } from 'vitest'
import { buildSchedule, allLessonIds, dayNewMinutes, distributeByWeight } from '@/features/plan/schedule'
import { CURRICULUM_LESSONS, makeMinutesResolver } from '@/data/curriculum'

/**
 * Day balance once lessons stop costing the same.
 *
 * The scheduler split lesson *counts*, which equals splitting minutes only
 * while every lesson is 20 minutes. `setBookLessonMinutes` exists precisely so
 * a user can say otherwise — B1 lessons run about twice the pages of A2, so
 * 40 vs 20 is the realistic setting — and at that point equal counts stop
 * meaning equal work.
 */

const START = '2026-08-21'
const DEADLINE = '2026-09-16'

/** B1 lessons twice the length of A2 — the realistic per-book override. */
const OVERRIDES = { a2: 20, b1d1: 40, b1d2: 40 }
const byId = new Map(CURRICULUM_LESSONS.map((l) => [l.id, l]))
const minutesOf = (id: string) => OVERRIDES[byId.get(id)!.bookId as keyof typeof OVERRIDES] ?? 20

const learningDays = (input: Parameters<typeof buildSchedule>[0]) =>
  buildSchedule(input).days.filter((d) => d.lessonIds.length > 0)

const spread = (mins: number[]) => Math.max(...mins) / Math.min(...mins)

describe('توازن الأيام بالدقائق', () => {
  const base = { startKey: START, deadlineKey: DEADLINE, lessonIds: allLessonIds() }

  it('التوزيع بالعدد يترك تفاوتًا كبيرًا حين تختلف مدد الدروس', () => {
    // The behaviour being fixed, pinned so the regression is visible.
    const days = learningDays(base)          // no minutesOf → count split
    const mins = days.map((d) => dayNewMinutes(d, minutesOf))
    expect(spread(mins)).toBeGreaterThan(2.5)
  })

  it('تمرير minutesOf يضغط التفاوت إلى حدود معقولة', () => {
    const days = learningDays({ ...base, minutesOf })
    const mins = days.map((d) => dayNewMinutes(d, minutesOf))
    // Ramp days are deliberately lighter (rampWeight 0.75), so perfect equality
    // is not the target — the tail simply must stop carrying triple the load.
    expect(spread(mins)).toBeLessThan(1.7)
  })

  it('لا درس يضيع أو يتكرّر، والترتيب التراكمي محفوظ', () => {
    const ids = buildSchedule({ ...base, minutesOf }).days.flatMap((d) => d.lessonIds)
    expect(ids).toHaveLength(CURRICULUM_LESSONS.length)
    expect(new Set(ids).size).toBe(CURRICULUM_LESSONS.length)
    expect(ids).toEqual(allLessonIds())
  })

  it('السقف اليومي محترم', () => {
    const cap = 9
    const days = learningDays({ ...base, minutesOf, config: { maxLessonsPerDay: cap } })
    for (const d of days) expect(d.lessonIds.length).toBeLessThanOrEqual(cap)
  })

  it('الجدول يبقى قابلًا للتنفيذ', () => {
    expect(buildSchedule({ ...base, minutesOf }).feasible).toBe(true)
  })
})

describe('المسار الافتراضي لم يتغيّر', () => {
  const base = { startKey: START, deadlineKey: DEADLINE, lessonIds: allLessonIds() }

  it('المدد الموحّدة تُنتج نفس التوزيع تمامًا مع minutesOf وبدونه', () => {
    const without = learningDays(base).map((d) => d.lessonIds)
    const withUniform = learningDays({ ...base, minutesOf: () => 20 }).map((d) => d.lessonIds)
    expect(withUniform).toEqual(without)
  })

  it('محلّل المدّة الافتراضي موحّد، فالجداول القائمة لا تتأثّر', () => {
    const resolver = makeMinutesResolver({})
    const all = allLessonIds()
    expect(new Set(all.map(resolver)).size).toBe(1)
    expect(learningDays({ ...base, minutesOf: resolver }).map((d) => d.lessonIds))
      .toEqual(learningDays(base).map((d) => d.lessonIds))
  })

  it('distributeByWeight ما زال دقيقًا (أكبر الباقي)', () => {
    for (const n of [0, 1, 7, 164, 184, 300]) {
      const w = [0.75, 0.75, 1, 1, 1, 1, 1]
      const out = distributeByWeight(n, w)
      expect(out.reduce((a, b) => a + b, 0)).toBe(n)
      expect(out).toHaveLength(w.length)
    }
  })
})
