import { Component, type ReactNode, type ErrorInfo } from 'react'

/**
 * Last line of defence, wrapping the whole app.
 *
 * TabErrorBoundary only covers the active section. Everything outside it —
 * TopBar, NavTabs, ToastHost, the modals, the mascot — had no boundary at all,
 * so a throw in any of them produced a blank white page with no message and no
 * way back.
 *
 * Two rules shape this component:
 *
 * 1. It must not be able to fail with the thing it is catching. It reads no
 *    store, imports no app module, and pulls the backup straight out of
 *    localStorage by key prefix.
 * 2. A crash can happen before the user's progress reached the cloud, so the
 *    recovery screen offers the local data as a download rather than only a
 *    reload button. Losing a study session to a UI bug is the worst outcome
 *    here, not the blank page itself.
 *
 * Colour literals are fallbacks after a token, matching TabErrorBoundary: this
 * screen may render before or without the stylesheet.
 */

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

/** Every key the app persists under, including the v5 and backup copies. */
const STORAGE_PREFIX = 'nt2planner'

function collectLocalBackup(): string | null {
  try {
    const dump: Record<string, string> = {}
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (!key || !key.startsWith(STORAGE_PREFIX)) continue
      const value = localStorage.getItem(key)
      if (value !== null) dump[key] = value
    }
    return Object.keys(dump).length ? JSON.stringify(dump, null, 2) : null
  } catch {
    // storage blocked (private mode, disabled cookies) — no backup to offer
    return null
  }
}

const CARD: React.CSSProperties = {
  background: 'var(--red-l, rgba(177,76,16,.14))',
  border: '1px solid var(--red, #B14C10)',
  borderRadius: 'var(--r, 16px)',
  padding: 'var(--sp-8) 24px',
  boxShadow: 'var(--elev-1)',
}

const BTN: React.CSSProperties = {
  borderRadius: 'var(--r-sm)',
  padding: '10px 22px',
  fontWeight: 'var(--fw-cta)',
  fontSize: 'var(--text-sm)',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: 'var(--text, #2D2A26)',
  minHeight: 44,
}

export class RootErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[RootErrorBoundary] Unrecoverable app error:', error, '\nComponent stack:', info.componentStack)
  }

  private downloadBackup = () => {
    const payload = collectLocalBackup()
    if (!payload) return
    const url = URL.createObjectURL(new Blob([payload], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `nt2-planner-backup-${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
  }

  private reload = () => window.location.reload()

  render() {
    if (!this.state.hasError) return this.props.children

    const hasBackup = collectLocalBackup() !== null

    return (
      <div
        dir="rtl"
        role="alert"
        style={{
          padding: 'var(--sp-12) 24px',
          maxWidth: 560,
          margin: '0 auto',
          textAlign: 'center',
          fontFamily: 'inherit',
          color: 'var(--text, #2D2A26)',
        }}
      >
        <div style={CARD}>
          <div style={{ fontSize: 'var(--glyph-lg)', marginBottom: 'var(--sp-3)' }} aria-hidden="true">🚨</div>
          <h1 style={{ fontSize: 'var(--text-lg)', fontWeight: 'var(--fw-cta)', margin: '0 0 10px' }}>
            توقّف التطبيق عن العمل
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text2, #47433E)', margin: '0 0 16px', lineHeight: 'var(--lh-arabic)' }}>
            {hasBackup
              ? 'تقدّمك المحفوظ على هذا الجهاز سليم. نزّله نسخةً احتياطية قبل إعادة التشغيل إن أردت الاطمئنان.'
              : 'أعِد التشغيل للمتابعة.'}
          </p>

          {this.state.error && (
            <pre style={{
              fontSize: 'var(--text-2xs)',
              color: 'var(--muted, #68625E)',
              background: 'var(--surface3, #F0E6DA)',
              borderRadius: 'var(--r-xs)',
              padding: '10px 14px',
              margin: '0 0 18px',
              textAlign: 'left',
              direction: 'ltr',
              overflow: 'auto',
              maxHeight: 120,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              fontFamily: 'monospace',
            }}>
              {this.state.error.message}
            </pre>
          )}

          <div style={{ display: 'flex', gap: 'var(--sp-3)', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button type="button" onClick={this.reload} className="btn-glass" style={BTN}>
              🔄 أعِد تشغيل التطبيق
            </button>
            {hasBackup && (
              <button type="button" onClick={this.downloadBackup} className="btn-glass" style={BTN}>
                ⬇️ نزّل نسخة من بياناتي
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }
}
