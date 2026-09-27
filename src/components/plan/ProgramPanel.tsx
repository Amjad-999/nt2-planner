import { useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useNow } from '@/hooks/useNow'
import { useTicker } from '@/hooks/useTicker'
import { todayKey } from '@/lib/utils'
import { TOTAL_LESSONS, TOTAL_LESSON_MINUTES } from '@/data/curriculum'
import { buildProgramView } from '@/features/plan/program'
import { makeMinutesResolver } from '@/data/curriculum'
import { formatMinutes, isStale, positionOf } from '@/features/plan/timer'
import { AR_LESSON, countAr } from '@/lib/arabicCount'
import { ProgramTimer } from './ProgramTimer'
import { ProgramStats } from './ProgramStats'
import { ProgramSchedule } from './ProgramSchedule'
import { ProgramSections } from './ProgramSections'

/**
 * برنامج منهج الكتب الثلاثة — الواجهة الجامعة.
 *
 * The whole view model is recomputed from the stored program plus today's date,
 * memoised on exactly those inputs. Falling behind therefore needs no "catch up"
 * button: the next render already schedules the remaining lessons across the
 * days that are actually left.
 */

const CARD: React.CSSProperties = {
  padding: '18px 22px 20px', marginBottom: 'var(--sp-4)',
  background: 'var(--surface)', border: '1px solid var(--border)',
  borderRadius: 'var(--r)', boxShadow: 'var(--elev-1)',
}

const INPUT: React.CSSProperties = {
  minHeight: 44, padding: '8px 12px', borderRadius: 'var(--r-sm)',
  border: '1px solid var(--border2)', background: 'var(--bg)', color: 'var(--text)',
  fontFamily: 'inherit', fontSize: 'var(--text-sm)',
}

function SetupCard() {
  const examDate = useAppStore((s) => s.examDate)
  const activateStudyProgram = useAppStore((s) => s.activateStudyProgram)
  const now = useNow()
  const suggestedStart = todayKey(new Date(now))
  const suggestedDeadline = examDate && !isNaN(new Date(examDate).getTime())
    ? todayKey(new Date(examDate))
    : ''

  const [start, setStart] = useState(suggestedStart)
  const [deadline, setDeadline] = useState(suggestedDeadline)
  const valid = !!start && !!deadline && deadline > start

  return (
    <section aria-label="تفعيل البرنامج" style={{ ...CARD, borderInlineStart: '4px solid var(--orange)' }}>
      <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>برنامج المنهج الكامل</h3>
      <p style={{ margin: '8px 0 14px', fontSize: 'var(--text-sm)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)' }}>
        ثلاثة كتب، {countAr(TOTAL_LESSONS, AR_LESSON)}، {formatMinutes(TOTAL_LESSON_MINUTES)} من المحتوى الجديد وحده.
        اختر نافذتك الزمنية، ويُبنى الجدول كاملًا بالمراجعة والاستراحات والمؤقّتات.
      </p>
      <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
          تاريخ البداية
          <input type="date" value={start} onChange={(e) => setStart(e.target.value)} style={INPUT} />
        </label>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
          الموعد النهائي
          <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} style={INPUT} />
        </label>
        <button
          type="button"
          disabled={!valid}
          onClick={() => activateStudyProgram(start, deadline)}
          style={{
            minHeight: 44, padding: '10px 18px', borderRadius: 'var(--r-sm)',
            cursor: valid ? 'pointer' : 'not-allowed', opacity: valid ? 1 : 0.55,
            fontFamily: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)',
            background: 'var(--orange)', border: '1px solid var(--orange)', color: '#fff',
          }}
        >
          فعِّل البرنامج
        </button>
      </div>
      {!valid && (
        <p style={{ margin: '10px 0 0', fontSize: 'var(--text-sm)', color: 'var(--muted)' }}>
          يلزم تاريخان صحيحان، والموعد النهائي بعد تاريخ البداية.
        </p>
      )}
    </section>
  )
}

export function ProgramPanel() {
  const program = useAppStore((s) => s.studyProgram)
  const setStudyProgramWindow = useAppStore((s) => s.setStudyProgramWindow)
  const setStudyOrder = useAppStore((s) => s.setStudyOrder)
  const now = useTicker(30_000)
  const today = todayKey(new Date(now))

  const dailyBudgetMinutes = useAppStore((s) => s.prefs.studyDayMinutes)
  const view = useMemo(
    () => buildProgramView({ ...program, dailyBudgetMinutes }, today),
    [program, dailyBudgetMinutes, today],
  )
  /* دالّة واحدة لحلّ مدّة الدرس تُمرَّر لكل من يعرض وقتًا على هذه الشاشة. */
  const minutesOf = useMemo(
    () => makeMinutesResolver(program.lessonMinutes),
    [program.lessonMinutes],
  )

  if (!view.active) return <SetupCard />

  /* نسبة إنجاز اليوم: من زمن الجلسة الجارية إن وُجدت، وإلا من الدروس المغطّاة. */
  const session = program.session
  let todayPct = 0
  if (session && !isStale(session, now, today)) {
    todayPct = positionOf(session, now).pct
  } else if (view.today && view.today.lessonIds.length > 0) {
    const done = view.today.lessonIds.filter((id) => {
      const s = program.lessons[id]?.s
      return s !== undefined && s !== 'new' && s !== 'learning'
    }).length
    todayPct = Math.round((done / view.today.lessonIds.length) * 100)
  }

  return (
    <>
      <ProgramTimer blocks={view.todayBlocks} />
      <ProgramStats view={view} todayPct={todayPct} />
      <ProgramSchedule days={view.live.days} lessons={program.lessons} todayKey={today} minutesOf={minutesOf} />
      <ProgramSections />

      <section aria-label="إعدادات البرنامج" style={CARD}>
        <h3 style={{ margin: 0, fontSize: 'var(--text-md)', fontWeight: 'var(--fw-cta)', color: 'var(--text)' }}>حدود البرنامج</h3>
        <p style={{ margin: '8px 0 12px', fontSize: 'var(--text-sm)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)' }}>
          سقف الدروس اليومي هو صمّام الأمان: إذا تأخّرت، يوزّع النظام المتبقّي دون أن يتجاوز هذا السقف،
          وإن عجز قال ذلك صراحةً بدل أن يبني جدولًا مستحيلًا.
          وترتيب الدراسة يقرّر ما يسقط أوّلًا إن ضاق الوقت: بأولوية الامتحان تُدرَس دروس B1 قبل بقيّة A2.
        </p>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
            أقصى دروس في اليوم
            <input
              type="number" min={4} max={20} value={program.maxLessonsPerDay}
              onChange={(e) => {
                const n = parseInt(e.target.value)
                if (!isNaN(n)) setStudyProgramWindow({ maxLessonsPerDay: Math.min(20, Math.max(4, n)) })
              }}
              style={{ ...INPUT, width: 90 }}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
            الموعد النهائي
            <input
              type="date" value={program.deadlineKey}
              onChange={(e) => { if (e.target.value) setStudyProgramWindow({ deadlineKey: e.target.value }) }}
              style={INPUT}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)', fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
            ترتيب الدراسة
            <select
              value={program.order}
              onChange={(e) => setStudyOrder(e.target.value === 'examFirst' ? 'examFirst' : 'sequential')}
              style={{ ...INPUT, minWidth: 210 }}
            >
              <option value="sequential">تسلسلي — A2 ثم B1</option>
              <option value="examFirst">أولوية الامتحان — B1 أوّلًا</option>
            </select>
          </label>
        </div>
      </section>
    </>
  )
}
