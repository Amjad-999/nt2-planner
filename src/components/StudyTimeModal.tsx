import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { Overlay } from './SettingsModal'
import { toast } from './Toast'

interface Props { onClose: () => void }

export function StudyTimeModal({ onClose }: Props) {
  const [mins, setMins] = useState('')
  const recordStudyMinutes = useAppStore((s) => s.recordStudyMinutes)

  const add = () => {
    const m = parseInt(mins)
    if (!m || m <= 0) return
    recordStudyMinutes(m)
    toast(`سُجّلت ${m} دقيقة دراسة`)
    onClose()
  }

  return (
    <Overlay onClose={onClose} label="إضافة وقت دراسة">
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.35rem', fontWeight:700, color:'var(--text)', marginBottom:8 }}>⏱️ أضف وقت دراسة اليوم</h3>
      <p style={{ color:'var(--muted)', fontSize:'.88rem', marginBottom:14 }}>سجّل الدقائق التي درستها اليوم. ستظهر في التحليلات وخريطة النشاط.</p>
      <label style={{ display:'block', fontSize:'.85rem', fontWeight:500, color:'var(--text2)', marginBottom:6 }}>عدد الدقائق</label>
      <input type="number" value={mins} onChange={(e)=>setMins(e.target.value)} min={1} max={600} placeholder="مثل: 30"
        onKeyDown={(e)=>e.key==='Enter'&&add()}
        style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)', marginBottom:10 }} />
      <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:18 }}>
        {[15,30,45,60].map((n)=>(
          <button key={n} onClick={()=>setMins(String(n))} className="btn-shine"
            style={{ background:'var(--btn-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--btn-border)', borderRadius:8, padding:'7px 12px', cursor:'pointer', fontSize:'.8rem', color:'var(--text2)', fontFamily:'inherit' }}>
            + {n}
          </button>
        ))}
      </div>
      <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
        <button onClick={onClose} className="btn-shine" style={{ background:'var(--btn-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--btn-border)', borderRadius:14, padding:'10px 18px', cursor:'pointer', fontSize:'.9rem', color:'var(--text2)', fontFamily:'inherit' }}>إلغاء</button>
        <button onClick={add} className="btn-glass" style={{ borderRadius:14, padding:'10px 18px', fontWeight:700, color:'var(--text)', cursor:'pointer', fontSize:'.9rem', fontFamily:'inherit' }}>إضافة</button>
      </div>
    </Overlay>
  )
}
