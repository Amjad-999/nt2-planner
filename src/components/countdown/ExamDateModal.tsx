import { useState } from 'react'
import { Overlay, Field, btnStyle } from '@/components/SettingsModal'
import { Reveal } from '@/components/MotionFx'

interface Props {
  onClose: () => void
  onSave: (iso: string) => void
  currentDate: string | null
}

export function ExamDateModal({ onClose, onSave, currentDate }: Props) {
  const [date, setDate] = useState(() => {
    if (!currentDate) return ''
    try { return new Date(currentDate).toISOString().slice(0, 10) } catch { return '' }
  })

  const save = () => {
    if (!date) return
    onSave(new Date(date + 'T09:00:00').toISOString())
    onClose()
  }

  return (
    <Overlay onClose={onClose} label="تحديد موعد امتحان NT2">
      <Reveal>
        <div style={{ textAlign: 'center', marginBottom: 14 }}>
          <div style={{ fontSize: '2.4rem' }}>📅</div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 'var(--fw-heading)', color: 'var(--text)', margin: '6px 0 4px' }}>
            متى موعد امتحانك؟
          </h3>
          <p style={{ color: 'var(--muted)', fontSize: '.86rem', margin: 0 }}>
            حدّد التاريخ لنبدأ العدّ التنازلي الحقيقي حتى يوم الامتحان.
          </p>
        </div>
      </Reveal>

      <Field label="تاريخ امتحان NT2">
        <input
          className="form-in"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </Field>

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
        <button onClick={onClose} className="btn-shine" style={btnStyle('ghost')}>إلغاء</button>
        <button
          onClick={save}
          disabled={!date}
          className="btn-shine"
          style={{ ...btnStyle('primary'), opacity: date ? 1 : 0.55, cursor: date ? 'pointer' : 'not-allowed' }}
        >
          💾 حفظ الموعد
        </button>
      </div>
    </Overlay>
  )
}
