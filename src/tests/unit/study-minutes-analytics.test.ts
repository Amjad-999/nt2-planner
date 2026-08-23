import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/useAppStore'
import { defaultState } from '@/store/migration'
import { completedFocusMinutes } from '@/features/plan/timer'
import { todayKey } from '@/lib/utils'
import type { StudyBlockSnapshot } from '@/store/types'

/**
 * الوصل بين المؤقّت والتحليلات.
 *
 * Analytics reads dailyHistory and nothing else. Before this, the study timer
 * wrote there never: endStudyDay dropped the session and every minute with it,
 * and covering a lesson never touched `tasks`. Whole days of work were
 * invisible on the analytics tab.
 */

const MIN = 60_000
const blocks: StudyBlockSnapshot[] = [
  { id: 'b1', kind: 'new',    titleAr: 'درسان جديدان', detailAr: '', minutes: 40, lessonIds: [] },
  { id: 'b2', kind: 'break',  titleAr: 'استراحة',      detailAr: '', minutes: 10, lessonIds: [] },
  { id: 'b3', kind: 'review', titleAr: 'مراجعة',       detailAr: '', minutes: 20, lessonIds: [] },
]

/* لا replace:true — الاستبدال الكامل يمحو أفعال المتجر نفسها مع الحالة. */
const reset = () => useAppStore.setState({ ...defaultState() })
const mins = () => useAppStore.getState().dailyHistory[todayKey()]?.mins ?? 0
const tasks = () => useAppStore.getState().dailyHistory[todayKey()]?.tasks ?? 0

beforeEach(reset)

describe('completedFocusMinutes — الاستراحات لا تُحتسب', () => {
  const session = { dayKey: todayKey(), startedAt: 0, blocks, pausedMs: 0, pausedAt: 0 }

  it('صفر عند البداية', () => {
    expect(completedFocusMinutes(session, 0)).toBe(0)
  })

  it('يعدّ دقائق التركيز فقط أثناء كتلة تركيز', () => {
    expect(completedFocusMinutes(session, 25 * MIN)).toBe(25)
  })

  it('يتجمّد أثناء الاستراحة', () => {
    // 40د تركيز ثم استراحة 10د: عند الدقيقة 45 ما زال 40
    expect(completedFocusMinutes(session, 40 * MIN)).toBe(40)
    expect(completedFocusMinutes(session, 45 * MIN)).toBe(40)
    expect(completedFocusMinutes(session, 50 * MIN)).toBe(40)
  })

  it('يستأنف بعد الاستراحة', () => {
    expect(completedFocusMinutes(session, 60 * MIN)).toBe(50)
    expect(completedFocusMinutes(session, 70 * MIN)).toBe(60)
  })

  it('لا يتجاوز إجمالي التركيز مهما طال الوقت', () => {
    expect(completedFocusMinutes(session, 500 * MIN)).toBe(60)
  })

  it('غير متناقص — شرط صحّة العلامة المائية', () => {
    let prev = 0
    for (let m = 0; m <= 80; m++) {
      const v = completedFocusMinutes(session, m * MIN)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})

describe('دقائق الجلسة تصل إلى السجلّ اليومي', () => {
  const startAt = (now: number) => useAppStore.getState().startStudyDay(todayKey(), blocks, now)

  it('لا شيء يُسجَّل قبل انقضاء دقيقة', () => {
    const t0 = Date.now()
    startAt(t0)
    useAppStore.getState().syncStudyMinutes(t0)
    expect(mins()).toBe(0)
  })

  it('كل دقيقة تركيز تظهر في dailyHistory', () => {
    const t0 = Date.now()
    startAt(t0)
    useAppStore.getState().syncStudyMinutes(t0 + 12 * MIN)
    expect(mins()).toBe(12)
  })

  it('التكرار لا يُضاعف — العلامة المائية تمنع الاحتساب المزدوج', () => {
    const t0 = Date.now()
    startAt(t0)
    const s = useAppStore.getState()
    // نفس اللحظة عشر مرّات، كما تفعل نبضة كل ثانية داخل الدقيقة نفسها
    for (let i = 0; i < 10; i++) s.syncStudyMinutes(t0 + 12 * MIN)
    expect(mins()).toBe(12)
  })

  it('يُضاف الفارق فقط مع تقدّم الوقت', () => {
    const t0 = Date.now()
    startAt(t0)
    const s = useAppStore.getState()
    s.syncStudyMinutes(t0 + 12 * MIN)
    s.syncStudyMinutes(t0 + 30 * MIN)
    expect(mins()).toBe(30)
  })

  it('الاستراحة لا تضيف دقائق للسجلّ', () => {
    const t0 = Date.now()
    startAt(t0)
    const s = useAppStore.getState()
    s.syncStudyMinutes(t0 + 40 * MIN)   // نهاية كتلة التركيز
    expect(mins()).toBe(40)
    s.syncStudyMinutes(t0 + 48 * MIN)   // داخل الاستراحة
    expect(mins()).toBe(40)
  })

  it('إنهاء الجلسة يسحب آخر دقيقة قبل الإسقاط', () => {
    const t0 = Date.now() - 25 * MIN
    startAt(t0)
    // بلا مزامنة وسيطة إطلاقًا — الإنهاء وحده يجب أن يلتقط الـ25 دقيقة
    useAppStore.getState().endStudyDay()
    expect(mins()).toBe(25)
    expect(useAppStore.getState().studyProgram.session).toBeNull()
  })

  it('الدقائق تنجو من إنهاء الجلسة ولا تُكتب مرّتين', () => {
    const t0 = Date.now() - 25 * MIN
    startAt(t0)
    useAppStore.getState().syncStudyMinutes(Date.now())
    const afterSync = mins()
    useAppStore.getState().endStudyDay()
    expect(mins()).toBe(afterSync)
  })

  it('السلسلة اليومية تتحدّث مع أول دقيقة مسجَّلة', () => {
    const t0 = Date.now()
    startAt(t0)
    expect(useAppStore.getState().streak.last).toBe('')
    useAppStore.getState().syncStudyMinutes(t0 + 5 * MIN)
    expect(useAppStore.getState().streak.last).toBe(todayKey())
  })

  it('بلا جلسة لا يحدث شيء', () => {
    useAppStore.getState().syncStudyMinutes(Date.now())
    expect(mins()).toBe(0)
  })
})

describe('إنجاز الدروس يصل إلى المهام والسلسلة', () => {
  const LESSON = 'a2-t1-l1'
  const LESSON2 = 'a2-t1-l2'

  it('تغطية درس تُسجَّل كمهمّة منجزة', () => {
    useAppStore.getState().setLessonStatus(LESSON, 'done')
    expect(tasks()).toBe(1)
  })

  it('السلسلة تتحدّث مع أول درس', () => {
    expect(useAppStore.getState().streak.last).toBe('')
    useAppStore.getState().setLessonStatus(LESSON, 'done')
    expect(useAppStore.getState().streak.last).toBe(todayKey())
  })

  it('إعادة تعليم درس مغطّى لا تضيف مهمّة جديدة', () => {
    const s = useAppStore.getState()
    s.setLessonStatus(LESSON, 'done')
    s.setLessonStatus(LESSON, 'mastered')
    s.setLessonStatus(LESSON, 'review')
    expect(tasks()).toBe(1)
  })

  it('"قيد الدراسة" ليست تغطية ولا تُحتسب', () => {
    useAppStore.getState().setLessonStatus(LESSON, 'learning')
    expect(tasks()).toBe(0)
  })

  it('التراجع إلى "لم يبدأ" لا يُنقص المهام المسجَّلة', () => {
    const s = useAppStore.getState()
    s.setLessonStatus(LESSON, 'done')
    s.setLessonStatus(LESSON, 'new')
    expect(tasks()).toBe(1)   // السجلّ التاريخي لا يُعاد كتابته بأثر رجعي
  })

  it('الدفعة تُحتسب مرّة واحدة لكل درس جديد', () => {
    useAppStore.getState().setLessonsStatus([LESSON, LESSON2, LESSON], 'done')
    expect(tasks()).toBe(2)
  })

  it('درس خارج المنهج لا يُحتسب', () => {
    useAppStore.getState().setLessonStatus('ghost-lesson', 'done')
    expect(tasks()).toBe(0)
  })
})
