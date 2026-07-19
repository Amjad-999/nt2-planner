import { useAppStore, generateTodayPlan, getPlanTotal, getCurrentDay } from '@/store/useAppStore'
import { scaledPhases, planTaskId, SKILL_AR } from '@/data/phases'

export default function Plan() {
  const { planDay, planStart, examDate, done, vocab, skill, customDur, toggleTaskDone, setCustomDur } = useAppStore()
  const planTotal = getPlanTotal({ planStart, examDate })
  const planDayNow = getCurrentDay({ planStart, planDay }, planTotal)
  const gen = generateTodayPlan({ planDay, done, vocab, skill, planStart, examDate })

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:700, color:'var(--text)', margin:'0 0 12px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ color:'var(--orange)' }}>🗓️</span> خطة الدراسة الذكية ({planTotal} يومًا)
      </h2>

      <div style={{ background:'var(--orange-l)', border:'1px solid var(--glass-border)', borderInlineStart:'3px solid var(--orange)', borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:18, fontSize:'.9rem', color:'var(--text2)', lineHeight:1.65 }}>
        <strong style={{ color:'var(--text)' }}>محرّك ذكي:</strong> الخطة تُعيد توزيع مهامك تلقائيًا بناءً على الأيام المتبقّية والمهام غير المنجزة.
      </div>

      {/* Today's tasks */}
      <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:18, boxShadow:'var(--elev-1), inset 0 1px 0 var(--glass-hi)', marginBottom:18 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10, marginBottom:10 }}>
          <div>
            <div style={{ fontWeight:600, color:'var(--text)' }}>خطة اليوم — اليوم <strong style={{ color:'var(--orange)' }}>{planDayNow}</strong> من {planTotal}</div>
            <div style={{ fontSize:'.82rem', color:'var(--muted)', marginTop:3 }}>
              تمّ اختيار هذه المهام بناءً على: المرحلة الحالية + المهام المتأخّرة + المهارة الأضعف ({gen.weakestSkill}).
            </div>
          </div>
        </div>

        {gen.tasks.length === 0 ? (
          <div style={{ background:'var(--green-l)', borderRadius:'var(--r-sm)', padding:'12px 16px', color:'var(--text2)', fontSize:'.9rem' }}>✅ أنجزت كلّ مهام اليوم — أحسنت!</div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--glass-bg)' }}>
                  {['', 'المهمّة', 'دقائق', 'المهارة', 'السبب'].map((h) => (
                    <th key={h} style={{ padding:'9px 12px', textAlign:'start', borderBottom:'1px solid var(--border)', color:'var(--muted)', fontWeight:500, fontSize:'.78rem', textTransform:'uppercase', letterSpacing:'.4px' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {gen.tasks.map((t) => (
                  <tr key={t.id} style={{ opacity: done[t.id] ? .55 : 1 }}>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)' }}>
                      <input type="checkbox" checked={!!done[t.id]} onChange={() => toggleTaskDone(t.id)} aria-label={`إكمال: ${t.name}`} style={{ accentColor:'var(--orange)' }} />
                    </td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)', fontWeight:500, color:'var(--text)', textDecoration: done[t.id] ? 'line-through' : 'none' }}>{t.name}</td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)', fontSize:'.86rem', color:'var(--text2)', whiteSpace:'nowrap' }}>
                      <input type="number" min={5} max={180} value={customDur[t.id] ?? t.mins}
                        onChange={(e)=>{ const n=parseInt(e.target.value); if(!isNaN(n)) setCustomDur(t.id, n) }}
                        aria-label={`دقائق المهمّة: ${t.name}`}
                        style={{ width:54, padding:'4px 6px', border:'1px solid var(--border2)', borderRadius:8, background:'var(--surface)', color:'var(--text)', fontFamily:'inherit', fontSize:'.84rem' }} />
                      <span style={{ marginInlineStart:4, color:'var(--muted)' }}>د</span>
                    </td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)', fontSize:'.86rem', color:'var(--text2)' }}>{SKILL_AR[t.skill] ?? t.skill}</td>
                    <td style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)', fontSize:'.78rem', color:'var(--muted)' }}>{t.why}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Phase overview */}
      <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'18px 0 10px' }}>الخطة الكاملة — 5 مراحل</h3>
      {scaledPhases(planTotal).map((ph) => {
        const pDone: number[] = []
        let pTotal = 0
        for (let d = ph.dayFrom; d <= ph.dayTo; d++) {
          ph.tasks.forEach((_, i) => { pTotal++; if (done[planTaskId(ph.id, d, i)]) pDone.push(1) })
        }
        const pct = pTotal ? Math.round((pDone.length / pTotal) * 100) : 0
        return (
          <div key={ph.id} style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:18, boxShadow:'var(--elev-1), inset 0 1px 0 var(--glass-hi)', marginBottom:12 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
              <div><strong style={{ color:'var(--text)' }}>{ph.title}</strong> <span style={{ fontSize:'.78rem', color:'var(--muted)' }}>(أيام {ph.days})</span></div>
              <div style={{ fontSize:'.85rem', color:'var(--orange)', fontWeight:600 }}>{pct}% — {pDone.length}/{pTotal}</div>
            </div>
            <div style={{ marginTop:8, background:'var(--surface3)', height:6, borderRadius:3, overflow:'hidden' }}>
              <div className="progress-wave" style={{ height:'100%', background:'var(--orange)', width:`${pct}%`, transition:'width .8s ease' }} />
            </div>
            <details style={{ marginTop:10 }}>
              <summary style={{ cursor:'pointer', color:'var(--text2)', fontSize:'.86rem' }}>عرض مهام هذه المرحلة</summary>
              <table style={{ width:'100%', borderCollapse:'collapse', marginTop:8 }}>
                <thead>
                  <tr style={{ background:'var(--glass-bg)' }}>
                    {['', 'اليوم', 'المهمّة', 'دقائق'].map((h) => (
                      <th key={h} style={{ padding:'9px 12px', textAlign:'start', borderBottom:'1px solid var(--border)', color:'var(--muted)', fontWeight:500, fontSize:'.78rem' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: ph.dayTo - ph.dayFrom + 1 }, (_, di) => ph.dayFrom + di).flatMap((d) =>
                    ph.tasks.map((t, i) => {
                      const id = planTaskId(ph.id, d, i)
                      return (
                        <tr key={id} style={{ opacity: done[id] ? .55 : 1 }}>
                          <td style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)' }}><input type="checkbox" checked={!!done[id]} onChange={() => toggleTaskDone(id)} style={{ accentColor:'var(--orange)' }} /></td>
                          <td style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)', fontSize:'.86rem' }}>{d}</td>
                          <td style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)', fontWeight:500, color:'var(--text)', textDecoration: done[id] ? 'line-through' : 'none' }}>{t.name}</td>
                          <td style={{ padding:'9px 12px', borderBottom:'1px solid var(--border)', fontSize:'.86rem', color:'var(--text2)' }}>{t.mins}د</td>
                        </tr>
                      )
                    })
                  )}
                </tbody>
              </table>
            </details>
          </div>
        )
      })}
    </div>
  )
}
