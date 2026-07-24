import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Overlay, btnStyle } from '../SettingsModal'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'

/**
 * First-run auth gate. Mounted by AppShell whenever cloud is configured and
 * there's neither a signed-in user nor an explicit "continue as guest"
 * choice yet (see useAuth().resolved / guestMode). Deliberately non-
 * dismissable — Overlay's Escape/backdrop-click both call onClose, so we
 * pass a no-op: the only way out is one of the real actions below,
 * including "continue as guest".
 */
export function AuthModal() {
  const { signInGoogle, continueAsGuest, status } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')

  return (
    <Overlay onClose={() => {}} label={mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}>
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: '2.4rem' }}>🇳🇱</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.35rem', fontWeight: 'var(--fw-heading)', color: 'var(--text)', margin: '6px 0 4px' }}>
          أهلًا بك في NT2 Planner
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: '.88rem', margin: 0 }}>
          سجّل الدخول لحفظ تقدّمك ومزامنته بين أجهزتك — أو تابع كضيف.
        </p>
      </div>

      <div role="tablist" aria-label="طريقة الدخول" style={{ display: 'flex', gap: 8, marginBottom: 16, background: 'var(--glass-bg)', borderRadius: 12, padding: 4 }}>
        <button
          role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 600, background: mode === 'login' ? 'var(--grad-primary)' : 'transparent', color: mode === 'login' ? '#fff' : 'var(--text2)' }}
        >
          تسجيل الدخول
        </button>
        <button
          role="tab" aria-selected={mode === 'signup'} onClick={() => setMode('signup')}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 9, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: '.88rem', fontWeight: 600, background: mode === 'signup' ? 'var(--grad-primary)' : 'transparent', color: mode === 'signup' ? '#fff' : 'var(--text2)' }}
        >
          إنشاء حساب
        </button>
      </div>

      {mode === 'login'
        ? <LoginForm onSwitchToSignup={() => setMode('signup')} />
        : <SignupForm onSwitchToLogin={() => setMode('login')} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border2)' }} />
        <span style={{ fontSize: '.78rem', color: 'var(--muted)' }}>أو</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border2)' }} />
      </div>

      <button
        type="button" disabled={status === 'syncing'} onClick={() => signInGoogle()}
        className="btn-shine" style={{ ...btnStyle('ghost'), width: '100%', marginBottom: 10 }}
      >
        🇬 المتابعة بحساب Google
      </button>

      <button
        type="button" onClick={() => continueAsGuest()}
        className="btn-shine" style={{ ...btnStyle('ghost'), width: '100%', color: 'var(--muted)' }}
      >
        المتابعة بلا حساب (ضيف)
      </button>
      <p style={{ fontSize: '.76rem', color: 'var(--muted)', textAlign: 'center', marginTop: 8 }}>
        تُحفظ بياناتك محليًّا على هذا الجهاز فقط. يمكنك إنشاء حساب لاحقًا من الإعدادات لمزامنتها.
      </p>
    </Overlay>
  )
}
