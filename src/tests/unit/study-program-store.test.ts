import { describe, it, expect } from 'vitest'
import { defaultState, applyState } from '@/store/migration'
import { mergeStates } from '@/features/cloud/merge'
import type { State } from '@/store/types'
import { allLessonIds, buildSchedule } from '@/features/plan/schedule'
import { buildDayBlocks } from '@/features/plan/blocks'
import { toSessionBlock, positionOf, createSession } from '@/features/plan/timer'
import { buildProgramView } from '@/features/plan/program'
import { CURRICULUM_BOOKS, CURRICULUM_LESSONS } from '@/data/curriculum'
import { orderLessons } from '@/features/plan/progress'

/**
 * البرنامج داخل المخزن: البذرة، والتنقية، والمزامنة السحابية.
 *
 * The sync path is where a new field silently disappears — merge builds an
 * explicit literal, so a missing key reverts the field to default on the next
 * sync with no error anywhere.
 */

const START = '2026-08-21'
const DEADLINE = '2026-09-16'

function withProgram(patch: Partial<State['studyProgram']>, savedAt: number): State {
  const s = defaultState()
  s.studyProgram = { ...s.studyProgram, ...patch }
  s._savedAt = savedAt
  return s
}

describe('defaultState', () => {
  it('seeds the program inactive, with no invented dates', () => {
    const p = defaultState().studyProgram
    expect(p.startKey).toBe('')
    expect(p.deadlineKey).toBe('')
    expect(p.lessons).toEqual({})
    expect(p.session).toBeNull()
    expect(p.maxLessonsPerDay).toBe(12)
    expect(p.lessonMinutes).toEqual({})
    expect(p.order).toBe('sequential')
  })
})

describe('applyState sanitisation', () => {
  it('supplies the program for a save that predates it', () => {
    expect(applyState({ planDay: 3 }).studyProgram).toEqual(defaultState().studyProgram)
  })

  it('drops malformed day keys instead of guessing', () => {
    const p = applyState({ studyProgram: { startKey: '21-08-2026', deadlineKey: 'soon' } }).studyProgram
    expect(p.startKey).toBe('')
    expect(p.deadlineKey).toBe('')
  })

  it('keeps valid lesson records and discards junk ones', () => {
    const good = CURRICULUM_LESSONS[0].id
    const other = CURRICULUM_LESSONS[1].id
    const p = applyState({
      studyProgram: {
        startKey: START, deadlineKey: DEADLINE,
        lessons: {
          [good]: { s: 'mastered', at: 5, reps: 2 },
          [CURRICULUM_LESSONS[2].id]: { s: 'not-a-status', at: 5, reps: 1 },
          [CURRICULUM_LESSONS[3].id]: 'nonsense',
          [other]: { s: 'weak', at: 'bad', reps: -4 },
        },
      },
    }).studyProgram
    expect(Object.keys(p.lessons).sort()).toEqual([good, other].sort())
    expect(p.lessons[good]).toEqual({ s: 'mastered', at: 5, reps: 2 })
    expect(p.lessons[other]).toEqual({ s: 'weak', at: 0, reps: 0 })
  })

  it('drops records for lessons that are not in the curriculum', () => {
    /* معرّفات المنهج القديم (164 درسًا) لم تعد موجودة؛ إبقاؤها كان سيجعل
       نسبة التقدّم تعدّ دروسًا لا وجود لها. */
    const p = applyState({
      studyProgram: {
        lessons: {
          'c1-s1-l1': { s: 'done', at: 1, reps: 1 },
          'c3-s5-l8': { s: 'mastered', at: 1, reps: 1 },
          [CURRICULUM_LESSONS[0].id]: { s: 'done', at: 1, reps: 1 },
        },
      },
    }).studyProgram
    expect(Object.keys(p.lessons)).toEqual([CURRICULUM_LESSONS[0].id])
  })

  it('keeps only known books in the minute overrides, clamped', () => {
    const p = applyState({
      studyProgram: { lessonMinutes: { b1d1: 40, b1d2: 900, nope: 30, a2: 0 } },
    }).studyProgram
    expect(p.lessonMinutes).toEqual({ b1d1: 40, b1d2: 120 })
  })

  it('falls back to the sequential order for an unknown value', () => {
    expect(applyState({ studyProgram: { order: 'examFirst' } }).studyProgram.order).toBe('examFirst')
    expect(applyState({ studyProgram: { order: 'random' } }).studyProgram.order).toBe('sequential')
  })

  it('clamps the daily cap into a workable range', () => {
    expect(applyState({ studyProgram: { maxLessonsPerDay: 500 } }).studyProgram.maxLessonsPerDay).toBe(20)
    expect(applyState({ studyProgram: { maxLessonsPerDay: 1 } }).studyProgram.maxLessonsPerDay).toBe(4)
  })

  it('drops a session with a broken timestamp rather than showing a wrong clock', () => {
    const blocks = [{ id: 'x', kind: 'new', titleAr: 'a', detailAr: 'b', minutes: 40, lessonIds: [] }]
    expect(applyState({ studyProgram: { session: { dayKey: START, startedAt: 'later', blocks } } }).studyProgram.session).toBeNull()
    expect(applyState({ studyProgram: { session: { dayKey: 'x', startedAt: 1, blocks } } }).studyProgram.session).toBeNull()
    expect(applyState({ studyProgram: { session: { dayKey: START, startedAt: 1, blocks: [] } } }).studyProgram.session).toBeNull()
  })

  it('drops the whole session when even one block is unusable', () => {
    const good = { id: 'a', kind: 'new', titleAr: 't', detailAr: 'd', minutes: 40, lessonIds: [] }
    const bad = { id: 'b', kind: 'new', titleAr: 't', detailAr: 'd', minutes: 0, lessonIds: [] }
    const p = applyState({ studyProgram: { session: { dayKey: START, startedAt: 10, blocks: [good, bad] } } })
    expect(p.studyProgram.session).toBeNull()
  })

  it('keeps a well-formed session intact through a rehydrate', () => {
    const day = buildSchedule({ startKey: START, deadlineKey: DEADLINE, lessonIds: allLessonIds() })
      .days.find((d) => d.kind === 'learn')!
    const blocks = buildDayBlocks(day).blocks.map(toSessionBlock)
    const session = { dayKey: day.dayKey, startedAt: 1_756_000_000_000, blocks, pausedMs: 0, pausedAt: 0 }
    const restored = applyState({ studyProgram: { startKey: START, deadlineKey: DEADLINE, session } }).studyProgram.session
    expect(restored).toEqual(session)
    /* والأهم: الموضع بعد الاسترجاع يطابق الموضع قبله تمامًا. */
    const at = session.startedAt + 47 * 60_000
    expect(positionOf(restored!, at)).toEqual(positionOf(session, at))
  })
})

describe('cloud merge', () => {
  it('survives a round trip instead of reverting to default', () => {
    const local = withProgram({ startKey: START, deadlineKey: DEADLINE, maxLessonsPerDay: 9 }, 100)
    const remote = withProgram({}, 50)
    expect(mergeStates(local, remote).studyProgram.startKey).toBe(START)
    expect(mergeStates(local, remote).studyProgram.maxLessonsPerDay).toBe(9)
    expect(mergeStates(remote, local).studyProgram.deadlineKey).toBe(DEADLINE)
  })

  it('merges minute overrides key by key and keeps the newer order', () => {
    const a = withProgram({ lessonMinutes: { b1d1: 40 }, order: 'examFirst' }, 200)
    const b = withProgram({ lessonMinutes: { b1d2: 35 }, order: 'sequential' }, 100)
    const m = mergeStates(a, b).studyProgram
    expect(m.lessonMinutes).toEqual({ b1d2: 35, b1d1: 40 })
    expect(m.order).toBe('examFirst')
  })

  it('unions lesson progress from both devices', () => {
    const ids = allLessonIds()
    const a = withProgram({ lessons: { [ids[0]]: { s: 'done', at: 10, reps: 1 } } }, 100)
    const b = withProgram({ lessons: { [ids[1]]: { s: 'weak', at: 20, reps: 1 } } }, 50)
    const merged = mergeStates(a, b).studyProgram.lessons
    expect(merged[ids[0]].s).toBe('done')
    expect(merged[ids[1]].s).toBe('weak')
  })

  it('lets the later grading win for the same lesson', () => {
    const id = allLessonIds()[0]
    const a = withProgram({ lessons: { [id]: { s: 'weak', at: 10, reps: 1 } } }, 100)
    const b = withProgram({ lessons: { [id]: { s: 'mastered', at: 99, reps: 3 } } }, 50)
    expect(mergeStates(a, b).studyProgram.lessons[id].s).toBe('mastered')
  })

  it('never demotes progress when both sides carry the same timestamp', () => {
    const id = allLessonIds()[0]
    const a = withProgram({ lessons: { [id]: { s: 'mastered', at: 10, reps: 3 } } }, 100)
    const b = withProgram({ lessons: { [id]: { s: 'weak', at: 10, reps: 1 } } }, 200)
    expect(mergeStates(a, b).studyProgram.lessons[id].s).toBe('mastered')
    expect(mergeStates(b, a).studyProgram.lessons[id].s).toBe('mastered')
  })

  it('gives the running session to the device that saved last', () => {
    const day = buildSchedule({ startKey: START, deadlineKey: DEADLINE, lessonIds: allLessonIds() })
      .days.find((d) => d.kind === 'learn')!
    const session = createSession(day.dayKey, buildDayBlocks(day).blocks, 1_756_000_000_000)

    /* الجهاز الأحدث حفظًا يفوز بالجلسة، أيًّا كان ترتيب المعاملات:
       مؤقّتان جاريان على جهازين لا يمكن التوفيق بينهما، فلا يُدمجان. */
    const running = withProgram({ session }, 200)
    const idle = withProgram({ session: null }, 100)
    expect(mergeStates(running, idle).studyProgram.session).toEqual(session)
    expect(mergeStates(idle, running).studyProgram.session).toEqual(session)

    const endedLater = withProgram({ session: null }, 300)
    expect(mergeStates(running, endedLater).studyProgram.session).toBeNull()
    expect(mergeStates(endedLater, running).studyProgram.session).toBeNull()
  })

  it('tolerates a peer that has never heard of the program', () => {
    const legacy = defaultState()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (legacy as any).studyProgram
    const mine = withProgram({ startKey: START, deadlineKey: DEADLINE }, 200)
    expect(mergeStates(mine, legacy).studyProgram.startKey).toBe(START)
  })
})

describe('program view', () => {
  it('stays inert until the program is activated', () => {
    const v = buildProgramView(defaultState().studyProgram, '2026-08-21')
    expect(v.active).toBe(false)
    expect(v.today).toBeNull()
    expect(v.todayBlocks).toBeNull()
  })

  it('answers every figure the dashboard shows, on day one', () => {
    const v = buildProgramView(
      { startKey: START, deadlineKey: DEADLINE, lessons: {}, maxLessonsPerDay: 12 },
      START,
    )
    expect(v.active).toBe(true)
    expect(v.today?.dayKey).toBe(START)
    expect(v.today?.lessonIds).toHaveLength(7)
    expect(v.todayBlocks?.totalMinutes).toBeGreaterThan(0)
    expect(v.progress.remaining).toBe(184)
    expect(v.overdueLessons).toBe(0)
    expect(v.daysLeft).toBe(26)
    expect(v.daysTotal).toBe(27)
    expect(v.upcomingReviews).toHaveLength(5)
    expect(v.health.status).toBe('ontrack')
  })

  it('lists the days whose lessons were missed, not merely the count', () => {
    const lessons: State['studyProgram']['lessons'] = {}
    /* اليوم الأول في الجدول المرجعي يحمل 7 دروس. */
    for (const id of allLessonIds().slice(0, 7)) lessons[id] = { s: 'done', at: 1, reps: 1 }
    const v = buildProgramView({ startKey: START, deadlineKey: DEADLINE, lessons, maxLessonsPerDay: 12 }, '2026-08-24')
    /* 21 أغسطس مكتمل، و22 و23 لم يُغطَّيا: 6 + 9 = 15 درسًا. */
    expect(v.overdue.map((d) => d.dayKey)).toEqual(['2026-08-22', '2026-08-23'])
    expect(v.overdueLessons).toBe(15)
    expect(v.health.status).toBe('behind')
  })

  it('names the day partially missed, not only the fully missed ones', () => {
    const lessons: State['studyProgram']['lessons'] = {}
    for (const id of allLessonIds().slice(0, 5)) lessons[id] = { s: 'done', at: 1, reps: 1 }
    const v = buildProgramView({ startKey: START, deadlineKey: DEADLINE, lessons, maxLessonsPerDay: 12 }, '2026-08-23')
    /* يومان أخفقا، وأوّلهما جزئيًّا فقط: درسان من سبعة. */
    expect(v.overdue.map((d) => d.dayKey)).toEqual(['2026-08-21', '2026-08-22'])
    expect(v.overdue[0].lessonIds).toHaveLength(2)
  })

  it('rebuilds the remaining days rather than piling the debt on today', () => {
    const lessons: State['studyProgram']['lessons'] = {}
    for (const id of allLessonIds().slice(0, 30)) lessons[id] = { s: 'done', at: 1, reps: 1 }
    const v = buildProgramView({ startKey: START, deadlineKey: DEADLINE, lessons, maxLessonsPerDay: 12 }, '2026-09-01')
    const todayLoad = v.today?.lessonIds.length ?? 0
    expect(todayLoad).toBeLessThanOrEqual(12)
    expect(v.live.days.flatMap((d) => d.lessonIds)).toHaveLength(154)
    expect(v.live.feasible).toBe(true)
  })

  it('marking a whole section removes exactly its lessons from the queue', () => {
    /* هذه هي حالة المستخدم الفعلية: أوّل قسمين من A2 منجزان. */
    const a2 = CURRICULUM_BOOKS[0]
    const doneIds = [...a2.sections[0].lessonIds, ...a2.sections[1].lessonIds]
    expect(doneIds).toHaveLength(30)
    const lessons: State['studyProgram']['lessons'] = {}
    for (const id of doneIds) lessons[id] = { s: 'done', at: 1, reps: 1 }

    const v = buildProgramView({ startKey: START, deadlineKey: DEADLINE, lessons, maxLessonsPerDay: 12 }, '2026-08-22')
    const scheduled = v.live.days.flatMap((d) => d.lessonIds)
    expect(scheduled).toHaveLength(154)
    for (const id of doneIds) expect(scheduled).not.toContain(id)
    expect(v.progress.covered).toBe(30)
    expect(v.progress.coveredPct).toBe(16)
    expect(v.live.feasible).toBe(true)
  })

  it('measures feasibility in time, not only in lesson count', () => {
    const lessons: State['studyProgram']['lessons'] = {}
    const base = { startKey: START, deadlineKey: DEADLINE, lessons, maxLessonsPerDay: 12 }

    /* بلا ميزانية يومية لا يوجد فحص زمني إطلاقًا. */
    const unchecked = buildProgramView(base, '2026-08-22')
    expect(unchecked.overBudgetDays).toBe(0)
    expect(unchecked.dailyBudgetMinutes).toBe(0)
    expect(unchecked.heaviestDayMinutes).toBeGreaterThan(0)

    /* ثلاث ساعات يوميًّا: الجدول يمرّ من سقف الدروس لكنه لا يسع الوقت. */
    const tight = buildProgramView({ ...base, dailyBudgetMinutes: 180 }, '2026-08-22')
    expect(tight.live.feasible).toBe(true)
    expect(tight.overBudgetDays).toBeGreaterThan(0)
    expect(tight.heaviestDayMinutes).toBeGreaterThan(180)

    /* ودروس B1 الأبطأ تجعل الأمر أسوأ، لا أفضل. */
    const slow = buildProgramView(
      { ...base, dailyBudgetMinutes: 180, lessonMinutes: { b1d1: 40, b1d2: 40 } },
      '2026-08-22',
    )
    expect(slow.heaviestDayMinutes).toBeGreaterThan(tight.heaviestDayMinutes)
    expect(slow.overBudgetDays).toBeGreaterThanOrEqual(tight.overBudgetDays)
    expect(slow.live.days.some((d) => d.dayKey === slow.heaviestDayKey)).toBe(true)
  })

  it('stays silent when the day genuinely fits the declared budget', () => {
    const lessons: State['studyProgram']['lessons'] = {}
    const v = buildProgramView(
      { startKey: START, deadlineKey: DEADLINE, lessons, maxLessonsPerDay: 12, dailyBudgetMinutes: 600 },
      '2026-08-22',
    )
    expect(v.overBudgetDays).toBe(0)
  })

  it(`keeps today's recall and spaced review, which the live window used to drop`, () => {
    /* انحدار: الجدول الحيّ يبدأ من اليوم، فأيام الأمس وما قبل ثلاثة أيام تقع
       خارج نافذته. قبل الإصلاح كان اليوم المنفَّذ يفقد كتلتَي المراجعة كلتيهما
       — كل يوم، لأن اليوم هو دائمًا أوّل أيام النافذة. */
    const DAY = 86_400_000
    const anchor = Date.parse('2026-08-24T10:00:00')
    const lessons: State['studyProgram']['lessons'] = {}
    const ids = allLessonIds()
    ids.slice(0, 9).forEach((id) => { lessons[id] = { s: 'done', at: anchor - 3 * DAY, reps: 1 } })
    ids.slice(9, 18).forEach((id) => { lessons[id] = { s: 'done', at: anchor - 2 * DAY, reps: 1 } })
    ids.slice(18, 27).forEach((id) => { lessons[id] = { s: 'done', at: anchor - 1 * DAY, reps: 1 } })

    const v = buildProgramView(
      { startKey: START, deadlineKey: DEADLINE, lessons, maxLessonsPerDay: 12 },
      '2026-08-24',
    )
    const today = v.live.days[0]
    expect(today.dayKey).toBe('2026-08-24')
    expect(today.recallLessonIds).toEqual(ids.slice(18, 27))
    expect(today.reviewLessonIds).toEqual(ids.slice(0, 9))

    const kinds = v.todayBlocks!.blocks.map((b) => b.kind)
    expect(kinds).toContain('recall')
    expect(kinds).toContain('review')
    expect(kinds[0]).toBe('recall')
  })

  it('quizzes what was actually studied, not what the plan expected', () => {
    /* الاسترجاع يُبنى على سجلّات الإنجاز الحقيقية، فلو دُرس درسان فقط أمس
       فالكتلة تسأل عنهما لا عن التسعة التي كان الجدول يتوقّعها. */
    const anchor = Date.parse('2026-08-24T10:00:00')
    const lessons: State['studyProgram']['lessons'] = {}
    const ids = allLessonIds()
    ids.slice(0, 2).forEach((id) => { lessons[id] = { s: 'done', at: anchor - 86_400_000, reps: 1 } })
    const v = buildProgramView(
      { startKey: START, deadlineKey: DEADLINE, lessons, maxLessonsPerDay: 12 },
      '2026-08-24',
    )
    expect(v.live.days[0].recallLessonIds).toEqual(ids.slice(0, 2))
  })

  it('exam-first ordering puts every B1 lesson before the rest of A2', () => {
    const all = allLessonIds()
    const reordered = orderLessons(all, 'examFirst')
    expect(reordered).toHaveLength(all.length)
    expect(new Set(reordered)).toEqual(new Set(all))
    const firstA2 = reordered.findIndex((id) => id.startsWith('a2-'))
    const lastB1 = reordered.map((id) => id.startsWith('b1d')).lastIndexOf(true)
    expect(lastB1).toBeLessThan(firstA2)
    /* والترتيب داخل كل كتاب يبقى كما هو. */
    expect(reordered.filter((id) => id.startsWith('a2-'))).toEqual(all.filter((id) => id.startsWith('a2-')))
    expect(orderLessons(all, 'sequential')).toEqual(all)
  })

  it('exam-first is what saves the B1 books when the window is too short', () => {
    const lessons: State['studyProgram']['lessons'] = {}
    const base = { startKey: START, deadlineKey: DEADLINE, lessons, maxLessonsPerDay: 6 }
    const seq = buildProgramView({ ...base, order: 'sequential' }, '2026-09-06')
    const exam = buildProgramView({ ...base, order: 'examFirst' }, '2026-09-06')
    expect(seq.live.feasible).toBe(false)
    expect(exam.live.feasible).toBe(false)
    const b1Of = (v: typeof seq) => v.live.days.flatMap((d) => d.lessonIds).filter((id) => id.startsWith('b1d')).length
    /* بالترتيب التسلسلي تسقط كتب B1 كلها؛ بأولوية الامتحان تُجدوَل أوّلًا. */
    expect(b1Of(seq)).toBe(0)
    expect(b1Of(exam)).toBeGreaterThan(0)
  })

  it('respects the user cap even when that makes the plan infeasible', () => {
    const v = buildProgramView({ startKey: START, deadlineKey: DEADLINE, lessons: {}, maxLessonsPerDay: 4 }, '2026-09-05')
    expect(v.live.peakLessonsPerDay).toBeLessThanOrEqual(4)
    expect(v.live.feasible).toBe(false)
    expect(v.recovery.verdictAr).toContain('غير قابل للتنفيذ')
  })
})
