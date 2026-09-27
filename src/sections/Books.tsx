import { useAppStore } from '@/store/useAppStore'
import { BOOKS } from '@/data/books'
import type { BookUnit } from '@/store/types'
import { Callout } from '@/components/ui/Callout'

export default function Books() {
  const { bookUnits, toggleBookUnit } = useAppStore()

  return (
    <div className="page">
      <h2 className="section-title">
        <span style={{ color: 'var(--orange-text)' }}>📖</span> الكتب والوحدات <span aria-hidden="true">🇳🇱</span>
      </h2>
      <Callout tone="warn" icon="📚" style={{ marginBottom: 'var(--sp-4)' }}>
        <strong style={{ color:'var(--text)' }}>تتبّع تقدّمك في الكتب الرسمية</strong> — حدّد الوحدات التي أتممت مراجعتها. يُضاف إنجازك تلقائيًا إلى لوحة التحليلات.
      </Callout>

      {BOOKS.map((b) => (
        <BookCard
          key={b.id}
          book={b}
          doneUnits={bookUnits[b.id] ?? []}
          onToggle={(i) => toggleBookUnit(b.id, i)}
        />
      ))}
    </div>
  )
}

function BookCard({ book: b, doneUnits, onToggle }: { book: BookUnit; doneUnits: number[]; onToggle: (i: number) => void }) {
  const pct = Math.round((doneUnits.length / b.units.length) * 100)

  return (
    <div
      className="relative overflow-hidden glow-card"
      style={{
        background:'var(--glass-bg)',
        backdropFilter:'blur(16px)',
        WebkitBackdropFilter:'blur(16px)',
        border:'1px solid var(--glass-border)',
        borderInlineStart:`4px solid ${b.ic}`,
        borderRadius:'var(--r)',
        padding:18,
        boxShadow:'var(--elev-1), inset 0 1px 0 var(--glass-hi)',
        marginBottom:'var(--sp-3)',
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'var(--sp-3)', marginBottom:'var(--sp-2)' }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)', fontWeight:'var(--fw-heading)', color:'var(--text)', fontSize:'var(--text-md)' }}>
            <span
              className="card-icon"
              style={{ width:32, height:32, background:b.bg, color:b.ic, borderRadius:'var(--r-xs)', display:'inline-flex', alignItems:'center', justifyContent:'center' }}
            >
              {b.icon}
            </span>
            <span className="card-value">{b.title}</span>
          </div>
          <div style={{ fontSize:'var(--text-sm)', color:'var(--muted)', marginTop:'var(--sp-1)' }}>{b.desc}</div>
        </div>
        <div style={{ fontWeight:'var(--fw-cta)', color:b.ic }}>{pct}% <span style={{ fontSize:'var(--text-xs)', color:'var(--muted)', fontWeight:'var(--fw-body)' }}>({doneUnits.length}/{b.units.length})</span></div>
      </div>
      <div style={{ background:'var(--surface3)', height:5, borderRadius:'var(--r-2xs)', overflow:'hidden', marginBottom:'var(--sp-3)' }}>
        <div className="progress-wave" style={{ height:'100%', backgroundColor:b.ic, width:`${pct}%`, transition:'width .8s ease' }} />
      </div>
      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'1fr', gap:'var(--sp-1)' }}>
        {b.units.map((u, i) => (
          <label key={i} style={{ display:'flex', alignItems:'center', gap:'var(--sp-2)', padding:'7px 9px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:'var(--r-xs)', cursor:'pointer', fontSize:'var(--text-sm)', color:'var(--text)' }}>
            <input type="checkbox" checked={doneUnits.includes(i)} onChange={() => onToggle(i)} style={{ accentColor: b.ic }} aria-label={u} />
            <span>{u}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
