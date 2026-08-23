import { useMemo, useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useTicker } from '@/hooks/useTicker'
import {
  buildProgram, assessFeasibility, sectionReviewSchedule, REVIEW_OFFSETS,
} from '@/features/program/schedule'
import { buildTimeline } from '@/features/program/timeline'
import { auditProgram } from '@/features/program/audit'
import { viewRun, completedStudyMinutes, isRunValid, reconcileRun } from '@/features/program/runtime'
import {
  summarize, assessPace, dayProgress, weakestSections, STATUS_AR, STATUS_COLOR,
} from '@/features/program/progress'
import { rebuildFrom, todayTarget, surplusAdvice } from '@/features/program/recovery'
import {
  localToday, formatDayAr, formatShortAr, formatMinutesAr, formatDuration, clockHHMM,
} from '@/features/program/dates'
import { SECTIONS, BOOKS, TOTAL_LESSONS, sectionLabel, avgLessonMinutes } from '@/data/curriculum'
import { NowCard } from '@/components/program/NowCard'
import { DayBlocks } from '@/components/program/DayBlocks'
import { LessonStatusGrid } from '@/components/program/LessonStatusGrid'
import { ScheduleTable } from '@/components/program/ScheduleTable'
import { AuditPanel } from '@/components/program/AuditPanel'
import type { LessonStatus } from '@/features/program/types'

const card: React.CSSProperties = {
  background: 'var(--glass-bg)',
  backdropFilter: 'blur(16px)',
  WebkitBackdropFilter: 'blur(16px)',
  border: '1px solid var(--glass-border)',
  borderRadius: 'var(--r)',
  padding: 18,
  boxShadow: 'var(--elev-1), inset 0 1px 0 var(--glass-hi)',
  marginBottom: 16,
}

const miniBtn: React.CSSProperties = {
  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
  borderRadius: 9, padding: '5px 11px', cursor: 'pointer',
  fontSize: '.76rem', fontWeight: 600, color: 'var(--text2)', fontFamily: 'inherit',
}

const h3: React.CSSProperties = {
  fontSize: '1.02rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px',
}

const PACE_STYLE = {
  ahead:    { color: 'var(--green)',  soft: 'var(--green-l)',  icon: '🚀' },
  onTrack:  { color: 'var(--green)',  soft: 'var(--green-l)',  icon: '✅' },
  behind:   { color: 'var(--amber)',  soft: 'var(--amber-l)',  icon: '⚠️' },
  critical: { color: 'var(--red)',    soft: 'var(--red-l)',    icon: '🚨' },
} as const

export default function Program() {
  const program = useAppStore((s) => s.program)
  const setLessonStatus = useAppStore((s) => s.setLessonStatus)
  const setLessonStatusBulk = useAppStore((s) => s.setLessonStatusBulk)
  const setProgramConfig = useAppStore((s) => s.setProgramConfig)
  const programStartRun = useAppStore((s) => s.programStartRun)
  const programPause = useAppStore((s) => s.programPause)
  const programResume = useAppStore((s) => s.programResume)
  const programAdvance = useAppStore((s) => s.programAdvance)
  const programRewind = useAppStore((s) => s.programRewind)
  const programStop = useAppStore((s) => s.programStop)
  const programSync = useAppStore((s) => s.programSync)
  const programResolveStale = useAppStore((s) => s.programResolveStale)
  const programLogMinutes = useAppStore((s) => s.programLogMinutes)
  const toggleBlockDone = useAppStore((s) => s.toggleBlockDone)
  const setBlocksDone = useAppStore((s) => s.setBlocksDone)

  const [tab, setTab] = useState<'today' | 'schedule' | 'reviews' | 'audit'>('today')

  const plan = useMemo(() => buildProgram(program.config), [program.config])
  const audit = useMemo(() => auditProgram(plan), [plan])
  const feasibility = useMemo(() => assessFeasibility(plan), [plan])

  // اليوم الحقيقي مقصوصًا على نافذة الخطّة.
  const realToday = localToday()
  const todayKey = realToday < plan.config.startDate ? plan.config.startDate
    : realToday > plan.config.deadline ? plan.config.deadline
    : realToday
  const outsideWindow = realToday !== todayKey

  // التصفّح مشتقّ لا محفوظ: null تعني «اليوم». هذا يجعل تغيّر التاريخ
  // (منتصف الليل، أو تعديل الموعد) يُعيدنا لليوم الصحيح تلقائيًا بلا تأثير جانبي.
  const [browse, setBrowse] = useState<string | null>(null)
  const selected = browse && plan.byDate[browse] ? browse : todayKey
  const setSelected = (d: string) => setBrowse(d === todayKey ? null : d)

  const day = plan.byDate[selected] ?? plan.days[0]
  const timeline = useMemo(() => buildTimeline(day, plan.config), [day, plan.config])
  const isToday = day.date === todayKey && !outsideWindow

  // بلا قيد على اليوم: المؤقّت يعمل على أيّ يوم تتصفّحه، ماضيًا كان أو قادمًا.
  // الشرط الوحيد أن تكون الجلسة تخصّ اليوم المعروض.
  const runActive = !!program.run && program.run.date === day.date
  const now = useTicker(1000, runActive)

  // جلسة جارية على يوم آخر — نُعلِم بها ولا نمنع شيئًا.
  const runningElsewhere = !!program.run && program.run.date !== day.date
    ? program.run.date
    : null

  const run = isRunValid(program.run, timeline) ? program.run : null

  // «قديمة» حالة مشتقّة نقيّة من (الجلسة، الجدول، الآن) — لا تُحفظ.
  const stale = run && runActive ? reconcileRun(run, timeline, now).stale : false

  // التأثير الوحيد هنا يُحدّث المخزن الخارجي (تقدّم تلقائي + نبضة)، بلا حالة محلّية.
  useEffect(() => {
    if (!runActive) return
    programSync(timeline, now)
  }, [runActive, now, timeline, programSync])

  const view = viewRun(run, timeline, now, stale)

  // ── الأرقام ──
  const summary = useMemo(
    () => summarize(program.statuses, program.config.durationModel),
    [program.statuses, program.config.durationModel],
  )
  const pace = useMemo(
    () => assessPace(plan, program.statuses, todayKey, program.config.dailyCapacityMinutes),
    [plan, program.statuses, todayKey, program.config.dailyCapacityMinutes],
  )
  const dayProg = useMemo(() => dayProgress(day, program.statuses, plan), [day, program.statuses, plan])
  const recovery = useMemo(
    () => rebuildFrom(plan, program.statuses, todayKey),
    [plan, program.statuses, todayKey],
  )
  const weakSections = useMemo(() => weakestSections(program.statuses, 4), [program.statuses])

  // المهام المتأخّرة: دروس أيام سابقة ما زالت «لم يبدأ».
  const overdue = useMemo(() => {
    const out: string[] = []
    for (const d of plan.days) {
      if (d.date >= todayKey) break
      for (const id of d.lessons) if ((program.statuses[id] ?? 'new') === 'new') out.push(id)
    }
    return out
  }, [plan, program.statuses, todayKey])

  // المراجعات القادمة (7 أيام).
  const upcomingReviews = useMemo(() => {
    const out: { date: string; sectionId: string; stage: number; minutes: number }[] = []
    for (const d of plan.days) {
      if (d.date < todayKey) continue
      for (const r of d.reviews) out.push({ date: d.date, sectionId: r.sectionId, stage: r.stage, minutes: r.minutes })
      if (out.length >= 12) break
    }
    return out.slice(0, 12)
  }, [plan, todayKey])

  // تسجيل دقائق الدراسة المنجزة في سجلّ التطبيق (بلا احتساب مزدوج).
  const doneMinutes = completedStudyMinutes(run, timeline)
  useEffect(() => {
    // يُسجَّل على اليوم المدروس فعلًا، أيًّا كان.
    if (doneMinutes > 0) programLogMinutes(day.date, doneMinutes)
  }, [doneMinutes, day.date, programLogMinutes])

  const target = todayTarget(plan, program.statuses, todayKey)
  const surplus = dayProg.doneLessons - dayProg.plannedLessons

  // القفز إلى أيّ كتلة في أيّ يوم — بلا شرط.
  const jump = useCallback((index: number) => {
    programStartRun(timeline, Date.now(), index)
  }, [timeline, programStartRun])

  const dates = useMemo(() => plan.days.map((d) => d.date), [plan])

  // الإنجاز = ما سجّلته الجلسة + ما علّمته يدويًا. الاتّحاد يجعل الطريقتين
  // متكافئتين تمامًا: لا فرق بين إنجاز بالمؤقّت وإنجاز بضغطة.
  const allBlockIds = useMemo(() => timeline.blocks.map((b) => b.id), [timeline])
  const dayBlocksDone = useMemo(
    () => Array.from(new Set([...(program.completedBlocks[day.date] ?? []), ...(run?.completed ?? [])])),
    [program.completedBlocks, day.date, run],
  )
  const paceStyle = PACE_STYLE[pace.status]

  return (
    <div style={{ padding: '24px 20px 60px', maxWidth: 1180, margin: '0 auto' }}>
      <h2
        style={{
          fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700,
          color: 'var(--text)', margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 10,
        }}
      >
        <span style={{ color: 'var(--orange)' }}>🎯</span> برنامج الـ{TOTAL_LESSONS} درسًا
      </h2>
      <div style={{ fontSize: '.86rem', color: 'var(--muted)', marginBottom: 16 }}>
        {formatShortAr(plan.config.startDate)} → {formatShortAr(plan.config.deadline)} ·{' '}
        {plan.totals.windowDays} يومًا · {plan.totals.learnDays} يوم تعلّم +{' '}
        {plan.totals.bufferDays} احتياطي + {plan.totals.consolidationDays} تثبيت +{' '}
        {plan.totals.taperDays} تخفيف
      </div>

      {outsideWindow && (
        <div
          style={{
            background: 'var(--amber-l)', border: '1px solid var(--amber)',
            borderRadius: 'var(--r-sm)', padding: '10px 16px', marginBottom: 14,
            fontSize: '.86rem', color: 'var(--text2)',
          }}
        >
          تاريخ جهازك ({realToday}) خارج نافذة البرنامج — أعرض لك{' '}
          {realToday < plan.config.startDate ? 'اليوم الأول' : 'اليوم الأخير'}. المؤقّت معطّل حتى تدخل النافذة.
        </div>
      )}

      {/* ── شريط الحالة العامة ── */}
      <div
        style={{
          ...card, display: 'flex', gap: 14, alignItems: 'center',
          flexWrap: 'wrap', background: paceStyle.soft, borderColor: paceStyle.color,
        }}
      >
        <span style={{ fontSize: '1.5rem' }} aria-hidden="true">{paceStyle.icon}</span>
        <div style={{ flex: '1 1 300px' }}>
          <div style={{ fontWeight: 700, color: paceStyle.color, fontSize: '1rem' }}>{pace.label}</div>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', lineHeight: 1.6, marginTop: 2 }}>
            {pace.note}
          </div>
        </div>
      </div>

      {/* ── مؤشّرات ── */}
      <div
        style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))',
          gap: 10, marginBottom: 16,
        }}
      >
        <Kpi label="متبقٍّ من دراسة اليوم" value={formatDuration(view.remainingStudyMs)} sub={`على الساعة ${formatDuration(view.remainingWallMs)}`} mono />
        <Kpi label="إنجاز اليوم" value={`${dayProg.pct}%`} sub={`${dayProg.doneLessons}/${dayProg.plannedLessons} درسًا`} />
        <Kpi label="إنجاز البرنامج" value={`${summary.completionPct}%`} sub={`إتقان حقيقي ${summary.masteryPct}%`} accent />
        <Kpi label="الدروس" value={`${summary.covered} / ${TOTAL_LESSONS}`} sub={`متبقٍّ ${summary.remaining} درسًا`} />
        <Kpi label="مهامّ متأخّرة" value={String(overdue.length)} sub={overdue.length ? 'دروس فاتت موعدها' : 'لا تأخير'} danger={overdue.length > 0} />
        <Kpi label="هدف اليوم" value={`${target} درسًا`} sub={`للبقاء على المسار`} />
      </div>

      {/* ── تبويبات فرعية ── */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {([
          ['today', 'اليوم والمؤقّت'],
          ['schedule', 'الجدول الكامل'],
          ['reviews', 'منطق المراجعة'],
          ['audit', 'التدقيق والواقعية'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              background: tab === id ? 'var(--grad-primary)' : 'var(--glass-bg)',
              color: tab === id ? '#fff' : 'var(--text2)',
              border: tab === id ? 'none' : '1px solid var(--glass-border)',
              borderRadius: 12, padding: '8px 16px', cursor: 'pointer',
              fontSize: '.86rem', fontWeight: 600, fontFamily: 'inherit',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'today' && (
        <>
          {/* متصفّح الأيام — تنقّل حرّ: أزرار، قائمة بكل الأيام، وقفز للطرفين */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
            <NavBtn onClick={() => setSelected(plan.days[0].date)} title="أول يوم">⏮︎</NavBtn>
            <NavBtn onClick={() => setSelected(stepDate(dates, selected, -1))} title="اليوم السابق">◀︎</NavBtn>

            <div style={{ flex: '1 1 220px', textAlign: 'center', minWidth: 200 }}>
              <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                {formatDayAr(day.date)}
                <span style={{ fontWeight: 400, color: 'var(--muted)', fontSize: '.8rem' }}>
                  {' '}· يوم {day.index} من {plan.totals.windowDays}
                </span>
              </div>
              <div style={{ fontSize: '.78rem', color: 'var(--muted)' }}>{day.label}</div>
            </div>

            <NavBtn onClick={() => setSelected(stepDate(dates, selected, 1))} title="اليوم التالي">▶︎</NavBtn>
            <NavBtn onClick={() => setSelected(plan.days[plan.days.length - 1].date)} title="آخر يوم">⏭︎</NavBtn>

            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              aria-label="اختر يومًا"
              style={{
                padding: '7px 10px', border: '1px solid var(--border2)', borderRadius: 10,
                background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit',
                fontSize: '.82rem', cursor: 'pointer', maxWidth: 260,
              }}
            >
              {plan.days.map((d) => (
                <option key={d.date} value={d.date}>
                  {d.index}. {formatDayAr(d.date)} — {d.lessons.length > 0 ? `${d.lessons.length} دروس` : 'مراجعة'}
                  {d.date === todayKey ? ' · اليوم' : ''}
                </option>
              ))}
            </select>

            {selected !== todayKey && (
              <button
                onClick={() => setSelected(todayKey)}
                style={{
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  borderRadius: 10, padding: '6px 12px', cursor: 'pointer',
                  fontSize: '.8rem', color: 'var(--orange)', fontFamily: 'inherit', fontWeight: 600,
                }}
              >
                عُد لليوم
              </button>
            )}
          </div>

          {runningElsewhere && (
            <div
              style={{
                ...card, marginBottom: 12, padding: '10px 14px',
                display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap',
                background: 'var(--blue-l)', borderColor: 'var(--blue)',
                fontSize: '.85rem', color: 'var(--text2)',
              }}
            >
              <span>⏱️ توجد جلسة جارية في {formatDayAr(runningElsewhere)}.</span>
              <button
                onClick={() => setSelected(runningElsewhere)}
                style={{
                  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                  borderRadius: 10, padding: '5px 11px', cursor: 'pointer',
                  fontSize: '.8rem', color: 'var(--blue)', fontFamily: 'inherit', fontWeight: 600,
                }}
              >
                اذهب إليها
              </button>
              <span style={{ color: 'var(--muted)', fontSize: '.78rem' }}>
                بدء جلسة هنا يستبدلها — لا مانع من ذلك.
              </span>
            </div>
          )}

          <NowCard
            view={view}
            stale={stale}
            isToday={isToday}
            onStart={() => programStartRun(timeline, Date.now(), 0)}
            onPause={() => programPause(Date.now())}
            onResume={() => programResume(Date.now())}
            onNext={() => programAdvance(timeline, Date.now(), false)}
            onPrev={() => programRewind(timeline, Date.now())}
            onStop={() => programStop()}
            onResolveStale={(mode) => programResolveStale(timeline, Date.now(), mode)}
          />

          {surplus > 0 && (
            <div
              style={{
                ...card, background: 'var(--green-l)', borderColor: 'var(--green)',
                fontSize: '.87rem', color: 'var(--text2)', lineHeight: 1.7,
              }}
            >
              🚀 {surplusAdvice(surplus, Math.round(surplus * avgLessonMinutes(program.config.durationModel)))}
            </div>
          )}

          <div style={card}>
            <h3 style={h3}>
              جدول اليوم — {timeline.blocks.length} كتلة ·{' '}
              {formatMinutesAr(timeline.studyMinutes)} دراسة + {formatMinutesAr(timeline.breakMinutes)} استراحة ={' '}
              <span style={{ color: 'var(--orange)' }}>{formatMinutesAr(timeline.wallMinutes)}</span>
              {timeline.blocks.length > 0 && (
                <span style={{ fontWeight: 400, fontSize: '.82rem', color: 'var(--muted)' }}>
                  {' '}· من {clockHHMM(timeline.dayStartMs)} إلى {clockHHMM(timeline.dayEndMs)}
                </span>
              )}
            </h3>

            {timeline.blocks.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>
                  {dayBlocksDone.length}/{timeline.blocks.length} مهمّة منجزة
                </span>
                <button style={miniBtn} onClick={() => setBlocksDone(day.date, allBlockIds, true)}>
                  ✓ أنهِ اليوم كاملًا
                </button>
                <button style={miniBtn} onClick={() => setBlocksDone(day.date, allBlockIds, false)}>
                  ↺ أعد فتح اليوم
                </button>
                {day.lessons.length > 0 && (
                  <button style={miniBtn} onClick={() => setLessonStatusBulk(day.lessons, 'done')}>
                    ✓ علّم دروس اليوم مكتملة
                  </button>
                )}
              </div>
            )}

            <DayBlocks
              timeline={timeline}
              currentIndex={view.index}
              completed={dayBlocksDone}
              running={!!run}
              onJump={jump}
              onToggleDone={(blockId) => toggleBlockDone(day.date, blockId)}
            />
          </div>

          {day.lessons.length > 0 && (
            <div style={card}>
              <h3 style={h3}>حالة دروس اليوم</h3>
              <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.65 }}>
                اضغط على أيّ درس لتبديل حالته. كن صادقًا هنا — «متقن» تعني أنك استرجعتَه من ذاكرتك
                بلا مصدر، لا أنك شاهدته.
              </div>
              <LessonStatusGrid
                lessonIds={day.lessons}
                statuses={program.statuses}
                onSet={setLessonStatus}
                onSetAll={(s: LessonStatus) => setLessonStatusBulk(day.lessons, s)}
              />
            </div>
          )}

          {/* التعافي من التأخير */}
          {(overdue.length > 0 || recovery.action === 'infeasible') && (
            <div
              style={{
                ...card,
                background: recovery.action === 'infeasible' ? 'var(--red-l)' : 'var(--amber-l)',
                borderColor: recovery.action === 'infeasible' ? 'var(--red)' : 'var(--amber)',
              }}
            >
              <h3 style={h3}>{recovery.action === 'infeasible' ? '🚨' : '🔄'} {recovery.headline}</h3>
              <div style={{ fontSize: '.87rem', color: 'var(--text2)', lineHeight: 1.75 }}>
                {recovery.detail}
              </div>
              {recovery.options.length > 0 && (
                <ul style={{ margin: '10px 0 0', paddingInlineStart: 20, fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.8 }}>
                  {recovery.options.map((o, i) => <li key={i}>{o}</li>)}
                </ul>
              )}
              {recovery.action !== 'infeasible' && recovery.action !== 'none' && (
                <div style={{ fontSize: '.8rem', color: 'var(--muted)', marginTop: 10 }}>
                  وقت المراجعة {recovery.reviewPreserved ? 'محفوظ بالكامل' : 'تأثّر جزئيًا'} · أثقل يوم بعد إعادة التوزيع:{' '}
                  {formatMinutesAr(recovery.peakWallMinutes)}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {tab === 'schedule' && (
        <div style={card}>
          <h3 style={h3}>الجدول الكامل — كل يوم من {formatShortAr(plan.config.startDate)} إلى {formatShortAr(plan.config.deadline)}</h3>
          <ScheduleTable
            plan={plan}
            statuses={program.statuses}
            todayKey={todayKey}
            selected={selected}
            onSelect={(d) => { setSelected(d); setTab('today') }}
          />
        </div>
      )}

      {tab === 'reviews' && (
        <>
          <div style={card}>
            <h3 style={h3}>منطق المراجعة</h3>
            <div style={{ fontSize: '.88rem', color: 'var(--text2)', lineHeight: 1.85 }}>
              <p style={{ margin: '0 0 10px' }}>
                المراجعة هنا على <strong style={{ color: 'var(--text)' }}>مستوى القسم</strong> لا الدرس المفرد:
                164 درسًا × 3 مراجعات = 492 حدثًا لا يمكن لأحد تتبّعه. 16 قسمًا × 3 = 48 حدثًا قابل للتنفيذ فعلًا.
              </p>
              <p style={{ margin: '0 0 10px' }}>
                كل قسم يُراجَع بعد <strong style={{ color: 'var(--orange)' }}>+{REVIEW_OFFSETS[0]} يوم</strong>،{' '}
                <strong style={{ color: 'var(--orange)' }}>+{REVIEW_OFFSETS[1]} أيام</strong>، و
                <strong style={{ color: 'var(--orange)' }}>+{REVIEW_OFFSETS[2]} أيام</strong> من تاريخ إتمامه،
                ثم كنس شامل في مرحلة التثبيت. الفترات تتوسّع لأن أثر التباعد يزداد كلّما اقترب الاسترجاع
                من حافّة النسيان.
              </p>
              <p style={{ margin: '0 0 10px' }}>
                كل مراجعة <strong style={{ color: 'var(--text)' }}>استرجاع مغلق المصدر</strong>: تكتب/تقول ما تتذكّره أولًا،
                ثم تفتح المصدر للتصحيح. إعادة المشاهدة ليست مراجعة — هي أكثر ما يصنع وهم الإتقان.
              </p>
              <p style={{ margin: 0 }}>
                التشبيك (interleaving) يُطبَّق على المراجعة لا على الدروس الجديدة: ترتيب مراجعات اليوم
                يخلط الكتب عمدًا، بينما تسير الدروس الجديدة 1 → 164 بالترتيب لأن المنهج تراكمي.
              </p>
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>المراجعات القادمة</h3>
            {upcomingReviews.length === 0 ? (
              <div style={{ color: 'var(--muted)', fontSize: '.88rem' }}>لا مراجعات مجدولة بعد.</div>
            ) : (
              <div style={{ display: 'grid', gap: 6 }}>
                {upcomingReviews.map((r, i) => (
                  <div
                    key={i}
                    style={{
                      display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap',
                      background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                      borderInlineStart: '3px solid var(--amber)',
                      borderRadius: 'var(--r-sm)', padding: '9px 13px', fontSize: '.85rem',
                    }}
                  >
                    <span style={{ color: 'var(--text)', fontWeight: 600 }}>
                      🔁 {sectionLabel(r.sectionId)}
                    </span>
                    <span style={{ color: 'var(--muted)' }}>
                      {formatDayAr(r.date)} · مرحلة {r.stage} (+{r.stage === 1 ? 1 : r.stage === 2 ? 3 : 7} يوم) · {r.minutes}د
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={card}>
            <h3 style={h3}>خريطة الأقسام</h3>
            <div style={{ display: 'grid', gap: 8 }}>
              {BOOKS.map((b) => (
                <div key={b.id}>
                  <div style={{ fontSize: '.82rem', fontWeight: 700, color: b.accent, margin: '8px 0 6px' }}>
                    {b.icon} {b.title} — {b.themeCount} ثيمات · {b.lessonCount} درسًا
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(230px,1fr))', gap: 6 }}>
                    {SECTIONS.filter((s) => s.bookId === b.id).map((s) => {
                      const sched = sectionReviewSchedule(plan, s)
                      return (
                        <div
                          key={s.id}
                          style={{
                            background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                            borderRadius: 'var(--r-sm)', padding: '9px 12px', fontSize: '.78rem',
                          }}
                        >
                          <div style={{ fontWeight: 600, color: 'var(--text)' }}>
                            Thema {s.index} {s.title} · {s.size} دروس
                          </div>
                          <div style={{ color: 'var(--muted)', marginTop: 3 }}>
                            يكتمل: {formatShortAr(plan.sectionCompletion[s.id])}
                          </div>
                          <div style={{ color: 'var(--amber)', marginTop: 2 }}>
                            مراجعات: {sched.map((x) => formatShortAr(x.date)).join(' · ')}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {weakSections.length > 0 && (
            <div style={card}>
              <h3 style={h3}>أضعف الأقسام (من بياناتك)</h3>
              <div style={{ display: 'grid', gap: 6 }}>
                {weakSections.map((w) => (
                  <div key={w.section.id} style={{ fontSize: '.85rem', color: 'var(--text2)' }}>
                    <strong style={{ color: 'var(--text)' }}>{sectionLabel(w.section.id)}</strong> — إتقان{' '}
                    <span style={{ color: w.masteryPct < 50 ? 'var(--red)' : 'var(--amber)', fontWeight: 700 }}>
                      {w.masteryPct}%
                    </span>
                    {w.weak > 0 && <span style={{ color: 'var(--red)' }}> · {w.weak} درسًا ضعيفًا</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {tab === 'audit' && (
        <>
          <div style={card}>
            <h3 style={h3}>الأرقام النهائية</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 10 }}>
              <Stat label="أيام النافذة" value={`${plan.totals.windowDays} يومًا`} />
              <Stat label="أيام التعلّم" value={`${plan.totals.learnDays} يومًا`} />
              <Stat label="أيام احتياطية" value={`${plan.totals.bufferDays} يومًا`} />
              <Stat label="أيام التثبيت" value={`${plan.totals.consolidationDays} أيام`} />
              <Stat label="إجمالي الدروس" value={`${plan.totals.totalLessons} درسًا`} />
              <Stat label="وقت الدروس" value={formatMinutesAr(plan.totals.lessonMinutes)} />
              <Stat label="الاسترجاع النشط" value={formatMinutesAr(plan.totals.recallMinutes)} />
              <Stat label="المراجعة المتباعدة" value={formatMinutesAr(plan.totals.spacedReviewMinutes)} />
              <Stat label="الكنس الشامل" value={formatMinutesAr(plan.totals.sweepMinutes)} />
              <Stat label="الاختبارات الذاتية" value={formatMinutesAr(plan.totals.mockMinutes)} />
              <Stat label="النقاط الضعيفة" value={formatMinutesAr(plan.totals.weakRepairMinutes)} />
              <Stat label="الاستراحات" value={formatMinutesAr(plan.totals.breakMinutes)} />
              <Stat label="إجمالي الدراسة" value={formatMinutesAr(plan.totals.studyMinutes)} accent />
              <Stat label="الإجمالي على الساعة" value={formatMinutesAr(plan.totals.wallMinutes)} accent />
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>إعدادات المحرّك</h3>
            <div style={{ fontSize: '.82rem', color: 'var(--muted)', marginBottom: 12, lineHeight: 1.65 }}>
              أيّ تغيير هنا يُعيد بناء الجدول والمؤقّتات فورًا، ثم يُعاد التدقيق تلقائيًا.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
              <Field label="ساعة بدء اليوم" type="time" value={program.config.dayStart}
                onChange={(v) => setProgramConfig({ dayStart: v })} />
              <Field label="الطاقة اليومية (دقيقة)" type="number" value={String(program.config.dailyCapacityMinutes)}
                onChange={(v) => setProgramConfig({ dailyCapacityMinutes: clamp(+v, 30, 900) })} />
              <Field label="أيام احتياطية" type="number" value={String(program.config.bufferDays)}
                onChange={(v) => setProgramConfig({ bufferDays: clamp(+v, 0, 6) })} />
              <Field label="أيام التثبيت" type="number" value={String(program.config.consolidationDays)}
                onChange={(v) => setProgramConfig({ consolidationDays: clamp(+v, 0, 10) })} />
              <Field label="استرجاع بعد كل زوج (دقيقة)" type="number" value={String(program.config.recallMinutes)}
                onChange={(v) => setProgramConfig({ recallMinutes: clamp(+v, 0, 30) })} />
              <Field label="استراحة قصيرة" type="number" value={String(program.config.shortBreak)}
                onChange={(v) => setProgramConfig({ shortBreak: clamp(+v, 0, 30) })} />
              <Field label="استراحة طويلة" type="number" value={String(program.config.longBreak)}
                onChange={(v) => setProgramConfig({ longBreak: clamp(+v, 0, 60) })} />
              <Field label="الموعد النهائي" type="date" value={program.config.deadline}
                onChange={(v) => v && setProgramConfig({ deadline: v })} />
              <label style={{ display: 'block' }}>
                <span style={{ display: 'block', fontSize: '.78rem', color: 'var(--text2)', marginBottom: 5, fontWeight: 500 }}>
                  نموذج مدّة الدرس
                </span>
                <select
                  value={program.config.durationModel}
                  onChange={(e) => setProgramConfig({ durationModel: e.target.value === 'pages' ? 'pages' : 'flat' })}
                  style={{
                    width: '100%', padding: '8px 11px', border: '1px solid var(--border2)',
                    borderRadius: 10, background: 'var(--surface)', color: 'var(--text)',
                    fontFamily: 'inherit', fontSize: '.88rem',
                  }}
                >
                  <option value="flat">ثابت — 20 دقيقة لكل درس</option>
                  <option value="pages">موزون بعدد صفحات الدرس</option>
                </select>
              </label>
            </div>
          </div>

          <div style={card}>
            <h3 style={h3}>توزيع حالات الدروس</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 8 }}>
              {(Object.keys(STATUS_AR) as LessonStatus[]).map((s) => (
                <div
                  key={s}
                  style={{
                    background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
                    borderInlineStart: `3px solid ${STATUS_COLOR[s]}`,
                    borderRadius: 'var(--r-sm)', padding: '10px 13px',
                  }}
                >
                  <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{STATUS_AR[s]}</div>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: STATUS_COLOR[s], fontFamily: 'var(--font-latin)' }}>
                    {summary.counts[s]}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--text2)', marginTop: 12, lineHeight: 1.7 }}>
              فجوة وهم الإتقان: تغطية <strong>{summary.completionPct}%</strong> مقابل إتقان{' '}
              <strong style={{ color: 'var(--orange)' }}>{summary.masteryPct}%</strong> —
              الفارق <strong style={{ color: summary.illusionGapPct > 25 ? 'var(--red)' : 'var(--amber)' }}>
                {summary.illusionGapPct.toFixed(1)} نقطة
              </strong>. كلّما اتّسع، زاد اعتمادك على المشاهدة بدل الاسترجاع.
            </div>
          </div>

          <div style={card}>
            <AuditPanel audit={audit} feasibility={feasibility} capacityMinutes={program.config.dailyCapacityMinutes} />
          </div>
        </>
      )}
    </div>
  )
}

/* ── مكوّنات صغيرة ── */

function Kpi({ label, value, sub, accent, danger, mono }: {
  label: string; value: string; sub: string; accent?: boolean; danger?: boolean; mono?: boolean
}) {
  return (
    <div
      style={{
        background: 'var(--glass-bg-strong)', border: '1px solid var(--glass-border)',
        borderRadius: 'var(--r-sm)', padding: '11px 14px',
        boxShadow: 'var(--elev-1), inset 0 1px 0 var(--glass-hi)',
      }}
    >
      <div style={{ fontSize: '.7rem', color: 'var(--muted)', letterSpacing: '.4px', marginBottom: 3 }}>{label}</div>
      <div
        style={{
          fontSize: '1.3rem', fontWeight: 700, lineHeight: 1.15,
          color: danger ? 'var(--red)' : accent ? 'var(--orange)' : 'var(--text)',
          fontFamily: mono ? 'var(--font-latin)' : 'var(--font-display)',
          fontVariantNumeric: 'tabular-nums',
          direction: mono ? 'ltr' : undefined,
          textAlign: mono ? 'start' : undefined,
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '.72rem', color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      style={{
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        borderRadius: 'var(--r-sm)', padding: '10px 13px',
      }}
    >
      <div style={{ fontSize: '.73rem', color: 'var(--muted)' }}>{label}</div>
      <div style={{ fontSize: '1.05rem', fontWeight: 700, color: accent ? 'var(--orange)' : 'var(--text)' }}>
        {value}
      </div>
    </div>
  )
}

function Field({ label, type, value, onChange }: {
  label: string; type: string; value: string; onChange: (v: string) => void
}) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{ display: 'block', fontSize: '.78rem', color: 'var(--text2)', marginBottom: 5, fontWeight: 500 }}>
        {label}
      </span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          width: '100%', padding: '8px 11px', border: '1px solid var(--border2)',
          borderRadius: 10, background: 'var(--surface)', color: 'var(--text)',
          fontFamily: 'inherit', fontSize: '.88rem',
        }}
      />
    </label>
  )
}

function NavBtn({ onClick, children, title }: { onClick: () => void; children: React.ReactNode; title?: string }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      style={{
        background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
        borderRadius: 10, width: 38, height: 38, cursor: 'pointer',
        color: 'var(--text2)', fontSize: '.9rem', fontFamily: 'inherit', flexShrink: 0,
      }}
    >
      {children}
    </button>
  )
}

function clamp(n: number, min: number, max: number) {
  return Number.isFinite(n) ? Math.min(max, Math.max(min, Math.round(n))) : min
}

/**
 * تنقّل دائري بين الأيام: من آخر يوم يلتفّ إلى الأول والعكس.
 * لا حواجز في أطراف الجدول — الضغط المتكرّر لا يعلق أبدًا.
 */
function stepDate(dates: string[], cur: string, delta: number): string {
  if (dates.length === 0) return cur
  const i = dates.indexOf(cur)
  if (i === -1) return dates[0]
  const n = dates.length
  return dates[((i + delta) % n + n) % n]
}
