import {
  PROGRAM_STATUS_AR, PROGRAM_STATUS_COLOR, PROGRAM_STATUS_ICON, type ProgramView,
} from '@/features/plan/program'
import { formatMinutes } from '@/features/plan/timer'
import { AR_DAY, AR_LESSON, countAr } from '@/lib/arabicCount'

/**
 * أرقام البرنامج: الحالة العامّة، التقدّم، المتأخّر، والمراجعات القادمة.
 *
 * Two progress figures on purpose. Coverage answers "how much have I been
 * through", mastery weights each lesson by its recorded status and answers "how
 * much do I actually hold". A single bar would let a wall of weak lessons read
 * as finished work.
 */

interface Kpi {
  label: string
  value: string
  hint?: string
}

function KpiGrid({ items }: { items: Kpi[] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
      {items.map((k) => (
        <div
          key={k.label}
          style={{
            padding: '12px 14px', borderRadius: 'var(--r-sm)',
            background: 'var(--btn-bg)', border: '1px solid var(--border)',
          }}
        >
          {/* --text2 لا --muted: هذه البطاقة طبقتان شفافتان فوق --bg، و--muted يسقط إلى 4.24:1 هناك */}
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>{k.label}</div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>
            {k.value}
          </div>
          {k.hint && <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', marginTop: 3, lineHeight: 1.55 }}>{k.hint}</div>}
        </div>
      ))}
    </div>
  )
}

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div style={{ height: 8, borderRadius: 8, background: 'var(--border)', overflow: 'hidden' }}>
      <div style={{ width: `${pct}%`, height: '100%', background: color, transition: 'width .3s' }} />
    </div>
  )
}

export function ProgramStats({ view, todayPct }: { view: ProgramView; todayPct: number }) {
  const { health, progress, todayBlocks } = view
  const statusColor = PROGRAM_STATUS_COLOR[health.status]

  const kpis: Kpi[] = [
    { label: 'إنجاز اليوم', value: `${todayPct}%`, hint: todayBlocks ? `من ${formatMinutes(todayBlocks.totalMinutes)}` : 'لا مهام اليوم' },
    { label: 'دروس منجزة', value: `${progress.covered} / ${progress.total}`, hint: `متبقٍّ ${countAr(progress.remaining, AR_LESSON)}` },
    { label: 'وقت الدراسة المتبقّي', value: formatMinutes(progress.minutesRemaining), hint: 'دروس جديدة فقط، بلا مراجعة' },
    { label: 'المطلوب يوميًّا', value: countAr(health.neededPerDay, AR_LESSON), hint: `على ${countAr(health.learningDaysLeft, AR_DAY)} للتعلّم` },
    { label: 'أيام متبقّية', value: `${health.daysLeft}`, hint: `من ${countAr(view.daysTotal, AR_DAY)}` },
    { label: 'دروس متأخّرة', value: `${view.overdueLessons}`, hint: view.overdueLessons === 0 ? 'لا متأخّرات' : `على ${countAr(view.overdue.length, AR_DAY)}` },
  ]

  return (
    <section
      aria-label="أرقام البرنامج"
      style={{
        padding: '18px 22px 20px', marginBottom: 18,
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderInlineStart: `4px solid ${statusColor}`,
        borderRadius: 'var(--r)', boxShadow: 'var(--elev-1)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text)' }}>
          {/* الحالة مقرونة برمز دائمًا، فلا يحمل اللون المعنى وحده */}
          <span aria-hidden style={{ marginInlineEnd: 6 }}>{PROGRAM_STATUS_ICON[health.status]}</span>
          الحالة العامّة: {PROGRAM_STATUS_AR[health.status]}
        </h3>
        <span style={{ fontSize: '.88rem', color: 'var(--text2)' }}>{health.headlineAr}</span>
      </div>

      <p style={{ margin: '0 0 14px', fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.7 }}>{health.whyAr}</p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--text2)', marginBottom: 4 }}>
            <span>تغطية المنهج</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{progress.coveredPct}%</span>
          </div>
          <Bar pct={progress.coveredPct} color="var(--orange)" />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--text-sm)', color: 'var(--text2)', marginBottom: 4 }}>
            <span>الإتقان المرجّح</span>
            <span style={{ fontVariantNumeric: 'tabular-nums' }}>{progress.masteryPct}%</span>
          </div>
          <Bar pct={progress.masteryPct} color="var(--purple)" />
        </div>
      </div>

      <KpiGrid items={kpis} />

      {view.overBudgetDays > 0 && (
        <div style={{
          marginTop: 14, padding: '12px 14px', borderRadius: 'var(--r-sm)',
          background: 'var(--red-l)', border: '1px solid var(--border)', borderInlineStart: '3px solid var(--red)',
          fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.75,
        }}>
          {/* الوقت هو القيد الحقيقي، لا عدد الدروس. هذا التحذير يقيسه صراحةً. */}
          <strong style={{ color: 'var(--red-text)' }}><span aria-hidden>!</span> الوقت لا يكفي: </strong>
          أعلنتَ {formatMinutes(view.dailyBudgetMinutes)} متاحة يوميًّا، لكنّ{' '}
          {countAr(view.overBudgetDays, AR_DAY)} في الجدول تتجاوزها.
          أثقل يوم ({view.heaviestDayKey}) يطلب <strong style={{ color: 'var(--text)' }}>{formatMinutes(view.heaviestDayMinutes)}</strong>{' '}
          بالوقت الجداري — بزيادة {formatMinutes(view.heaviestDayMinutes - view.dailyBudgetMinutes)}.
          إمّا أن ترفع وقتك اليومي، أو تُقصّر مدّة الدرس إن كانت مبالغًا فيها، أو تقبل تغطية أقل بجودة أعلى.
        </div>
      )}

      {!view.recovery.live.feasible && (
        <div style={{
          marginTop: 14, padding: '12px 14px', borderRadius: 'var(--r-sm)',
          background: 'var(--red-l)', border: '1px solid var(--border)', borderInlineStart: '3px solid var(--red)',
          fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.75,
        }}>
          <strong style={{ color: 'var(--red-text)' }}><span aria-hidden>!</span> تحذير صريح: </strong>
          {view.recovery.verdictAr}
        </div>
      )}

      {view.recovery.sacrificesAr.length > 0 && view.recovery.live.feasible && (
        <div style={{
          marginTop: 14, padding: '12px 14px', borderRadius: 'var(--r-sm)',
          background: 'var(--amber-l)', border: '1px solid var(--border)', borderInlineStart: '3px solid var(--amber)',
          fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.75,
        }}>
          <strong style={{ color: 'var(--amber-text)' }}><span aria-hidden>!</span> التعويض كلّف الآتي:</strong>
          <ul style={{ margin: '6px 0 0', paddingInlineStart: 20 }}>
            {view.recovery.sacrificesAr.map((s) => <li key={s}>{s}</li>)}
          </ul>
        </div>
      )}

      {view.overdue.length > 0 && (
        <div style={{ marginTop: 14, fontSize: '.86rem', color: 'var(--text2)' }}>
          <strong style={{ color: 'var(--text)' }}>المهام المتأخّرة</strong>
          <ul style={{ margin: '6px 0 0', paddingInlineStart: 20, lineHeight: 1.8 }}>
            {view.overdue.slice(0, 4).map((d) => (
              <li key={d.dayKey}>{d.dayKey} — {countAr(d.lessonIds.length, AR_LESSON)} لم يُغطَّ</li>
            ))}
            {view.overdue.length > 4 && <li>و {countAr(view.overdue.length - 4, AR_DAY)} أخرى.</li>}
          </ul>
          <p style={{ margin: '6px 0 0', color: 'var(--muted)' }}>
            أُعيد توزيعها تلقائيًّا على الأيام القادمة — لا حاجة لتعويضها في يوم واحد.
          </p>
        </div>
      )}

      {view.upcomingReviews.length > 0 && (
        <div style={{ marginTop: 14, fontSize: '.86rem', color: 'var(--text2)' }}>
          <strong style={{ color: 'var(--text)' }}>المراجعات القادمة</strong>
          <ul style={{ margin: '6px 0 0', paddingInlineStart: 20, lineHeight: 1.8 }}>
            {view.upcomingReviews.map((r) => (
              <li key={r.dayKey}>
                {r.dayKey} — استرجاع {countAr(r.recall, AR_LESSON)}
                {/* الصفر لا يُصاغ عددًا: «0 دروس» ليست عربية */}
                {r.spaced > 0 ? `، ومراجعة متباعدة لـ ${countAr(r.spaced, AR_LESSON)}` : '، بلا مراجعة متباعدة'}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
