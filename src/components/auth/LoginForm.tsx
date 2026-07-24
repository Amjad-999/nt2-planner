import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { validateEmail } from '@/lib/auth'
import { Field, btnStyle } from '../SettingsModal'

interface Props {
  onSwitchToSignup: () => void
}

export function LoginForm({ onSwitchToSignup }: Props) {
  const { signInEmail, signInMagicLink, status, message } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [touched, setTouched] = useState(false)

  const emailError = touched ? validateEmail(email) : null
  const busy = status === 'syncing'

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (validateEmail(email) || !password) return
    signInEmail(email, password)
  }

  return (
    <form onSubmit={submit} noValidate>
      <Field label="البريد الإلكتروني">
        <input
          className="form-in" type="email" autoComplete="email" dir="ltr"
          value={email} onChange={(e) => setEmail(e.target.value)} onBlur={() => setTouched(true)}
          placeholder="name@example.com" aria-invalid={!!emailError} aria-describedby={emailError ? 'login-email-err' : undefined}
        />
        {emailError && <span id="login-email-err" role="alert" style={{ color: 'var(--red)', fontSize: '.78rem', display: 'block', marginTop: 4 }}>{emailError}</span>}
      </Field>

      <Field label="كلمة المرور">
        <input
          className="form-in" type="password" autoComplete="current-password" dir="ltr"
          value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
        />
      </Field>

      {message && (
        <p role={status === 'error' ? 'alert' : undefined} style={{ color: status === 'error' ? 'var(--red)' : 'var(--green)', fontSize: '.82rem', margin: '0 0 10px' }}>
          {message}
        </p>
      )}

      <button type="submit" disabled={busy} className="btn-shine" style={{ ...btnStyle('primary'), width: '100%', opacity: busy ? 0.6 : 1 }}>
        {busy ? 'جارٍ الدخول…' : '🔑 تسجيل الدخول'}
      </button>

      <button
        type="button" disabled={busy || !!validateEmail(email)}
        onClick={() => signInMagicLink(email)}
        className="btn-shine" style={{ ...btnStyle('ghost'), width: '100%', marginTop: 8 }}
      >
        ✨ إرسال رابط دخول سحري بلا كلمة مرور
      </button>

      <p style={{ fontSize: '.82rem', color: 'var(--muted)', textAlign: 'center', marginTop: 14 }}>
        ليس لديك حساب؟{' '}
        <button type="button" onClick={onSwitchToSignup} style={{ background: 'none', border: 'none', color: 'var(--orange-ink)', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', padding: 0 }}>
          أنشئ حسابًا
        </button>
      </p>
    </form>
  )
}
