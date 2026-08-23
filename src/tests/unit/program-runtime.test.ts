import { describe, it, expect } from 'vitest'
import { buildProgram, DEFAULT_CONFIG } from '@/features/program/schedule'
import { buildTimeline } from '@/features/program/timeline'
import {
  startRun, pauseRun, resumeRun, advanceRun, rewindRun, reconcileRun,
  viewRun, elapsedInBlock, isRunValid, completedStudyMinutes,
  resumeStaleAtLastSeen, acceptStaleElapsed,
  STALE_THRESHOLD_MS, ABSENCE_THRESHOLD_MS,
} from '@/features/program/runtime'

const plan = buildProgram(DEFAULT_CONFIG)
const learnDay = plan.days.find((d) => d.kind === 'learn')!
const tl = buildTimeline(learnDay, plan.config)
const T0 = tl.dayStartMs
const MIN = 60_000

describe('المؤقّت — التثبيت على الزمن المطلق', () => {
  it('يبدأ من الكتلة الأولى بمتبقٍّ كامل', () => {
    const run = startRun(tl, T0)
    const v = viewRun(run, tl, T0)
    expect(v.status).toBe('running')
    expect(v.index).toBe(0)
    expect(v.remainingMs).toBe(tl.blocks[0].durationMs)
    expect(v.block?.kind).toBe('lesson')
  })

  it('المتبقّي يُحسب من الساعة لا من عدّاد — قفزة زمنية تُحسب فورًا', () => {
    const run = startRun(tl, T0)
    // بدون أي "tick": نسأل بعد 7 دقائق مباشرةً
    const v = viewRun(run, tl, T0 + 7 * MIN)
    expect(v.elapsedMs).toBe(7 * MIN)
    expect(v.remainingMs).toBe(20 * MIN - 7 * MIN)
  })

  it('إعادة التحميل لا تفقد الحالة: نفس الكائن المحفوظ يعطي نفس النتيجة', () => {
    const run = startRun(tl, T0)
    // محاكاة الحفظ/الاسترجاع عبر JSON (كما يفعل التخزين المحلّي)
    const revived = JSON.parse(JSON.stringify(run))
    const a = viewRun(run, tl, T0 + 11 * MIN)
    const b = viewRun(revived, tl, T0 + 11 * MIN)
    expect(b.remainingMs).toBe(a.remainingMs)
    expect(b.index).toBe(a.index)
  })
})

describe('المؤقّت — الإيقاف والاستئناف', () => {
  it('الإيقاف يجمّد المنقضي مهما مرّ من وقت حقيقي', () => {
    let run = startRun(tl, T0)
    run = pauseRun(run, T0 + 5 * MIN)
    expect(elapsedInBlock(run, T0 + 5 * MIN)).toBe(5 * MIN)
    // مرّت ساعة كاملة والتطبيق موقوف
    expect(elapsedInBlock(run, T0 + 65 * MIN)).toBe(5 * MIN)
    expect(viewRun(run, tl, T0 + 65 * MIN).status).toBe('paused')
  })

  it('الاستئناف لا يحتسب مدّة التوقّف', () => {
    let run = startRun(tl, T0)
    run = pauseRun(run, T0 + 5 * MIN)
    run = resumeRun(run, T0 + 35 * MIN)      // توقّف 30 دقيقة
    expect(run.driftMs).toBe(30 * MIN)
    // بعد دقيقتين من الاستئناف: المنقضي = 5 + 2 = 7
    expect(elapsedInBlock(run, T0 + 37 * MIN)).toBe(7 * MIN)
  })

  it('إيقاف/استئناف متكرّر يتراكم بشكل صحيح', () => {
    let run = startRun(tl, T0)
    run = pauseRun(run, T0 + 2 * MIN); run = resumeRun(run, T0 + 12 * MIN)  // +10
    run = pauseRun(run, T0 + 15 * MIN); run = resumeRun(run, T0 + 20 * MIN) // +5
    expect(run.driftMs).toBe(15 * MIN)
    expect(elapsedInBlock(run, T0 + 25 * MIN)).toBe(10 * MIN)
  })
})

describe('المؤقّت — الانتقال بين الكتل', () => {
  it('الربط الدقيق: بداية التالية = بداية الحالية + مدّتها (بلا انزلاق تراكمي)', () => {
    let run = startRun(tl, T0)
    // تقدّم عبر 6 كتل بأوقات "غير مضبوطة" لكن مع chain
    for (let i = 0; i < 6; i++) {
      run = advanceRun(run, tl, T0 + i * 1234 + 999, true)
    }
    // النقطة يجب أن تساوي مجموع مدد الكتل السابقة بالضبط
    const expected = T0 + tl.blocks.slice(0, 6).reduce((a, b) => a + b.durationMs, 0)
    expect(run.anchorMs).toBe(expected)
    expect(run.cursor).toBe(6)
  })

  it('التخطّي اليدوي المبكّر يبدأ الكتلة التالية من الآن', () => {
    const run = startRun(tl, T0)
    const skipped = advanceRun(run, tl, T0 + 3 * MIN, false)
    expect(skipped.anchorMs).toBe(T0 + 3 * MIN)
    expect(skipped.cursor).toBe(1)
  })

  it('التقدّم التلقائي يعبر الكتل المنتهية عندما يكون التطبيق مفتوحًا', () => {
    const run = startRun(tl, T0)
    // 45 دقيقة = درس (20) + درس (20) + 5 دقائق داخل الاسترجاع
    const r = reconcileRun({ ...run, lastSeenMs: T0 + 45 * MIN }, tl, T0 + 45 * MIN)
    expect(r.stale).toBe(false)
    expect(r.run.cursor).toBe(2)
    expect(tl.blocks[r.run.cursor].kind).toBe('recall')
    expect(elapsedInBlock(r.run, T0 + 45 * MIN)).toBe(5 * MIN)
  })

  it('الرجوع للخلف يزيل الكتلة السابقة من المكتملة', () => {
    let run = startRun(tl, T0)
    run = advanceRun(run, tl, T0 + 20 * MIN, true)
    expect(run.completed).toContain(tl.blocks[0].id)
    run = rewindRun(run, tl, T0 + 21 * MIN)
    expect(run.cursor).toBe(0)
    expect(run.completed).not.toContain(tl.blocks[0].id)
  })

  it('لا يتجاوز الكتلة الأخيرة، ويعلن انتهاء اليوم', () => {
    const last = tl.blocks.length - 1
    const run = startRun(tl, T0, last)
    const after = advanceRun(run, tl, T0 + 999 * MIN, true)
    expect(after.cursor).toBe(last)
    const v = viewRun(after, tl, T0 + 999 * MIN)
    expect(v.status).toBe('finished')
  })
})

describe('المؤقّت — الغياب الطويل', () => {
  it('غياب طويل مع تجاوز كبير يوقف التقدّم التلقائي ويعلن الجلسة قديمة', () => {
    const run = startRun(tl, T0)
    // آخر ظهور بعد دقيقتين، ثم يعود بعد 4 ساعات
    const stale = reconcileRun({ ...run, lastSeenMs: T0 + 2 * MIN }, tl, T0 + 240 * MIN)
    expect(stale.stale).toBe(true)
    expect(stale.run.cursor).toBe(0)   // لم يقفز عبر اليوم
  })

  it('غياب قصير لا يُعتبر قديمًا', () => {
    const run = startRun(tl, T0)
    const gap = ABSENCE_THRESHOLD_MS - 1000
    const r = reconcileRun({ ...run, lastSeenMs: T0 + 20 * MIN - gap }, tl, T0 + 20 * MIN + 1000)
    expect(r.stale).toBe(false)
  })

  it('تجاوز صغير بعد غياب لا يوقف التقدّم', () => {
    const run = startRun(tl, T0)
    const now = T0 + 20 * MIN + (STALE_THRESHOLD_MS - 60_000)
    const r = reconcileRun({ ...run, lastSeenMs: T0 + 1 * MIN }, tl, now)
    expect(r.stale).toBe(false)
    expect(r.run.cursor).toBeGreaterThan(0)
  })

  it('استئناف «من حيث توقّفت» يحفظ المنقضي وقت آخر ظهور', () => {
    const run = { ...startRun(tl, T0), lastSeenMs: T0 + 8 * MIN }
    const now = T0 + 300 * MIN
    const resumed = resumeStaleAtLastSeen(run, tl, now)
    expect(elapsedInBlock(resumed, now)).toBe(8 * MIN)
    expect(viewRun(resumed, tl, now).remainingMs).toBe(12 * MIN)
  })

  it('«احتساب الوقت الفعلي» يتقدّم عبر كل ما انقضى', () => {
    const run = { ...startRun(tl, T0), lastSeenMs: T0 + 2 * MIN }
    const now = T0 + 100 * MIN
    const accepted = acceptStaleElapsed(run, tl, now)
    expect(accepted.cursor).toBeGreaterThan(2)
    expect(viewRun(accepted, tl, now).remainingMs).toBeGreaterThan(0)
  })
})

describe('المؤقّت — القراءات المشتقّة', () => {
  it('المتبقّي من اليوم يتناقص مع التقدّم', () => {
    const a = viewRun(startRun(tl, T0), tl, T0)
    const later = startRun(tl, T0, 5)
    const b = viewRun(later, tl, T0)
    expect(b.remainingWallMs).toBeLessThan(a.remainingWallMs)
    expect(a.remainingWallMs).toBe(tl.wallMinutes * MIN)
  })

  it('وقت الدراسة المتبقّي يستثني الاستراحات', () => {
    const v = viewRun(startRun(tl, T0), tl, T0)
    expect(v.remainingStudyMs).toBe(tl.studyMinutes * MIN)
    expect(v.remainingWallMs - v.remainingStudyMs).toBe(tl.breakMinutes * MIN)
  })

  it('دقائق الدراسة المكتملة تحتسب الكتل المحتسَبة فقط', () => {
    let run = startRun(tl, T0)
    run = advanceRun(run, tl, T0 + 20 * MIN, true)   // أنهى الدرس الأول (20د)
    expect(completedStudyMinutes(run, tl)).toBe(20)
    run = advanceRun(run, tl, T0 + 40 * MIN, true)   // الدرس الثاني
    run = advanceRun(run, tl, T0 + 50 * MIN, true)   // الاسترجاع (10د)
    run = advanceRun(run, tl, T0 + 60 * MIN, true)   // استراحة — لا تُحتسب
    expect(completedStudyMinutes(run, tl)).toBe(50)
  })

  it('المهمّة القادمة معروضة دائمًا ما لم نكن في الأخيرة', () => {
    const v = viewRun(startRun(tl, T0), tl, T0)
    expect(v.next).not.toBeNull()
    expect(v.next?.id).toBe(tl.blocks[1].id)
  })

  it('بلا جلسة: الحالة idle والمتبقّي = يوم كامل', () => {
    const v = viewRun(null, tl, T0)
    expect(v.status).toBe('idle')
    expect(v.remainingWallMs).toBe(tl.wallMinutes * MIN)
  })

  it('قبل البدء: عدّاد المهمّة القادمة = مدّة الأولى، لا صفرًا', () => {
    // حتى لو فُتحت الصفحة بعد الوقت المخطّط بساعات، العدّاد يجب أن يبقى منطقيًا
    const v = viewRun(null, tl, T0 + 14 * 60 * MIN)
    expect(v.untilNextMs).toBe(tl.blocks[0].durationMs)
    expect(v.untilNextMs).toBeGreaterThan(0)
  })
})

describe('المؤقّت — صلاحية الحالة عند تغيّر الخطّة', () => {
  it('جلسة ليوم آخر غير صالحة', () => {
    const run = startRun(tl, T0)
    const otherDay = plan.days.find((d) => d.kind === 'consolidate')!
    const otherTl = buildTimeline(otherDay, plan.config)
    expect(isRunValid(run, otherTl)).toBe(false)
    expect(isRunValid(run, tl)).toBe(true)
  })

  it('مؤشّر خارج المدى بعد تقصير الجدول يُعتبر غير صالح', () => {
    const run = { ...startRun(tl, T0), cursor: 999 }
    expect(isRunValid(run, tl)).toBe(false)
  })

  it('تغيير ساعة البدء يُزيح الأوقات المخطّطة دون كسر الجلسة الجارية', () => {
    const shifted = buildTimeline(learnDay, { ...plan.config, dayStart: '06:00' })
    expect(shifted.blocks[0].plannedStartMs).toBeLessThan(tl.blocks[0].plannedStartMs)
    expect(shifted.blocks.length).toBe(tl.blocks.length)
    // الجلسة مثبّتة على الزمن الحقيقي، فالمتبقّي لا يتأثّر بساعة البدء
    const run = startRun(shifted, T0)
    expect(viewRun(run, shifted, T0 + 5 * MIN).remainingMs).toBe(15 * MIN)
  })
})

describe('مرونة التنقّل والإنجاز — بلا قيود', () => {
  it('stepDate يلتفّ عند الطرفين فلا يعلق التنقّل أبدًا', () => {
    // نفس منطق التنقّل المستخدم في الواجهة
    const step = (dates: string[], cur: string, delta: number) => {
      if (dates.length === 0) return cur
      const i = dates.indexOf(cur)
      if (i === -1) return dates[0]
      const n = dates.length
      return dates[((i + delta) % n + n) % n]
    }
    const dates = plan.days.map((d) => d.date)
    expect(step(dates, dates[0], -1)).toBe(dates[dates.length - 1])   // من الأول للأخير
    expect(step(dates, dates[dates.length - 1], 1)).toBe(dates[0])    // ومن الأخير للأول
    expect(step(dates, dates[5], 1)).toBe(dates[6])
    expect(step(dates, 'غير-موجود', 1)).toBe(dates[0])
  })

  it('يمكن تشغيل جلسة على أيّ يوم من النافذة، لا اليوم الحالي فقط', () => {
    for (const d of [plan.days[0], plan.days[9], plan.days[26]]) {
      const tl = buildTimeline(d, plan.config)
      if (tl.blocks.length === 0) continue
      const r = startRun(tl, tl.dayStartMs)
      expect(isRunValid(r, tl)).toBe(true)
      expect(viewRun(r, tl, tl.dayStartMs).status).toBe('running')
    }
  })

  it('الرجوع من الكتلة الأولى لا يكسر الجلسة', () => {
    const r = startRun(tl, T0)
    const back = rewindRun(r, tl, T0 + 5 * MIN)
    expect(back.cursor).toBe(0)
    expect(viewRun(back, tl, T0 + 5 * MIN).status).toBe('running')
  })

  it('التقدّم من الكتلة الأخيرة لا يتجاوزها ولا يُفسد الحالة', () => {
    const last = tl.blocks.length - 1
    let r = startRun(tl, T0, last)
    for (let i = 0; i < 5; i++) r = advanceRun(r, tl, T0 + i * MIN, false)
    expect(r.cursor).toBe(last)
    expect(r.completed).toContain(tl.blocks[last].id)
  })
})
