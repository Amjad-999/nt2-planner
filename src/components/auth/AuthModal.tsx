import { useEffect, useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { Overlay, btnStyle } from '../SettingsModal'
import { LoginForm } from './LoginForm'
import { SignupForm } from './SignupForm'

interface Props {
  /** Omit for the first-run gate (non-dismissable). Pass a handler when the
   *  dialog is opened on demand — e.g. from the dashboard's AuthBar — and it
   *  becomes closable by Escape, backdrop click, and a "later" button. */
  onClose?: () => void
}

/**
 * Two roles, one dialog:
 *
 * 1. First-run auth gate — mounted by AppShell whenever cloud is configured
 *    and there's neither a signed-in user nor an explicit "continue as guest"
 *    choice yet (see useAuth().resolved / guestMode). Deliberately non-
 *    dismissable: Overlay's Escape/backdrop-click both call onClose, so we
 *    pass a no-op and the only way out is a real action, "continue as guest"
 *    included.
 * 2. On-demand sign-in — opened from the dashboard AuthBar by a guest who
 *    decides later that they want cloud sync. Here dismissing is the whole
 *    point (they already have a working local app), so `onClose` is wired up
 *    and the guest button is replaced by "later".
 */
export function AuthModal({ onClose }: Props) {
  const { signInGoogle, continueAsGuest, status, isAuthenticated } = useAuth()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const dismissable = typeof onClose === 'function'

  // On-demand mode only: a successful sign-in has no other exit — the gate's
  // own dismissal is driven by AppShell's `needsAuthGate` instead.
  useEffect(() => {
    if (dismissable && isAuthenticated) onClose?.()
  }, [dismissable, isAuthenticated, onClose])

  return (
    <Overlay onClose={onClose ?? (() => {})} label={mode === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}>
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-4)' }}>
        <div style={{ fontSize: 'var(--glyph-lg)' }}>🇳🇱</div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 'var(--fw-heading)', color: 'var(--text)', margin: '6px 0 4px' }}>
          أهلًا بك في NT2 Planner
        </h3>
        <p style={{ color: 'var(--muted)', fontSize: 'var(--text-sm)', margin: 0 }}>
          سجّل الدخول لحفظ تقدّمك ومزامنته بين أجهزتك — أو تابع كضيف.
        </p>
      </div>

      <div role="tablist" aria-label="طريقة الدخول" style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)', background: 'var(--glass-bg)', borderRadius: 'var(--r-sm)', padding: 4 }}>
        <button
          role="tab" aria-selected={mode === 'login'} onClick={() => setMode('login')}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--r-xs)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', background: mode === 'login' ? 'var(--grad-primary)' : 'transparent', color: mode === 'login' ? '#fff' : 'var(--text2)' }}
        >
          تسجيل الدخول
        </button>
        <button
          role="tab" aria-selected={mode === 'signup'} onClick={() => setMode('signup')}
          style={{ flex: 1, padding: '8px 12px', borderRadius: 'var(--r-xs)', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', background: mode === 'signup' ? 'var(--grad-primary)' : 'transparent', color: mode === 'signup' ? '#fff' : 'var(--text2)' }}
        >
          إنشاء حساب
        </button>
      </div>

      {mode === 'login'
        ? <LoginForm onSwitchToSignup={() => setMode('signup')} />
        : <SignupForm onSwitchToLogin={() => setMode('login')} />}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', margin: '18px 0' }}>
        <div style={{ flex: 1, height: 1, background: 'var(--border2)' }} />
        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>أو</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border2)' }} />
      </div>

      <button
        type="button" disabled={status === 'syncing'} onClick={() => signInGoogle()}
        className="btn-shine" style={{ ...btnStyle('ghost'), width: '100%', marginBottom: 'var(--sp-3)' }}
      >
        🇬 المتابعة بحساب Google
      </button>

      <button
        type="button" onClick={dismissable ? onClose : () => continueAsGuest()}
        className="btn-shine" style={{ ...btnStyle('ghost'), width: '100%', color: 'var(--muted)' }}
      >
        {dismissable ? 'ليس الآن' : 'المتابعة بلا حساب (ضيف)'}
      </button>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', textAlign: 'center', marginTop: 'var(--sp-2)' }}>
        تُحفظ بياناتك محليًّا على هذا الجهاز فقط. يمكنك إنشاء حساب لاحقًا لمزامنتها بين أجهزتك.
      </p>
    </Overlay>
  )
}
