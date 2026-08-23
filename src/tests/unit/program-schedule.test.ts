import { describe, it, expect } from 'vitest'
import {
  LESSONS, SECTIONS, TOTAL_LESSONS, totalLessonMinutes, BOOKS, isKnownLesson, sumLessonMinutes,
} from '@/data/curriculum'
import { buildProgram, DEFAULT_CONFIG, taperLoads, assessFeasibility, distributeByMinutes, dayWallMinutes, MAX_LESSONS_PER_DAY as CAP } from '@/features/program/schedule'
import { buildTimeline, FREE_SESSION_MINUTES } from '@/features/program/timeline'
import { auditProgram } from '@/features/program/audit'
import { dateRange, diffDays, addDays } from '@/features/program/dates'
import { summarize, assessPace, dayProgress, STATUS_WEIGHT } from '@/features/program/progress'
import { rebuildFrom, MAX_LESSONS_PER_DAY, todayTarget } from '@/features/program/recovery'
import type { StatusMap } from '@/features/program/progress'
import { applyState } from '@/store/migration'
import { startRun, isRunValid, viewRun } from '@/features/program/runtime'

const plan = buildProgram(DEFAULT_CONFIG)

describe('المنهج — مطابقة فهارس الكتب الحقيقية', () => {
  it('3 كتب / 18 ثيمة / 184 درسًا', () => {
    expect(BOOKS).toHaveLength(3)
    expect(SECTIONS).toHaveLength(18)
    expect(TOTAL_LESSONS).toBe(184)
    expect(LESSONS).toHaveLength(184)
  })

  it('أحجام الكتب تطابق الفهارس: 109 + 39 + 36', () => {
    const count = (id: string) => LESSONS.filter((l) => l.bookId === id).length
    expect(count('a2')).toBe(109)
    expect(count('b1d1')).toBe(39)
    expect(count('b1d2')).toBe(36)
  })

  it('أحجام الثيمات تطابق الفهارس بالضبط', () => {
    const sizes = (bookId: string) =>
      SECTIONS.filter((s) => s.bookId === bookId).map((s) => s.size)
    // TaalCompleet A2 — Thema 1..8
    expect(sizes('a2')).toEqual([15, 15, 14, 12, 14, 12, 15, 12])
    // TaalCompleet B1 deel 1 — Thema 1..5
    expect(sizes('b1d1')).toEqual([8, 7, 8, 8, 8])
    // TaalCompleet B1 deel 2 — Thema 6..10
    expect(sizes('b1d2')).toEqual([8, 8, 6, 7, 7])
  })

  it('أرقام الثيمات كما هي مطبوعة (B1 deel 2 يبدأ من 6)', () => {
    const idx = (bookId: string) => SECTIONS.filter((s) => s.bookId === bookId).map((s) => s.index)
    expect(idx('a2')).toEqual([1, 2, 3, 4, 5, 6, 7, 8])
    expect(idx('b1d1')).toEqual([1, 2, 3, 4, 5])
    expect(idx('b1d2')).toEqual([6, 7, 8, 9, 10])
  })

  it('كل معرّفات الدروس فريدة ومتسلسلة 1..184', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(184)
    expect(LESSONS.map((l) => l.global)).toEqual(Array.from({ length: 184 }, (_, i) => i + 1))
    expect(LESSONS.every((l) => isKnownLesson(l.id))).toBe(true)
  })

  it('أرقام الدروس (1.1، 3.12…) فريدة داخل كل كتاب', () => {
    for (const b of BOOKS) {
      const nums = LESSONS.filter((l) => l.bookId === b.id).map((l) => l.number)
      expect(new Set(nums).size).toBe(nums.length)
    }
  })

  it('نموذج المدّة الثابت = 184 × 20 = 3680 دقيقة (61س 20د)', () => {
    expect(totalLessonMinutes('flat')).toBe(3680)
    expect(Math.floor(3680 / 60)).toBe(61)
    expect(3680 % 60).toBe(20)
  })

  it('النموذج الموزون بالصفحات يجعل دروس B1 أطول من دروس A2', () => {
    const avg = (id: string) => {
      const ls = LESSONS.filter((l) => l.bookId === id)
      return ls.reduce((a, l) => a + l.pages, 0) / ls.length
    }
    expect(avg('b1d1')).toBeGreaterThan(avg('a2') * 1.5)
    expect(avg('b1d2')).toBeGreaterThan(avg('a2') * 1.5)
  })
})

describe('النافذة الزمنية', () => {
  it('من 21 أغسطس إلى 16 سبتمبر 2026 = 27 يومًا', () => {
    expect(dateRange('2026-08-21', '2026-09-16')).toHaveLength(27)
    expect(diffDays('2026-08-21', '2026-09-16')).toBe(26)
  })

  it('الخطّة تغطّي النافذة كاملة بلا فجوات', () => {
    expect(plan.days).toHaveLength(27)
    expect(plan.days[0].date).toBe('2026-08-21')
    expect(plan.days[26].date).toBe('2026-09-16')
    for (let i = 1; i < plan.days.length; i++) {
      expect(plan.days[i].date).toBe(addDays(plan.days[i - 1].date, 1))
    }
  })

  it('أقسام النافذة تجمع إلى 27', () => {
    const t = plan.totals
    expect(t.learnDays + t.bufferDays + t.consolidationDays + t.taperDays).toBe(27)
  })
})

describe('taperLoads — ضمانات التوزيع', () => {
  it('المجموع والطول مضبوطان للحالة الفعلية 184/18', () => {
    const loads = taperLoads(TOTAL_LESSONS, 18)
    expect(loads).toHaveLength(18)
    expect(loads.reduce((a, b) => a + b, 0)).toBe(TOTAL_LESSONS)
  })

  it('غير متزايد (تناقص فعلي) وكل يوم ≥ 1', () => {
    const loads = taperLoads(TOTAL_LESSONS, 18)
    for (let i = 1; i < loads.length; i++) expect(loads[i]).toBeLessThanOrEqual(loads[i - 1])
    expect(Math.min(...loads)).toBeGreaterThanOrEqual(1)
    expect(loads[0]).toBeGreaterThan(loads[loads.length - 1])
  })

  it('يصمد عبر مجموعة واسعة من المدخلات', () => {
    for (let days = 1; days <= 40; days++) {
      for (const total of [1, 7, 40, 84, 109, 184, 300]) {
        const loads = taperLoads(total, days)
        expect(loads).toHaveLength(days)
        if (total >= days) {
          expect(loads.reduce((a, b) => a + b, 0)).toBe(total)
          expect(Math.min(...loads)).toBeGreaterThanOrEqual(1)
        }
        for (let i = 1; i < loads.length; i++) expect(loads[i]).toBeLessThanOrEqual(loads[i - 1])
      }
    }
  })
})


describe('distributeByMinutes — التوزيع الموازن بالدقائق', () => {
  const ids = LESSONS.map((l) => l.id)

  for (const model of ['flat', 'pages'] as const) {
    describe('نموذج ' + model, () => {
      const buckets = distributeByMinutes(ids, 18, model, CAP)

      it('كل الدروس موزّعة بلا تكرار ولا نقص', () => {
        const flatIds = buckets.flat()
        expect(flatIds).toHaveLength(TOTAL_LESSONS)
        expect(new Set(flatIds).size).toBe(TOTAL_LESSONS)
      })

      it('الترتيب التراكمي محفوظ', () => {
        expect(buckets.flat()).toEqual(ids)
      })

      it('كل يوم ≥ 1 درس ولا يوم يتجاوز السقف', () => {
        for (const b of buckets) {
          expect(b.length).toBeGreaterThanOrEqual(1)
          expect(b.length).toBeLessThanOrEqual(CAP)
        }
      })

      it('لا يوم يحمل أكثر من ضعف متوسّط الدقائق (لا إغراق لليوم الأخير)', () => {
        const mins = buckets.map((b) => sumLessonMinutes(b, model))
        const avg = mins.reduce((a, x) => a + x, 0) / mins.length
        expect(Math.max(...mins)).toBeLessThan(avg * 2)
      })
    })
  }

  it('يصمد عبر أعداد أيام مختلفة', () => {
    for (let days = 16; days <= 27; days++) {
      for (const model of ['flat', 'pages'] as const) {
        const b = distributeByMinutes(ids, days, model, CAP)
        expect(b).toHaveLength(days)
        expect(b.flat()).toEqual(ids)
        for (const x of b) {
          expect(x.length).toBeGreaterThanOrEqual(1)
          expect(x.length).toBeLessThanOrEqual(CAP)
        }
      }
    }
  })
})

describe('التدقيق المنطقي المستقل', () => {
  const audit = auditProgram(plan)

  it('كل الفحوص ناجحة', () => {
    const failed = audit.checks.filter((c) => !c.pass)
    expect(failed.map((f) => `${f.label}: ${f.detail}`)).toEqual([])
    expect(audit.pass).toBe(true)
  })

  it('184/184 درسًا موزّعة بلا تكرار ولا نقص', () => {
    const scheduled = plan.days.flatMap((d) => d.lessons)
    expect(scheduled).toHaveLength(TOTAL_LESSONS)
    expect(new Set(scheduled).size).toBe(TOTAL_LESSONS)
  })

  it('الترتيب التراكمي محفوظ عبر كل الأيام', () => {
    const globals = plan.days.flatMap((d) => d.lessons)
      .map((id) => LESSONS.find((l) => l.id === id)!.global)
    expect(globals).toEqual(Array.from({ length: TOTAL_LESSONS }, (_, i) => i + 1))
  })

  it('كل قسم له مراجعة، ولا مراجعة قبل إتمام قسمها', () => {
    const reviewed = new Set<string>()
    for (const d of plan.days) {
      for (const r of d.reviews) {
        reviewed.add(r.sectionId)
        expect(d.date > plan.sectionCompletion[r.sectionId]).toBe(true)
      }
      for (const s of d.sweeps) reviewed.add(s.sectionId)
    }
    expect(reviewed.size).toBe(SECTIONS.length)
  })

  it('اليوم الأخير لا يحمل مهامّ غير منطقية', () => {
    const last = plan.days[26]
    expect(last.lessons).toHaveLength(0)
    expect(last.reviews).toHaveLength(0)
    expect(last.mockMinutes).toBe(0)
  })
})

describe('الجدول الزمني والمؤقّتات', () => {
  it('كل كتلة تبدأ عند نهاية سابقتها بالضبط (بلا انزلاق)', () => {
    for (const d of plan.days) {
      const tl = buildTimeline(d, plan.config)
      for (let i = 1; i < tl.blocks.length; i++) {
        expect(tl.blocks[i].plannedStartMs).toBe(tl.blocks[i - 1].plannedEndMs)
      }
    }
  })

  it('مجموع مدد الكتل = مدى اليوم، ودراسة + استراحة = الإجمالي', () => {
    for (const d of plan.days) {
      const tl = buildTimeline(d, plan.config)
      const sum = tl.blocks.reduce((a, b) => a + b.durationMs, 0)
      expect(sum).toBe(tl.dayEndMs - tl.dayStartMs)
      expect(tl.studyMinutes + tl.breakMinutes).toBe(tl.wallMinutes)
    }
  })

  it('كل درس مجدول يظهر في كتلة درس واحدة بالضبط', () => {
    const seen: string[] = []
    for (const d of plan.days) {
      const tl = buildTimeline(d, plan.config)
      for (const b of tl.blocks) if (b.kind === 'lesson') seen.push(...b.lessonIds)
    }
    expect(seen).toHaveLength(TOTAL_LESSONS)
    expect(new Set(seen).size).toBe(TOTAL_LESSONS)
  })

  it('الاستراحات لا تُحتسب ضمن وقت الدراسة', () => {
    const d = plan.days.find((x) => x.kind === 'learn')!
    const tl = buildTimeline(d, plan.config)
    expect(tl.blocks.filter((b) => b.kind === 'shortBreak' || b.kind === 'longBreak').every((b) => !b.counts)).toBe(true)
    expect(tl.blocks.filter((b) => b.kind === 'lesson').every((b) => b.counts)).toBe(true)
  })
})

describe('التقدّم', () => {
  it('خريطة فارغة = 0% تغطية و0% إتقان', () => {
    const s = summarize({})
    expect(s.completionPct).toBe(0)
    expect(s.masteryPct).toBe(0)
    expect(s.remaining).toBe(TOTAL_LESSONS)
  })

  it('كل الدروس متقنة = 100% في الرقمين', () => {
    const map: StatusMap = {}
    for (const l of LESSONS) map[l.id] = 'mastered'
    const s = summarize(map)
    expect(s.completionPct).toBe(100)
    expect(s.masteryPct).toBe(100)
    expect(s.illusionGapPct).toBe(0)
  })

  it('«مكتمل» يعطي تغطية 100% لكن إتقانًا 60% — فجوة وهم الإتقان', () => {
    const map: StatusMap = {}
    for (const l of LESSONS) map[l.id] = 'done'
    const s = summarize(map)
    expect(s.completionPct).toBe(100)
    expect(s.masteryPct).toBe(STATUS_WEIGHT.done * 100)
    expect(s.illusionGapPct).toBeCloseTo(40, 5)
  })

  it('اليوم الأول بلا إنجاز ليس «متأخّرًا» — اليوم لم ينتهِ بعد', () => {
    const pace = assessPace(plan, {}, plan.days[0].date, DEFAULT_CONFIG.dailyCapacityMinutes)
    expect(pace.expected).toBe(0)
    expect(pace.lag).toBe(0)
    expect(pace.status).toBe('onTrack')
  })

  it('هدف اليوم لا يقلّ أبدًا عمّا جدولته الخطّة لذلك اليوم', () => {
    for (const d of plan.days) {
      const t = todayTarget(plan, {}, d.date)
      expect(t).toBeGreaterThanOrEqual(Math.min(d.lessons.length, MAX_LESSONS_PER_DAY))
      expect(t).toBeLessThanOrEqual(MAX_LESSONS_PER_DAY)
    }
    // اليوم الأول: 10 دروس مجدولة ⇒ الهدف 10 لا 9
    expect(todayTarget(plan, {}, plan.days[0].date)).toBe(plan.days[0].lessons.length)
  })

  it('الإيقاع: صفر إنجاز في منتصف الخطّة = متأخّر أو حرج', () => {
    const mid = plan.days[13].date
    const pace = assessPace(plan, {}, mid, DEFAULT_CONFIG.dailyCapacityMinutes)
    expect(pace.actual).toBe(0)
    expect(pace.lag).toBeGreaterThan(0)
    expect(['behind', 'critical']).toContain(pace.status)
  })

  it('الإيقاع: إنجاز كامل حتى اليوم = على المسار أو متقدّم', () => {
    const upto = plan.days[5].date
    const map: StatusMap = {}
    for (const d of plan.days) {
      if (d.date <= upto) for (const id of d.lessons) map[id] = 'done'
    }
    const pace = assessPace(plan, map, upto, DEFAULT_CONFIG.dailyCapacityMinutes)
    expect(pace.lag).toBeLessThanOrEqual(2)
    expect(['onTrack', 'ahead']).toContain(pace.status)
  })
})

describe('التعافي من التأخير', () => {
  it('بلا تأخير: لا إعادة توزيع', () => {
    const map: StatusMap = {}
    for (const l of LESSONS) map[l.id] = 'done'
    const r = rebuildFrom(plan, map, plan.days[10].date)
    expect(r.action).toBe('none')
    expect(r.redistributed).toBe(0)
  })

  it('تأخير 3 أيام: يُعاد التوزيع ويبقى وقت المراجعة سليمًا', () => {
    const start = plan.days[3].date            // فقدنا أول 3 أيام
    const map: StatusMap = {}
    const r = rebuildFrom(plan, map, start)
    expect(r.redistributed).toBeGreaterThan(0)
    expect(r.reviewPreserved).toBe(true)
    expect(r.consolidationDaysUsed).toBe(0)
    // كل الدروس المتبقّية وُزّعت
    const total = r.days.reduce((a, d) => a + d.lessons.length, 0)
    expect(total).toBe(TOTAL_LESSONS)
  })

  it('لا يُنشئ يومًا يتجاوز السقف الآمن أبدًا', () => {
    for (let i = 0; i < plan.days.length; i++) {
      const r = rebuildFrom(plan, {}, plan.days[i].date)
      for (const d of r.days) {
        expect(d.lessons.length).toBeLessThanOrEqual(MAX_LESSONS_PER_DAY)
      }
    }
  })

  it('تأخير كارثي قرب النهاية: يُعلن الاستحالة ويقترح خيارات', () => {
    const late = plan.days[22].date   // 4 أيام متبقّية وكل الدروس
    const r = rebuildFrom(plan, {}, late)
    expect(r.action).toBe('infeasible')
    expect(r.options.length).toBeGreaterThan(0)
    expect(r.headline).toContain('غير قابلة للتنفيذ')
  })
})

describe('الواقعية', () => {
  it('تقرير الواقعية يُخرج ذروة ومتوسّطًا حقيقيَّين', () => {
    const f = assessFeasibility(plan)
    expect(f.peakWallMinutes).toBeGreaterThan(0)
    expect(f.avgLearnWallMinutes).toBeGreaterThan(0)
    expect(f.notes.length).toBeGreaterThan(0)
  })
})

describe('صلابة نموذج المدّة', () => {
  it('قيمة مفقودة أو غير معروفة تعني النموذج الثابت، لا الموزون', () => {
    // حالة محفوظة قديمة قد لا تحمل durationModel إطلاقًا.
    const bad = undefined as unknown as 'flat'
    expect(totalLessonMinutes(bad)).toBe(totalLessonMinutes('flat'))
    expect(totalLessonMinutes('junk' as unknown as 'flat')).toBe(totalLessonMinutes('flat'))
  })

  it('الهجرة تملأ durationModel عند غيابه', () => {
    const s = applyState({ program: { config: { startDate: '2026-08-21' } } })
    expect(s.program.config.durationModel).toBe('flat')
  })

  it('الهجرة تطرح معرّفات الدروس المجهولة (منهج قديم)', () => {
    const s = applyState({
      program: { statuses: { 'b1-s1-l01': 'done', 'a2-t01-l01': 'mastered', 'junk': 'weak' } },
    })
    expect(Object.keys(s.program.statuses)).toEqual(['a2-t01-l01'])
  })

  it('التقدّم لا يتجاوز 100% مهما كانت البيانات', () => {
    const map: StatusMap = {}
    for (const l of LESSONS) map[l.id] = 'mastered'
    map['ghost-lesson'] = 'mastered'   // معرّف غير موجود
    const s = summarize(map)
    expect(s.completionPct).toBeLessThanOrEqual(100)
    expect(s.masteryPct).toBeLessThanOrEqual(100)
    expect(s.covered).toBeLessThanOrEqual(TOTAL_LESSONS)
  })
})

describe('حالة الإيقاع تُحسم بما يتبقّى لا بحجم التأخّر', () => {
  it('تأخّر كبير لكنّ العمل المتبقّي يسع الطاقة ⇒ «متأخّر» لا «حرج»', () => {
    // بعد 3 أيام ضائعة، مع طاقة يومية واسعة.
    const p = assessPace(plan, {}, plan.days[3].date, 600)
    expect(p.lag).toBeGreaterThan(20)          // تأخّر تاريخي كبير
    expect(p.requiredWallMinutes).toBeLessThanOrEqual(600)
    expect(p.status).toBe('behind')
    expect(p.note).not.toContain('لن ينجح')
  })

  it('الطاقة الضيّقة تجعلها حرجة، والرسالة تذكر العجز بالأرقام', () => {
    // اليوم الأول: المعدّل المطلوب ضمن السقف، فالطاقة وحدها هي القيد.
    const p = assessPace(plan, {}, plan.days[0].date, 120)
    expect(p.requiredPerDay).toBeLessThanOrEqual(MAX_LESSONS_PER_DAY)
    expect(p.status).toBe('critical')
    expect(p.requiredWallMinutes).toBeGreaterThan(120)
    expect(p.note).toContain('عجز')
  })

  it('لا تُعلن «حرج» أبدًا بينما الأرقام تقول إن الوقت يكفي', () => {
    for (let i = 0; i < plan.days.length; i++) {
      for (const cap of [200, 330, 420, 600]) {
        const p = assessPace(plan, {}, plan.days[i].date, cap)
        if (p.status === 'critical') {
          const tooSlow = p.requiredWallMinutes > cap
          const tooMany = p.requiredPerDay > MAX_LESSONS_PER_DAY
          expect(tooSlow || tooMany).toBe(true)
        }
      }
    }
  })
})

describe('التقدّم لا يتجاوز 100% ولا مهامّ مكرّرة أو مفقودة', () => {
  it('كل حالة ممكنة تُبقي النسب داخل 0..100', () => {
    const states = ['new', 'active', 'done', 'review', 'weak', 'mastered'] as const
    for (const s of states) {
      const map: StatusMap = {}
      for (const l of LESSONS) map[l.id] = s
      const sum = summarize(map)
      expect(sum.completionPct).toBeGreaterThanOrEqual(0)
      expect(sum.completionPct).toBeLessThanOrEqual(100)
      expect(sum.masteryPct).toBeGreaterThanOrEqual(0)
      expect(sum.masteryPct).toBeLessThanOrEqual(100)
      expect(sum.covered + sum.remaining).toBe(TOTAL_LESSONS)
    }
  })

  it('إعادة الجدولة لا تُنتج تكرارًا ولا نقصًا في أيّ نقطة انطلاق', () => {
    for (let i = 0; i < plan.days.length; i++) {
      const r = rebuildFrom(plan, {}, plan.days[i].date)
      const ids = r.days.flatMap((d) => d.lessons)
      expect(new Set(ids).size).toBe(ids.length)              // لا تكرار
      if (r.action !== 'infeasible') {
        expect(ids).toHaveLength(TOTAL_LESSONS)                // لا نقص
      }
    }
  })

  it('نسبة اليوم لا تتجاوز 100% مهما زاد الإنجاز', () => {
    const map: StatusMap = {}
    for (const l of LESSONS) map[l.id] = 'mastered'
    for (const d of plan.days) {
      const dp = dayProgress(d, map, plan)
      expect(dp.pct).toBeLessThanOrEqual(100)
      expect(dp.doneLessons).toBeLessThanOrEqual(dp.plannedLessons)
    }
  })
})

describe('كل يوم قابل للتشغيل — بلا زرّ معطَّل', () => {
  it('كل أيام الخطّة تحوي كتلة واحدة على الأقل، بما فيها يوم الموعد', () => {
    for (const d of plan.days) {
      const tl = buildTimeline(d, plan.config)
      expect(tl.blocks.length).toBeGreaterThanOrEqual(1)
      expect(tl.wallMinutes).toBeGreaterThan(0)
    }
    const deadline = plan.days[plan.days.length - 1]
    expect(deadline.kind).toBe('deadline')
    expect(buildTimeline(deadline, plan.config).blocks.length).toBeGreaterThanOrEqual(1)
  })

  it('يوم بلا أيّ مهمّة مجدولة يحصل على جلسة حرّة', () => {
    const empty = {
      date: '2026-09-20', index: 99, kind: 'buffer' as const, learnIndex: null,
      lessons: [], reviews: [], sweeps: [],
      mockMinutes: 0, weakRepairMinutes: 0, label: 'فارغ',
    }
    const tl = buildTimeline(empty, plan.config)
    expect(tl.blocks).toHaveLength(1)
    expect(tl.blocks[0].kind).toBe('free')
    expect(tl.wallMinutes).toBe(FREE_SESSION_MINUTES)
    // الصيغة المختصرة يجب أن تطابق الجدول المبني وإلا انهار فحص التدقيق
    expect(dayWallMinutes(empty, plan.config)).toBe(tl.wallMinutes)
  })

  it('الجلسة الحرّة قابلة للتشغيل كأيّ كتلة أخرى', () => {
    const empty = {
      date: '2026-09-20', index: 99, kind: 'buffer' as const, learnIndex: null,
      lessons: [], reviews: [], sweeps: [],
      mockMinutes: 0, weakRepairMinutes: 0, label: 'فارغ',
    }
    const tl = buildTimeline(empty, plan.config)
    const r = startRun(tl, tl.dayStartMs)
    expect(isRunValid(r, tl)).toBe(true)
    expect(viewRun(r, tl, tl.dayStartMs).status).toBe('running')
  })
})

describe('التعويض: المراجعة تتبع الدرس دائمًا', () => {
  const byId = new Map(LESSONS.map((l) => [l.id, l]))

  /** تاريخ إتمام كل قسم بعد إعادة التوزيع. */
  const completionAfter = (days: { date: string; lessons: string[] }[]) => {
    const comp: Record<string, string> = {}
    let cnt = 0
    for (const d of days) {
      for (const id of d.lessons) {
        cnt++
        const s = SECTIONS.find((x) => x.id === byId.get(id)!.sectionId)!
        if (cnt >= s.lastGlobal && comp[s.id] === undefined) comp[s.id] = d.date
      }
    }
    return comp
  }

  it('لا مراجعة قبل إتمام قسمها — من أيّ نقطة انطلاق', () => {
    const violations: string[] = []
    for (const start of plan.days) {
      const r = rebuildFrom(plan, {}, start.date)
      if (r.action === 'infeasible') continue
      const comp = completionAfter(r.days)
      for (const d of r.days) {
        for (const rev of d.reviews) {
          const c = comp[rev.sectionId]
          if (c && d.date <= c) violations.push(`${start.date}: ${rev.sectionId} تُراجَع ${d.date} وتكتمل ${c}`)
        }
      }
    }
    expect(violations.slice(0, 5)).toEqual([])
  })

  it('إعادة الجدولة لا تحذف المراجعات لتتجنّب المشكلة', () => {
    for (const start of plan.days.slice(0, 6)) {
      const r = rebuildFrom(plan, {}, start.date)
      if (r.action === 'infeasible') continue
      const secs = new Set<string>()
      let total = 0
      for (const d of r.days) for (const rev of d.reviews) { secs.add(rev.sectionId); total++ }
      // كل قسم يحتفظ بمراجعاته، والتغطية كاملة
      expect(secs.size).toBe(SECTIONS.length)
      expect(total).toBeGreaterThanOrEqual(SECTIONS.length * 2)
      // ولا يضيع درس
      expect(r.days.flatMap((d) => d.lessons)).toHaveLength(TOTAL_LESSONS)
    }
  })

  it('الكنس الشامل أيضًا يقع بعد الإتمام', () => {
    for (const start of plan.days.slice(0, 8)) {
      const r = rebuildFrom(plan, {}, start.date)
      if (r.action === 'infeasible') continue
      const comp = completionAfter(r.days)
      for (const d of r.days) {
        for (const sw of d.sweeps) {
          const c = comp[sw.sectionId]
          if (c) expect(d.date > c).toBe(true)
        }
      }
    }
  })
})
