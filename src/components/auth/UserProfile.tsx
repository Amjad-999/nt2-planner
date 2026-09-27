import { useState } from 'react'
import { useAppStore, totalLearnedWords, avgBestScore, getDaysLeft } from '@/store/useAppStore'
import { useAuth } from '@/hooks/useAuth'
import { Overlay, Field, btnStyle } from '../SettingsModal'
import { toast } from '../Toast'

interface Props { onClose: () => void }

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function UserProfile({ onClose }: Props) {
  const s = useAppStore()
  const { user, signOut } = useAuth()
  const [name, setName] = useState(s.name)
  const [examDate, setExamDate] = useState(() => { try { return new Date(s.examDate).toISOString().slice(0, 10) } catch { return '' } })
  const [studyDayMinutes, setStudyDayMinutes] = useState(String(s.prefs.studyDayMinutes ?? 60))

  const totW = totalLearnedWords(s.vocab)
  const best = avgBestScore(s.skill)
  const daysLeft = getDaysLeft(s.examDate)
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture
  const displayName = name || user?.user_metadata?.full_name || user?.user_metadata?.name || 'ضيف'

  const save = () => {
    s.saveSettings({
      name: name.trim(),
      examDate: examDate ? new Date(examDate + 'T09:00:00').toISOString() : s.examDate,
      prefs: { studyDayMinutes: Math.min(480, Math.max(15, parseInt(studyDayMinutes) || 60)) },
    })
    toast('حُفظ الملف الشخصي')
    onClose()
  }

  return (
    <Overlay onClose={onClose} label="الملف الشخصي">
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
        {avatarUrl ? (
          <img src={avatarUrl} alt="" width={56} height={56} style={{ borderRadius: 'var(--r-full)', objectFit: 'cover', border: '1px solid var(--glass-border)' }} />
        ) : (
          <div
            aria-hidden="true"
            style={{ width: 56, height: 56, borderRadius: 'var(--r-full)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--grad-primary)', color: '#fff', fontWeight: 'var(--fw-cta)', fontSize: 'var(--text-lg)', flexShrink: 0 }}
          >
            {initials(displayName)}
          </div>
        )}
        <div style={{ minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-heading)', color: 'var(--text)' }}>{displayName}</div>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', direction: 'ltr', textAlign: 'right', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user?.email ?? 'وضع الضيف — بلا حساب سحابي'}
          </div>
        </div>
      </div>

      {/* إحصاءات التقدّم */}
      <div className="stagger" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
        {[
          { icon: '🔥', value: String(s.streak.count), label: 'مواظبة' },
          { icon: '📚', value: `${totW.learned}/${totW.all}`, label: 'كلمات' },
          { icon: '🎯', value: `${best}%`, label: 'أفضل نتيجة' },
        ].map((k) => (
          <div key={k.label} style={{ background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)', padding: '10px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 'var(--text-lg)' }}>{k.icon}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-heading)', color: 'var(--text)' }}>{k.value}</div>
            <div style={{ fontSize: 'var(--text-2xs)', color: 'var(--muted)' }}>{k.label}</div>
          </div>
        ))}
      </div>

      <Field label="اسمك"><input className="form-in" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} /></Field>
      <Field label={`تاريخ امتحان NT2${daysLeft != null ? ` (${daysLeft} يوم متبقٍ)` : ''}`}>
        <input className="form-in" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
      </Field>
      <Field label="دقائق الدراسة المتاحة يوميًا">
        <input className="form-in" type="number" min={15} max={480} value={studyDayMinutes} onChange={(e) => setStudyDayMinutes(e.target.value)} />
      </Field>

      <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'space-between', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
        {user && (
          <button type="button" onClick={() => { signOut(); onClose() }} className="btn-shine" style={btnStyle('danger')}>
            🚪 تسجيل الخروج
          </button>
        )}
        <div style={{ display: 'flex', gap: 'var(--sp-3)', marginInlineStart: 'auto' }}>
          <button type="button" onClick={onClose} className="btn-shine" style={btnStyle('ghost')}>إلغاء</button>
          <button type="button" onClick={save} className="btn-shine" style={btnStyle('primary')}>💾 حفظ</button>
        </div>
      </div>
    </Overlay>
  )
}
