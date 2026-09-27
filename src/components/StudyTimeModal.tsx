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
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-xl)', fontWeight:'var(--fw-heading)', color:'var(--text)', marginBottom:'var(--sp-2)' }}>⏱️ أضف وقت دراسة اليوم</h3>
      <p style={{ color:'var(--muted)', fontSize:'var(--text-sm)', marginBottom:'var(--sp-3)' }}>سجّل الدقائق التي درستها اليوم. ستظهر في التحليلات وخريطة النشاط.</p>
      <label htmlFor="study-mins" style={{ display:'block', fontSize:'var(--text-sm)', fontWeight:'var(--fw-medium)', color:'var(--text2)', marginBottom:'var(--sp-2)' }}>عدد الدقائق</label>
      <input id="study-mins" type="number" value={mins} onChange={(e)=>setMins(e.target.value)} min={1} max={600} placeholder="مثل: 30"
        onKeyDown={(e)=>e.key==='Enter'&&add()}
        style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'var(--text-sm)', color:'var(--text)', marginBottom:'var(--sp-3)' }} />
      <div style={{ display:'flex', gap:'var(--sp-2)', flexWrap:'wrap', marginBottom:'var(--sp-4)' }}>
        {[15,30,45,60].map((n)=>(
          <button key={n} onClick={()=>setMins(String(n))} className="btn-shine"
            style={{ background:'var(--btn-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--btn-border)', borderRadius:'var(--r-xs)', padding:'7px 12px', cursor:'pointer', fontSize:'var(--text-xs)', color:'var(--text2)', fontFamily:'inherit' }}>
            + {n}
          </button>
        ))}
      </div>
      <div style={{ display:'flex', gap:'var(--sp-3)', justifyContent:'flex-end' }}>
        <button onClick={onClose} className="btn-shine" style={{ background:'var(--btn-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--btn-border)', borderRadius:'var(--r-sm)', padding:'10px 18px', cursor:'pointer', fontSize:'var(--text-sm)', color:'var(--text2)', fontFamily:'inherit' }}>إلغاء</button>
        <button onClick={add} className="btn-glass" style={{ borderRadius:'var(--r-sm)', padding:'10px 18px', fontWeight:'var(--fw-cta)', color:'var(--text)', cursor:'pointer', fontSize:'var(--text-sm)', fontFamily:'inherit' }}>إضافة</button>
      </div>
    </Overlay>
  )
}
