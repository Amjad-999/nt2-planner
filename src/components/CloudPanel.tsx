import { useState, useEffect } from 'react'
import { useCloud } from '@/features/cloud/cloudStore'

const STATUS_AR: Record<string, string> = {
  offline: 'معطّل', idle: 'جاهز', syncing: 'تتمّ المزامنة…', synced: 'مُزامَن ✓', error: 'خطأ',
}

const card: React.CSSProperties = {
  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
  borderRadius: 'var(--r)', padding: '16px 16px', marginTop: 14,
}
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--border2)',
  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: '.92rem', marginBottom: 8, direction: 'ltr',
}
const btn = (primary = false): React.CSSProperties => ({
  background: primary ? 'var(--grad-primary)' : 'var(--btn-bg)', color: primary ? '#fff' : 'var(--text2)',
  border: primary ? 'none' : '1px solid var(--btn-border)', borderRadius: 8, padding: '9px 16px',
  backdropFilter: primary ? undefined : 'blur(10px)', WebkitBackdropFilter: primary ? undefined : 'blur(10px)',
  fontWeight: 600, fontSize: '.85rem', fontFamily: 'inherit', cursor: 'pointer',
})

export function CloudPanel() {
  const { configured, user, status, message, lastSyncedAt, init,
    signInEmail, signUpEmail, signInGoogle, signOut, syncNow, deleteCloud } = useCloud()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmDel, setConfirmDel] = useState(false)

  useEffect(() => { init() }, [init])

  return (
    <div dir="rtl" style={card}>
      <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ color: 'var(--orange)' }}>☁️</span> الحفظ السحابي
      </h3>

      {!configured ? (
        <p style={{ fontSize: '.85rem', color: 'var(--text2)', lineHeight: 1.7, margin: '6px 0 0' }}>
          غير مُفعّل بعد. أضف <code style={{ direction: 'ltr', display: 'inline-block' }}>VITE_SUPABASE_URL</code> و
          <code style={{ direction: 'ltr', display: 'inline-block' }}>VITE_SUPABASE_ANON_KEY</code> في ملفّ <b>.env</b>
          (راجع دليل الإعداد CLOUD_SETUP.md) ثمّ أعد تشغيل الخادم. بياناتك تُحفظ محليًّا دائمًا بكل الأحوال.
        </p>
      ) : !user ? (
        <div style={{ marginTop: 10 }}>
          <p style={{ fontSize: '.82rem', color: 'var(--muted)', margin: '0 0 10px' }}>سجّل الدخول لمزامنة تقدّمك بين أجهزتك (دمج بلا حذف).</p>
          <input style={inp} type="email" autoComplete="email" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={inp} type="password" autoComplete="current-password" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-shine" style={btn(true)} disabled={status === 'syncing'} onClick={() => signInEmail(email, password)}>تسجيل الدخول</button>
            <button className="btn-shine" style={btn()} disabled={status === 'syncing'} onClick={() => signUpEmail(email, password)}>إنشاء حساب</button>
            <button className="btn-shine" style={btn()} onClick={() => signInGoogle()}>المتابعة بحساب Google</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: '.85rem', color: 'var(--text2)', marginBottom: 4 }}>
            مسجّل الدخول: <b style={{ color: 'var(--text)', direction: 'ltr', display: 'inline-block' }}>{user.email ?? user.id}</b>
          </div>
          <div style={{ fontSize: '.78rem', color: 'var(--muted)', marginBottom: 12 }}>
            الحالة: {STATUS_AR[status] ?? status}
            {lastSyncedAt ? ' · آخر مزامنة: ' + new Date(lastSyncedAt).toLocaleTimeString('ar-EG') : ''}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn-shine" style={btn(true)} disabled={status === 'syncing'} onClick={() => syncNow()}>مزامنة الآن</button>
            <button className="btn-shine" style={btn()} onClick={() => signOut()}>تسجيل الخروج</button>
          </div>
          {!confirmDel ? (
            <button style={{ ...btn(), color: 'var(--red)', borderColor: 'var(--red)', marginTop: 10 }} onClick={() => setConfirmDel(true)}>حذف بياناتي السحابية…</button>
          ) : (
            <div style={{ marginTop: 10, padding: '10px 12px', background: 'var(--red-l)', borderRadius: 8, border: '1px solid var(--red)' }}>
              <div style={{ fontSize: '.82rem', color: 'var(--text)', marginBottom: 8 }}>سيُحذف نسختك السحابية فقط — بياناتك المحلّية على هذا الجهاز تبقى. متابعة؟</div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button style={{ ...btn(), color: 'var(--red)', borderColor: 'var(--red)' }} onClick={() => { deleteCloud(); setConfirmDel(false) }}>نعم، احذف السحابي</button>
                <button className="btn-shine" style={btn()} onClick={() => setConfirmDel(false)}>إلغاء</button>
              </div>
            </div>
          )}
        </div>
      )}

      {message && <div style={{ marginTop: 10, fontSize: '.8rem', color: status === 'error' ? 'var(--red)' : 'var(--green)', lineHeight: 1.6 }}>{message}</div>}
    </div>
  )
}
