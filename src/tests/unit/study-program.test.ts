import { describe, it, expect } from 'vitest'
import {
  CURRICULUM_BOOKS, CURRICULUM_LESSONS, TOTAL_LESSONS, TOTAL_LESSON_MINUTES, LESSON_MINUTES,
  isKnownLesson, makeMinutesResolver,
} from '@/data/curriculum'
import {
  addDays, allLessonIds, buildSchedule, dayDiff, dayRange, distributeByWeight,
  DEFAULT_SCHEDULE_CONFIG,
} from '@/features/plan/schedule'
import { buildDayBlocks } from '@/features/plan/blocks'
import {
  computeProgress, programHealth, recoverSchedule, remainingLessonIds,
  type LessonBook,
} from '@/features/plan/progress'
import {
  createSession, elapsedMs, isStale, pause, positionOf, restartBlock, resume,
  sessionTotalMs, skipToNext, formatDuration, formatMinutes,
} from '@/features/plan/timer'

const START = '2026-08-21'
const DEADLINE = '2026-09-16'
const MIN = 60_000

function baseline() {
  return buildSchedule({ startKey: START, deadlineKey: DEADLINE, lessonIds: allLessonIds() })
}

/* ── المنهج ── */

describe('curriculum inventory', () => {
  it('holds exactly 184 lessons across 3 books', () => {
    expect(CURRICULUM_BOOKS).toHaveLength(3)
    expect(TOTAL_LESSONS).toBe(184)
    expect(CURRICULUM_LESSONS).toHaveLength(184)
  })

  it('matches the real, uneven section sizes read off the tables of contents', () => {
    const sizes = CURRICULUM_BOOKS.map((b) => b.sections.map((s) => s.lessonIds.length))
    expect(sizes).toEqual([
      [15, 15, 14, 12, 14, 12, 15, 12],  // TaalCompleet A2
      [8, 7, 8, 8, 8],                   // B1 deel 1
      [8, 8, 6, 7, 7],                   // B1 deel 2
    ])
    const perBook = sizes.map((s) => s.reduce((a, b) => a + b, 0))
    expect(perBook).toEqual([109, 39, 36])
    expect(perBook.reduce((a, b) => a + b, 0)).toBe(184)
  })

  it('keeps the printed thema numbers, so deel 2 starts at Thema 6', () => {
    const numbers = CURRICULUM_BOOKS.map((b) => b.sections.map((s) => s.number))
    expect(numbers).toEqual([
      [1, 2, 3, 4, 5, 6, 7, 8],
      [1, 2, 3, 4, 5],
      [6, 7, 8, 9, 10],
    ])
  })

  it('totals 3680 minutes of new content at the default 20 per lesson', () => {
    expect(LESSON_MINUTES).toBe(20)
    expect(TOTAL_LESSON_MINUTES).toBe(3680)
    expect(TOTAL_LESSON_MINUTES).toBe(61 * 60 + 20)
  })

  it('has unique ids and contiguous ordinals', () => {
    const ids = CURRICULUM_LESSONS.map((l) => l.id)
    expect(new Set(ids).size).toBe(184)
    expect(CURRICULUM_LESSONS.map((l) => l.ordinal)).toEqual(
      Array.from({ length: 184 }, (_, i) => i + 1),
    )
  })

  it('gives every lesson its printed label and a Dutch title', () => {
    for (const l of CURRICULUM_LESSONS) {
      expect(l.title.length, l.id).toBeGreaterThan(0)
      expect(l.label, l.id).toMatch(/^[0-9]+.[0-9]+$/)
    }
    const first = CURRICULUM_LESSONS[0]
    expect(first.label).toBe('1.1')
    expect(first.title).toBe('Nieuwe buren')
    const last = CURRICULUM_LESSONS[CURRICULUM_LESSONS.length - 1]
    expect(last.label).toBe('10.7')
    expect(last.title).toBe('En dan nog iets')
  })

  it('every lesson belongs to a section that lists it', () => {
    const inSections = CURRICULUM_BOOKS.flatMap((b) => b.sections.flatMap((s) => s.lessonIds))
    expect(inSections).toHaveLength(184)
    expect(new Set(inSections)).toEqual(new Set(CURRICULUM_LESSONS.map((l) => l.id)))
  })

  it('rejects ids that are not in the curriculum', () => {
    expect(isKnownLesson(CURRICULUM_LESSONS[0].id)).toBe(true)
    expect(isKnownLesson('c1-s1-l1')).toBe(false)   // معرّف المنهج القديم
    expect(isKnownLesson('')).toBe(false)
  })

  it('resolves per-book minute overrides, and ignores junk ones', () => {
    const plain = makeMinutesResolver()
    const a2First = CURRICULUM_LESSONS[0].id
    const b1First = CURRICULUM_LESSONS.find((l) => l.bookId === 'b1d1')!.id
    expect(plain(a2First)).toBe(20)
    const tuned = makeMinutesResolver({ b1d1: 40, b1d2: 40 })
    expect(tuned(a2First)).toBe(20)
    expect(tuned(b1First)).toBe(40)
    expect(makeMinutesResolver({ b1d1: 0 })(b1First)).toBe(20)
    expect(makeMinutesResolver({ b1d1: NaN })(b1First)).toBe(20)
  })
})

/* ── التقويم ── */

describe('calendar arithmetic', () => {
  it('counts 27 days from 21 Aug to 16 Sep inclusive', () => {
    expect(dayRange(START, DEADLINE)).toHaveLength(27)
    expect(dayDiff(START, DEADLINE)).toBe(26)
  })

  it('steps across a month boundary correctly', () => {
    expect(addDays('2026-08-31', 1)).toBe('2026-09-01')
    expect(addDays('2026-09-01', -1)).toBe('2026-08-31')
  })

  it('rejects malformed keys instead of inventing dates', () => {
    expect(dayRange('nonsense', DEADLINE)).toEqual([])
    expect(dayDiff('nonsense', DEADLINE)).toBe(0)
  })
})

describe('distributeByWeight', () => {
  it('always sums to exactly n', () => {
    for (const n of [0, 1, 7, 164, 165]) {
      for (const slots of [1, 3, 21, 24]) {
        const w = new Array(slots).fill(1)
        expect(distributeByWeight(n, w).reduce((a, b) => a + b, 0)).toBe(n)
      }
    }
  })

  it('respects relative weights', () => {
    expect(distributeByWeight(164, [0.75, 0.75, ...new Array(19).fill(1)]))
      .toEqual([6, 6, ...new Array(19).fill(8)])
  })

  it('returns zeros rather than throwing on empty input', () => {
    expect(distributeByWeight(10, [])).toEqual([])
    expect(distributeByWeight(10, [0, 0])).toEqual([0, 0])
  })
})

/* ── الجدول المرجعي ── */

describe('baseline schedule', () => {
  const s = baseline()

  it('is feasible and spans all 27 days', () => {
    expect(s.feasible).toBe(true)
    expect(s.unscheduled).toEqual([])
    expect(s.days).toHaveLength(27)
  })

  it('distributes all 184 lessons exactly once, in curriculum order', () => {
    const flat = s.days.flatMap((d) => d.lessonIds)
    expect(flat).toHaveLength(184)
    expect(new Set(flat).size).toBe(184)
    expect(flat).toEqual(allLessonIds())
  })

  it('loads ramp days lighter than full learning days', () => {
    const ramp = s.days.filter((d) => d.kind === 'ramp')
    const learn = s.days.filter((d) => d.kind === 'learn')
    expect(ramp).toHaveLength(2)
    expect(learn).toHaveLength(19)
    expect(learn.every((d) => d.lessonIds.length === 9)).toBe(true)
    /* أكبر الباقي يعطي اليوم الأول درسًا إضافيًّا؛ المهم أن يظل اليومان أخفّ. */
    expect(ramp.map((d) => d.lessonIds.length)).toEqual([7, 6])
    for (const r of ramp) expect(r.lessonIds.length).toBeLessThan(9)
    expect(s.peakLessonsPerDay).toBe(9)
    expect(s.learningDays).toBe(21)
    const total = [...ramp, ...learn].reduce((a, d) => a + d.lessonIds.length, 0)
    expect(total).toBe(184)
  })

  it('keeps consolidation, mock and final days free of new lessons', () => {
    const free = s.days.filter((d) => d.kind !== 'ramp' && d.kind !== 'learn')
    expect(free.map((d) => d.dayKey)).toEqual([
      '2026-08-27', '2026-09-03', '2026-09-10', '2026-09-14', '2026-09-15', '2026-09-16',
    ])
    expect(free.every((d) => d.lessonIds.length === 0)).toBe(true)
  })

  it('ends the study phase before the deadline and leaves the last day light', () => {
    const last = s.days[s.days.length - 1]
    expect(last.dayKey).toBe(DEADLINE)
    expect(last.kind).toBe('final')
    const lastWithLessons = [...s.days].reverse().find((d) => d.lessonIds.length > 0)
    expect(lastWithLessons?.dayKey).toBe('2026-09-13')
  })

  it('keeps the books in order and never interleaves them', () => {
    /* الكتب متتابعة لا متداخلة: كل درس من كتاب يأتي بعد كل دروس الكتاب السابق.
       يوم واحد قد يعبر حدّ كتاب، وهذا مقبول — لكن العودة إلى كتاب سابق ليست. */
    const order = ['a2', 'b1d1', 'b1d2']
    const seen = s.days.flatMap((d) => d.lessonIds).map((id) => id.split('-')[0])
    let cursor = 0
    for (const bookId of seen) {
      const at = order.indexOf(bookId)
      expect(at, bookId).toBeGreaterThanOrEqual(cursor)
      cursor = at
    }
    expect(cursor).toBe(2)
  })

  it('links every day to the previous day for recall', () => {
    for (let i = 1; i < s.days.length; i++) {
      expect(s.days[i].recallLessonIds).toEqual(s.days[i - 1].lessonIds)
    }
    expect(s.days[0].recallLessonIds).toEqual([])
  })

  it('links the spaced review to the lessons of 3 days earlier', () => {
    const gap = DEFAULT_SCHEDULE_CONFIG.spacedGapDays
    for (let i = gap; i < s.days.length; i++) {
      expect(s.days[i].reviewLessonIds).toEqual(s.days[i - gap].lessonIds)
    }
  })

  it('gives every lesson at least one scheduled review after it is learned', () => {
    const reviewed = new Set(s.days.flatMap((d) => [
      ...d.recallLessonIds, ...d.reviewLessonIds, ...d.consolidateLessonIds,
    ]))
    for (const id of allLessonIds()) expect(reviewed.has(id)).toBe(true)
  })

  it('never asks for more than the daily cap', () => {
    for (const d of s.days) expect(d.lessonIds.length).toBeLessThanOrEqual(DEFAULT_SCHEDULE_CONFIG.maxLessonsPerDay)
  })
})

/* ── كتل اليوم ── */

describe('day blocks', () => {
  const s = baseline()
  /* اليوم النمطي في وضع الاستقرار: 9 دروس جديدة، ومراجعتان ممتلئتان. */
  const standard = s.days.find(
    (d) => d.kind === 'learn' && d.recallLessonIds.length === 9 && d.reviewLessonIds.length === 9,
  )!
  const plan = buildDayBlocks(standard)

  it('covers every new lesson of the day exactly once', () => {
    const inBlocks = plan.blocks.filter((b) => b.kind === 'new').flatMap((b) => b.lessonIds)
    expect(inBlocks).toEqual(standard.lessonIds)
  })

  it('never splits a lesson across a break', () => {
    for (const b of plan.blocks.filter((x) => x.kind === 'new')) {
      expect(b.minutes % LESSON_MINUTES).toBe(0)
      expect(b.lessonIds.length).toBeLessThanOrEqual(2)
    }
  })

  it('reports the standard day honestly, however heavy it is', () => {
    expect(standard.lessonIds).toHaveLength(9)
    expect(plan.focusMinutes).toBe(241)
    expect(plan.breakMinutes).toBe(66)
    expect(plan.totalMinutes).toBe(307)
    /* خمس ساعات وسبع دقائق. الرقم لا يُجمَّل: هذا ما يتطلّبه 184 درسًا في 27 يومًا. */
    expect(plan.totalMinutes).toBe(5 * 60 + 7)
  })

  it('starts a day with recall and ends it with the closing block', () => {
    expect(plan.blocks[0].kind).toBe('recall')
    expect(plan.blocks[plan.blocks.length - 1].kind).toBe('close')
  })

  it('never ends the day on a break', () => {
    for (const d of s.days) {
      const b = buildDayBlocks(d).blocks
      expect(b[b.length - 1].kind).not.toBe('break')
    }
  })

  it('makes the final day short on purpose', () => {
    const final = buildDayBlocks(s.days[s.days.length - 1])
    expect(final.totalMinutes).toBeLessThanOrEqual(70)
    expect(final.blocks.some((b) => b.kind === 'new')).toBe(false)
  })

  it('gives consolidation and mock days work without new lessons', () => {
    for (const d of s.days.filter((x) => x.kind === 'consolidate' || x.kind === 'mock')) {
      const p = buildDayBlocks(d)
      expect(p.focusMinutes).toBeGreaterThan(90)
      expect(p.blocks.some((b) => b.kind === 'new')).toBe(false)
    }
  })

  it('every block carries a positive duration', () => {
    for (const d of s.days) {
      for (const b of buildDayBlocks(d).blocks) expect(b.minutes).toBeGreaterThan(0)
    }
  })
})

/* ── المؤقّت ── */

describe('session timer', () => {
  const s = baseline()
  const day = s.days.find((d) => d.kind === 'learn')!
  const blocks = buildDayBlocks(day).blocks
  const T0 = 1_756_000_000_000

  it('total equals the sum of block minutes', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    expect(sessionTotalMs(sess)).toBe(blocks.reduce((a, b) => a + b.minutes, 0) * MIN)
  })

  it('derives position from wall-clock, so a refresh changes nothing', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    const at = T0 + 25 * MIN
    const a = positionOf(sess, at)
    /* نفس الجلسة بعد إعادة التحميل: نفس الكائن المخزَّن، نفس اللحظة. */
    const reloaded = JSON.parse(JSON.stringify(sess))
    expect(positionOf(reloaded, at)).toEqual(a)
  })

  it('honours a per-book minute override end to end', () => {
    const b1Day = s.days.find((d) => d.lessonIds.some((id) => id.startsWith('b1d1-')))!
    const plain = buildDayBlocks(b1Day)
    const slow = buildDayBlocks(b1Day, (id) => (id.startsWith('b1d') ? 40 : 20))
    expect(slow.focusMinutes).toBeGreaterThan(plain.focusMinutes)
    const b1Count = b1Day.lessonIds.filter((id) => id.startsWith('b1d')).length
    expect(slow.focusMinutes - plain.focusMinutes).toBe(b1Count * 20)
  })

  it('lands on the right block after a long gap with the tab closed', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    const first = positionOf(sess, T0 + MIN)
    expect(first.index).toBe(0)
    expect(first.current?.kind).toBe('recall')
    const later = positionOf(sess, T0 + 120 * MIN)
    expect(later.index).toBeGreaterThan(first.index)
    expect(later.finished).toBe(false)
  })

  it('counts down in real seconds inside the current block', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    const a = positionOf(sess, T0 + 10_000)
    const b = positionOf(sess, T0 + 11_000)
    expect(a.remainingInBlockMs - b.remainingInBlockMs).toBe(1000)
  })

  it('names the next block and the wait until it starts', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    const p = positionOf(sess, T0 + MIN)
    expect(p.next?.id).toBe(blocks[1].id)
    expect(p.msUntilNext).toBe(p.remainingInBlockMs)
  })

  it('freezes while paused and resumes without losing time', () => {
    let sess = createSession(day.dayKey, blocks, T0)
    sess = pause(sess, T0 + 5 * MIN)
    expect(elapsedMs(sess, T0 + 60 * MIN)).toBe(5 * MIN)
    sess = resume(sess, T0 + 60 * MIN)
    expect(elapsedMs(sess, T0 + 61 * MIN)).toBe(6 * MIN)
    expect(positionOf(sess, T0 + 61 * MIN).paused).toBe(false)
  })

  it('skips to the next block without shortening the day', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    const before = positionOf(sess, T0 + MIN)
    const after = positionOf(skipToNext(sess, T0 + MIN), T0 + MIN)
    expect(after.index).toBe(before.index + 1)
    expect(after.totalMs).toBe(before.totalMs)
  })

  it('restarts the current block back to full', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    const mid = T0 + 8 * MIN
    const restarted = restartBlock(sess, mid)
    const p = positionOf(restarted, mid)
    expect(p.index).toBe(0)
    expect(p.remainingInBlockMs).toBe(blocks[0].minutes * MIN)
  })

  it('reports the day as finished past the last block', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    const p = positionOf(sess, T0 + 10 * 60 * MIN)
    expect(p.finished).toBe(true)
    expect(p.remainingTotalMs).toBe(0)
    expect(p.pct).toBe(100)
  })

  it('counts remaining focus time without the breaks', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    const p = positionOf(sess, T0)
    const focus = blocks.filter((b) => b.kind !== 'break').reduce((a, b) => a + b.minutes, 0)
    expect(p.remainingFocusMs).toBe(focus * MIN)
    expect(p.remainingFocusMs).toBeLessThan(p.remainingTotalMs)
  })

  it('flags a session from another day, a backwards clock, or a very old start', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    expect(isStale(sess, T0 + MIN, day.dayKey)).toBe(false)
    expect(isStale(sess, T0 + MIN, '2026-01-01')).toBe(true)
    expect(isStale(sess, T0 - 10 * MIN, day.dayKey)).toBe(true)
    expect(isStale(sess, T0 + 21 * 60 * MIN, day.dayKey)).toBe(true)
  })

  it('never returns a negative elapsed time', () => {
    const sess = createSession(day.dayKey, blocks, T0)
    expect(elapsedMs(sess, T0 - 5 * MIN)).toBe(0)
  })

  it('formats durations for display', () => {
    expect(formatDuration(0)).toBe('00:00')
    expect(formatDuration(65_000)).toBe('01:05')
    expect(formatDuration(3_725_000)).toBe('1:02:05')
    expect(formatMinutes(216)).toBe('3 س 36 د')
    expect(formatMinutes(60)).toBe('1 س')
    expect(formatMinutes(45)).toBe('45 د')
  })
})

/* ── التقدّم ── */

describe('progress', () => {
  it('starts at zero with an empty book', () => {
    const p = computeProgress({})
    expect(p.covered).toBe(0)
    expect(p.remaining).toBe(184)
    expect(p.coveredPct).toBe(0)
    expect(p.masteryPct).toBe(0)
    expect(p.minutesRemaining).toBe(3680)
  })

  it('counts the remaining minutes from each lesson, not from a flat average', () => {
    const plain = computeProgress({})
    const slowB1 = computeProgress({}, { b1d1: 40, b1d2: 40 })
    /* 75 درسًا من B1 تكسب 20 دقيقة إضافية لكل درس. */
    expect(slowB1.minutesRemaining - plain.minutesRemaining).toBe(75 * 20)
    expect(slowB1.remaining).toBe(plain.remaining)
  })

  it('separates coverage from mastery', () => {
    const book: LessonBook = {}
    for (const id of allLessonIds().slice(0, 92)) book[id] = { s: 'weak', at: 0, reps: 1 }
    const p = computeProgress(book)
    expect(p.coveredPct).toBe(50)
    expect(p.masteryPct).toBe(15)
    expect(p.weakIds).toHaveLength(92)
  })

  it('reaches 100 percent only when every lesson is mastered', () => {
    const book: LessonBook = {}
    for (const id of allLessonIds()) book[id] = { s: 'mastered', at: 0, reps: 3 }
    const p = computeProgress(book)
    expect(p.coveredPct).toBe(100)
    expect(p.masteryPct).toBe(100)
    expect(remainingLessonIds(book)).toEqual([])
  })

  it('keeps unfinished lessons in the queue but not weak ones', () => {
    const book: LessonBook = { [allLessonIds()[0]]: { s: 'learning', at: 0, reps: 0 } }
    expect(remainingLessonIds(book)[0]).toBe(allLessonIds()[0])
    book[allLessonIds()[0]] = { s: 'weak', at: 0, reps: 1 }
    expect(remainingLessonIds(book)[0]).toBe(allLessonIds()[1])
  })
})

/* ── الصحّة والتعافي ── */

describe('program health', () => {
  const base = baseline()

  function healthAt(todayKey: string, coveredCount: number) {
    const book: LessonBook = {}
    for (const id of allLessonIds().slice(0, coveredCount)) book[id] = { s: 'done', at: 0, reps: 1 }
    const rec = recoverSchedule({
      startKey: START, todayKey, deadlineKey: DEADLINE, lessonIds: remainingLessonIds(book),
    })
    return { h: programHealth({ baseline: base, live: rec.live, book, todayKey, deadlineKey: DEADLINE }), rec }
  }

  it('reads on-track on day one with nothing done yet', () => {
    expect(healthAt(START, 0).h.status).toBe('ontrack')
  })

  it('reads behind, with the exact lesson lag', () => {
    /* حتى نهاية 24 أغسطس: 7 + 6 + 9 + 9 = 31 درسًا. */
    const { h } = healthAt('2026-08-25', 10)
    expect(h.expectedByYesterday).toBe(31)
    expect(h.lag).toBe(21)
    expect(h.status).toBe('behind')
  })

  it('reads ahead when more is done than the day required', () => {
    expect(healthAt('2026-08-25', 60).h.status).toBe('ahead')
  })

  it('reads done when every lesson is covered', () => {
    expect(healthAt('2026-09-05', 184).h.status).toBe('done')
  })

  it('recomputes a workable daily load after falling behind', () => {
    const { h, rec } = healthAt('2026-09-01', 40)
    expect(rec.live.feasible).toBe(true)
    expect(h.neededPerDay).toBeGreaterThan(9)
    expect(h.neededPerDay).toBeLessThanOrEqual(DEFAULT_SCHEDULE_CONFIG.maxLessonsPerDay)
  })

  it('reflects the real starting point: A2 thema 1 and 2 already done', () => {
    const { h, rec } = healthAt('2026-08-22', 30)
    expect(rec.live.feasible).toBe(true)
    /* 154 درسًا متبقّيًا، والذروة تبقى تحت السقف. */
    expect(rec.live.days.flatMap((d) => d.lessonIds)).toHaveLength(154)
    expect(rec.live.peakLessonsPerDay).toBeLessThanOrEqual(9)
    /* الجدول المرجعي كان يتوقّع 13 درسًا حتى نهاية اليوم الثاني، وقد أُنجز 30:
       العمل السابق للبرنامج يُحتسب تقدّمًا، لا يُهمَل. */
    expect(h.expectedByToday).toBe(13)
    expect(h.status).toBe('ahead')
  })
})

describe('recovery ladder', () => {
  it('costs nothing when the plan still fits', () => {
    const r = recoverSchedule({
      startKey: START, todayKey: START, deadlineKey: DEADLINE, lessonIds: allLessonIds(),
    })
    expect(r.live.feasible).toBe(true)
    expect(r.sacrificesAr).toEqual([])
    expect(r.shortfall).toBe(0)
  })

  it('protects review time first and gives up the pre-exam tail before it', () => {
    const behind = allLessonIds().slice(0, 130)
    const r = recoverSchedule({
      startKey: START, todayKey: '2026-09-05', deadlineKey: DEADLINE, lessonIds: behind,
    })
    expect(r.live.feasible).toBe(true)
    expect(r.sacrificesAr.length).toBeGreaterThan(0)
    /* أيام التثبيت الأسبوعية لا تسقط قبل أيام ما قبل الامتحان. */
    const tailFirst = r.sacrificesAr.findIndex((x) => x.includes('ما قبل الامتحان'))
    const consolidateAt = r.sacrificesAr.findIndex((x) => x.includes('التثبيت'))
    expect(tailFirst).toBe(0)
    if (consolidateAt >= 0) expect(consolidateAt).toBeGreaterThan(tailFirst)
  })

  it('says plainly when the schedule is impossible instead of inventing one', () => {
    const r = recoverSchedule({
      startKey: START, todayKey: '2026-09-14', deadlineKey: DEADLINE, lessonIds: allLessonIds(),
    })
    expect(r.live.feasible).toBe(false)
    expect(r.shortfall).toBeGreaterThan(0)
    expect(r.verdictAr).toContain('غير قابل للتنفيذ')
  })

  it('never schedules past the deadline', () => {
    const r = recoverSchedule({
      startKey: START, todayKey: '2026-09-10', deadlineKey: DEADLINE, lessonIds: allLessonIds().slice(0, 40),
    })
    for (const d of r.live.days) expect(dayDiff(d.dayKey, DEADLINE)).toBeGreaterThanOrEqual(0)
  })
})
