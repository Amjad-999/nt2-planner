import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { TOTAL_PLAN_DAYS } from '@/data/phases'
import { Overlay, Field } from './SettingsModal'

interface Props { onClose: () => void }

export function OnboardModal({ onClose }: Props) {
  const saveSettings = useAppStore((s) => s.saveSettings)
  const [name, setName] = useState('')
  const [examDate, setExamDate] = useState('')
  const [planDay, setPlanDay] = useState('1')

  const save = () => {
    saveSettings({
      name: name.trim(),
      examDate: examDate ? new Date(examDate + 'T09:00:00').toISOString() : undefined,
      planDay: Math.min(TOTAL_PLAN_DAYS, Math.max(1, parseInt(planDay) || 1)),
    })
    onClose()
  }

  return (
    <Overlay onClose={onClose}>
      <div style={{ textAlign:'center', marginBottom:14 }}>
        <div style={{ fontSize:'2.4rem' }}>🇳🇱</div>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.35rem', fontWeight:700, color:'var(--text)', margin:'6px 0 4px' }}>NT2 Planner</h3>
        <p style={{ color:'var(--muted)', fontSize:'.88rem', margin:0 }}>مخطّط ذكي للاستعداد لامتحان NT2 (B1)</p>
      </div>
      <Field label="اسمك (كيف تريد أن يناديك التطبيق؟)">
        <input className="form-in" value={name} onChange={(e)=>setName(e.target.value)} placeholder="مثال: أحمد" maxLength={40} style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)' }} />
      </Field>
      <Field label="تاريخ امتحان NT2">
        <input type="date" value={examDate} onChange={(e)=>setExamDate(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)' }} />
      </Field>
      <Field label="أنت حاليًا في اليوم رقم من الخطّة (1–46)">
        <input type="number" value={planDay} onChange={(e)=>setPlanDay(e.target.value)} min={1} max={46} style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)' }} />
      </Field>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:18 }}>
        <button onClick={save} style={{ background:'var(--grad-primary)', color:'#fff', border:'none', borderRadius:14, padding:'10px 22px', fontWeight:600, cursor:'pointer', fontSize:'.9rem', boxShadow:'var(--elev-2)' }}>🚀 ابدأ الآن</button>
      </div>
    </Overlay>
  )
}
