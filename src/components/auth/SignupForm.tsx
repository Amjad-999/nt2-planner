import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { validateEmail, validatePassword } from '@/lib/auth'
import { Field, btnStyle } from '../SettingsModal'

interface Props {
  onSwitchToLogin: () => void
}

export function SignupForm({ onSwitchToLogin }: Props) {
  const { signUpEmail, status, message } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [touched, setTouched] = useState(false)

  const emailError = touched ? validateEmail(email) : null
  const pwCheck = validatePassword(password)
  const pwError = touched && password ? pwCheck.message : null
  const confirmError = touched && confirm && confirm !== password ? 'كلمتا المرور غير متطابقتين' : null
  const busy = status === 'syncing'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (validateEmail(email) || !pwCheck.valid || confirm !== password) return
    signUpEmail(email, password)
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="البريد الإلكتروني">
        <input
          className="form-in" type="email" autoComplete="email" dir="ltr"
          value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)}
          placeholder="name@example.com" aria-invalid={!!emailError} aria-describedby={emailError ? 'signup-email-err' : undefined}
        />
        {emailError && <span id="signup-email-err" role="alert" style={{ color: 'var(--red)', fontSize: '.78rem', display: 'block', marginTop: 4 }}>{emailError}</span>}
      </Field>

      <Field label="كلمة المرور">
        <input
          className="form-in" type="password" autoComplete="new-password" dir="ltr"
          value={password} onChange={(e) => setPassword(e.target.value)} onBlur={() => setTouched(true)}
          placeholder="8 أحرف على الأقل، حرف ورقم" aria-invalid={!!pwError} aria-describedby={pwError ? 'signup-pw-err' : undefined}
        />
        {pwError && <span id="signup-pw-err" role="alert" style={{ color: 'var(--red)', fontSize: '.78rem', display: 'block', marginTop: 4 }}>{pwError}</span>}
      </Field>

      <Field label="تأكيد كلمة المرور">
        <input
          className="form-in" type="password" autoComplete="new-password" dir="ltr"
          value={confirm} onChange={(e) => setConfirm(e.target.value)} onBlur={() => setTouched(true)}
          aria-invalid={!!confirmError} aria-describedby={confirmError ? 'signup-confirm-err' : undefined}
        />
        {confirmError && <span id="signup-confirm-err" role="alert" style={{ color: 'var(--red)', fontSize: '.78rem', display: 'block', marginTop: 4 }}>{confirmError}</span>}
      </Field>

      {message && (
        <p role={status === 'error' ? 'alert' : undefined} style={{ color: status === 'error' ? 'var(--red)' : 'var(--green)', fontSize: '.82rem', margin: '0 0 10px' }}>
          {message}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-shine" style={{ ...btnStyle('primary'), width: '100%', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'جارٍ الإنشاء…' : '🚀 إنشاء حساب'}
      </button>

      <p style={{ fontSize: '.82rem', color: 'var(--muted)', textAlign: 'center', marginTop: 14 }}>
        لديك حساب بالفعل؟{' '}
        <button type="button" onClick={onSwitchToLogin} style={{ background: 'none', border: 'none', color: 'var(--orange-ink)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          سجّل الدخول
        </button>
      </p>
    </form>
  )
}
