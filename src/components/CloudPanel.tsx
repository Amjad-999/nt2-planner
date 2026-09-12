import { useState, useEffect } from 'react'
import { useCloud } from '@/features/cloud/cloudStore'

const STATUS_AR: Record<string, string> = {
  offline: 'معطّل', idle: 'جاهز', syncing: 'تتمّ المزامنة…', synced: 'مُزامَن ✓', error: 'خطأ',
}

const card: React.CSSProperties = {
  background: 'var(--glass-bg)', border: '1px solid var(--glass-border)',
  borderRadius: 'var(--r)', padding: '16px 16px', marginTop: 'var(--sp-3)',
}
const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 'var(--r-xs)', border: '1px solid var(--border2)',
  background: 'var(--surface)', color: 'var(--text)', fontFamily: 'inherit', fontSize: 'var(--text-sm)', marginBottom: 'var(--sp-2)', direction: 'ltr',
}
const btn = (primary = false): React.CSSProperties => ({
  background: 'var(--btn-bg)', color: primary ? 'var(--text)' : 'var(--text2)',
  border: '1px solid var(--btn-border)', borderRadius: 'var(--r-xs)', padding: '9px 16px',
  backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
  fontWeight: primary ? 700 : 600, fontSize: 'var(--text-sm)', fontFamily: 'inherit', cursor: 'pointer',
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
      <h3 style={{ margin: '0 0 4px', fontSize: 'var(--text-base)', fontWeight: 'var(--fw-heading)', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
        <span style={{ color: 'var(--orange-text)' }}>☁️</span> الحفظ السحابي
      </h3>

      {!configured ? (
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)', margin: '6px 0 0' }}>
          غير مُفعّل بعد. أضف <code style={{ direction: 'ltr', display: 'inline-block' }}>VITE_SUPABASE_URL</code> و
          <code style={{ direction: 'ltr', display: 'inline-block' }}>VITE_SUPABASE_ANON_KEY</code> في ملفّ <b>.env</b>
          (راجع دليل الإعداد CLOUD_SETUP.md) ثمّ أعد تشغيل الخادم. بياناتك تُحفظ محليًّا دائمًا بكل الأحوال.
        </p>
      ) : !user ? (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--muted)', margin: '0 0 10px' }}>سجّل الدخول لمزامنة تقدّمك بين أجهزتك (دمج بلا حذف).</p>
          <input style={inp} type="email" autoComplete="email" aria-label="البريد الإلكتروني" placeholder="البريد الإلكتروني" value={email} onChange={e => setEmail(e.target.value)} />
          <input style={inp} type="password" autoComplete="current-password" aria-label="كلمة المرور" placeholder="كلمة المرور" value={password} onChange={e => setPassword(e.target.value)} />
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <button className="btn-shine" style={btn(true)} disabled={status === 'syncing'} onClick={() => signInEmail(email, password)}>تسجيل الدخول</button>
            <button className="btn-shine" style={btn()} disabled={status === 'syncing'} onClick={() => signUpEmail(email, password)}>إنشاء حساب</button>
            <button className="btn-shine" style={btn()} onClick={() => signInGoogle()}>المتابعة بحساب Google</button>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 'var(--sp-3)' }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', marginBottom: 'var(--sp-1)' }}>
            مسجّل الدخول: <b style={{ color: 'var(--text)', direction: 'ltr', display: 'inline-block' }}>{user.email ?? user.id}</b>
          </div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', marginBottom: 'var(--sp-3)' }}>
            الحالة: {STATUS_AR[status] ?? status}
            {lastSyncedAt ? ' · آخر مزامنة: ' + new Date(lastSyncedAt).toLocaleTimeString('ar-EG') : ''}
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
            <button className="btn-shine" style={btn(true)} disabled={status === 'syncing'} onClick={() => syncNow()}>مزامنة الآن</button>
            <button className="btn-shine" style={btn()} onClick={() => signOut()}>تسجيل الخروج</button>
          </div>
          {!confirmDel ? (
            <button style={{ ...btn(), color: 'var(--red-text)', borderColor: 'var(--red)', marginTop: 'var(--sp-3)' }} onClick={() => setConfirmDel(true)}>حذف بياناتي السحابية…</button>
          ) : (
            <div style={{ marginTop: 'var(--sp-3)', padding: '10px 12px', background: 'var(--red-l)', borderRadius: 'var(--r-xs)', border: '1px solid var(--red)' }}>
              <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text)', marginBottom: 'var(--sp-2)' }}>سيُحذف نسختك السحابية فقط — بياناتك المحلّية على هذا الجهاز تبقى. متابعة؟</div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                <button style={{ ...btn(), color: 'var(--red-text)', borderColor: 'var(--red)' }} onClick={() => { deleteCloud(); setConfirmDel(false) }}>نعم، احذف السحابي</button>
                <button className="btn-shine" style={btn()} onClick={() => setConfirmDel(false)}>إلغاء</button>
              </div>
            </div>
          )}
        </div>
      )}

      {message && <div style={{ marginTop: 'var(--sp-3)', fontSize: 'var(--text-xs)', color: status === 'error' ? 'var(--red-text)' : 'var(--green-text)', lineHeight: 'var(--lh-arabic)' }}>{message}</div>}
    </div>
  )
}
