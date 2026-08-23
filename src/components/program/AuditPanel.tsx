import type { AuditResult } from '@/features/program/audit'
import type { FeasibilityReport } from '@/features/program/types'

interface Props {
  audit: AuditResult
  feasibility: FeasibilityReport
  capacityMinutes: number
}

export function AuditPanel({ audit, feasibility, capacityMinutes }: Props) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {/* الواقعية أولًا — الرقم الذي لا يُجامَل فيه */}
      <div
        style={{
          background: feasibility.feasible ? 'var(--green-l)' : 'var(--red-l)',
          border: `1px solid ${feasibility.feasible ? 'var(--green)' : 'var(--red)'}`,
          borderRadius: 'var(--r-sm)', padding: '14px 18px',
        }}
      >
        <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
          {feasibility.feasible ? '✅ الخطّة ضمن طاقتك المُعلَنة' : '⚠️ الخطّة تتجاوز طاقتك المُعلَنة'}
        </div>
        <div style={{ fontSize: '.86rem', color: 'var(--text2)', lineHeight: 1.7 }}>
          أثقل يوم: <strong style={{ color: 'var(--text)' }}>{feasibility.peakWallMinutes} دقيقة</strong>{' '}
          ({Math.floor(feasibility.peakWallMinutes / 60)}س {feasibility.peakWallMinutes % 60}د) في {feasibility.peakDate}.
          {' '}متوسّط يوم التعلّم: <strong style={{ color: 'var(--text)' }}>{feasibility.avgLearnWallMinutes} دقيقة</strong>.
          {' '}طاقتك المُعلَنة: {capacityMinutes} دقيقة.
        </div>
        <ul style={{ margin: '8px 0 0', paddingInlineStart: 20, fontSize: '.84rem', color: 'var(--text2)', lineHeight: 1.7 }}>
          {feasibility.notes.map((n, i) => <li key={i}>{n}</li>)}
        </ul>
      </div>

      {/* التدقيق */}
      <div
        style={{
          background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
          borderRadius: 'var(--r-sm)', padding: '14px 18px',
        }}
      >
        <div
          style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            flexWrap: 'wrap', gap: 8, marginBottom: 10,
          }}
        >
          <strong style={{ color: 'var(--text)' }}>تدقيق الخطّة</strong>
          <span
            style={{
              background: audit.pass ? 'var(--green-l)' : 'var(--red-l)',
              color: audit.pass ? 'var(--green)' : 'var(--red)',
              borderRadius: 8, padding: '3px 11px', fontSize: '.8rem', fontWeight: 700,
            }}
          >
            {audit.passed}/{audit.total} فحصًا
          </span>
        </div>

        <div style={{ display: 'grid', gap: 5 }}>
          {audit.checks.map((c) => (
            <div
              key={c.id}
              style={{
                display: 'flex', gap: 9, alignItems: 'flex-start',
                fontSize: '.82rem', lineHeight: 1.55,
                padding: '5px 0', borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ color: c.pass ? 'var(--green)' : 'var(--red)', fontWeight: 700, flexShrink: 0 }}>
                {c.pass ? '✓' : '✕'}
              </span>
              <span style={{ flex: 1 }}>
                <strong style={{ color: 'var(--text)', fontWeight: 600 }}>{c.label}</strong>
                <span style={{ color: 'var(--muted)' }}> — {c.detail}</span>
              </span>
            </div>
          ))}
        </div>

        <div style={{ fontSize: '.76rem', color: 'var(--muted)', marginTop: 10, lineHeight: 1.6 }}>
          هذه الفحوص تُعاد على الجهاز في كل مرّة تفتح فيها الصفحة، وتُعيد حساب كل شيء
          من المنهج الأصلي — لا تقرأ أرقامًا محفوظة.
        </div>
      </div>
    </div>
  )
}
