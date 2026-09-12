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
  const [dailyMinutes, setDailyMinutes] = useState('30')

  const save = () => {
    saveSettings({
      name: name.trim(),
      examDate: examDate ? new Date(examDate + 'T09:00:00').toISOString() : undefined,
      planDay: Math.min(TOTAL_PLAN_DAYS, Math.max(1, parseInt(planDay) || 1)),
      prefs: { studyDayMinutes: Number(dailyMinutes) },
    })
    onClose()
  }

  return (
    <Overlay onClose={onClose} label="الترحيب والإعداد الأوّلي">
      <div style={{ textAlign:'center', marginBottom:'var(--sp-3)' }}>
        <h3 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-xl)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'6px 0 4px' }}>لنبدأ بخطوة تناسب يومك</h3>
        <p style={{ color:'var(--muted)', fontSize:'var(--text-sm)', margin:0 }}>دروس هولندية، مراجعة كلمات وتدريب عملي. يمكنك تعديل هذه الخيارات لاحقًا.</p>
      </div>
      <Field label="اسمك (كيف تريد أن يناديك التطبيق؟)">
        <input className="form-in" value={name} onChange={(e)=>setName(e.target.value)} placeholder="مثال: أحمد" maxLength={40} style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'var(--text-sm)', color:'var(--text)' }} />
      </Field>
      <Field label="هدف الدراسة اليومي">
        <select className="form-in" value={dailyMinutes} onChange={(e) => setDailyMinutes(e.target.value)}>
          {[15, 30, 45, 60, 90, 120].map(minutes => <option key={minutes} value={minutes}>{minutes} دقيقة</option>)}
        </select>
      </Field>
      <Field label="تاريخ الامتحان (اختياري)">
        <input type="date" value={examDate} onChange={(e)=>setExamDate(e.target.value)} style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'var(--text-sm)', color:'var(--text)' }} />
      </Field>
      <details>
        <summary style={{ minHeight: 44, cursor: 'pointer', color: 'var(--text2)' }}>لديّ خطة دراسة سابقة</summary>
        <Field label={`اليوم الحالي في الخطة (1–${TOTAL_PLAN_DAYS})`}>
          <input className="form-in" type="number" value={planDay} onChange={(e)=>setPlanDay(e.target.value)} min={1} max={TOTAL_PLAN_DAYS} />
        </Field>
      </details>
      <div style={{ display:'flex', justifyContent:'flex-end', marginTop:'var(--sp-4)' }}>
        <button onClick={save} className="btn-glass" style={{ borderRadius:'var(--r-sm)', padding:'10px 22px', fontWeight:'var(--fw-cta)', color:'var(--text)', cursor:'pointer', fontSize:'var(--text-sm)', fontFamily:'inherit', boxShadow:'var(--elev-1)' }}>🚀 ابدأ الآن</button>
      </div>
    </Overlay>
  )
}
