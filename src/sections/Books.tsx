import { useAppStore } from '@/store/useAppStore'
import { BOOKS } from '@/data/books'
import type { BookUnit } from '@/store/types'

export default function Books() {
  const { bookUnits, toggleBookUnit } = useAppStore()

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:700, color:'var(--text)', margin:'0 0 12px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ color:'var(--orange)' }}>📖</span> الكتب والوحدات
      </h2>
      <div style={{ background:'var(--amber-l)', border:'1px solid var(--glass-border)', borderInlineStart:'3px solid var(--amber)', borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:18, fontSize:'.9rem', color:'var(--text2)', lineHeight:1.65 }}>
        📚 <strong style={{ color:'var(--text)' }}>تتبّع تقدّمك في الكتب الرسمية</strong> — حدّد الوحدات التي أتممت مراجعتها. يُضاف إنجازك تلقائيًا إلى لوحة التحليلات.
      </div>

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
        marginBottom:14,
      }}
    >
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:10, marginBottom:8 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, fontWeight:600, color:'var(--text)', fontSize:'1.02rem' }}>
            <span
              className="card-icon"
              style={{ width:32, height:32, background:b.bg, color:b.ic, borderRadius:8, display:'inline-flex', alignItems:'center', justifyContent:'center' }}
            >
              {b.icon}
            </span>
            <span className="card-value">{b.title}</span>
          </div>
          <div style={{ fontSize:'.82rem', color:'var(--muted)', marginTop:3 }}>{b.desc}</div>
        </div>
        <div style={{ fontWeight:700, color:b.ic }}>{pct}% <span style={{ fontSize:'.78rem', color:'var(--muted)', fontWeight:400 }}>({doneUnits.length}/{b.units.length})</span></div>
      </div>
      <div style={{ background:'var(--surface3)', height:5, borderRadius:3, overflow:'hidden', marginBottom:10 }}>
        <div style={{ height:'100%', background:b.ic, width:`${pct}%`, transition:'width .4s ease' }} />
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr', gap:5 }}>
        {b.units.map((u, i) => (
          <label key={i} style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 9px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:6, cursor:'pointer', fontSize:'.86rem', color:'var(--text)' }}>
            <input type="checkbox" checked={doneUnits.includes(i)} onChange={() => onToggle(i)} style={{ accentColor: b.ic }} aria-label={u} />
            <span>{u}</span>
          </label>
        ))}
      </div>
    </div>
  )
}
