import { Component, type ReactNode, type ErrorInfo } from 'react'

interface Props {
  children: ReactNode
  /** Changing this key resets the boundary (use activeTab) */
  tabKey: string
}
interface State { hasError: boolean; error: Error | null }

export class TabErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[TabErrorBoundary] Caught error in tab:', this.props.tabKey, '\n', error, '\nComponent stack:', info.componentStack)
  }

  // When the user navigates to a different tab, reset so the next visit is clean.
  static getDerivedStateFromProps(props: Props, state: State & { _lastKey?: string }): Partial<State & { _lastKey: string }> | null {
    if (state._lastKey !== props.tabKey) {
      return { hasError: false, error: null, _lastKey: props.tabKey }
    }
    return null
  }

  reset = () => this.setState({ hasError: false, error: null })

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          style={{ padding: '32px 28px', maxWidth: 560, margin: '0 auto', textAlign: 'center' }}
        >
          <div style={{
            background: 'var(--red-l, #FFF0F0)',
            border: '1px solid var(--red, #E53E3E)',
            borderRadius: 'var(--r, 16px)',
            padding: '28px 24px',
            boxShadow: 'var(--elev-1)',
          }}>
            <div style={{ fontSize: '2.2rem', marginBottom: 10 }}>⚠️</div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: 8,
            }}>
              حدث خطأ في هذا القسم
            </div>
            <div style={{ fontSize: '.82rem', color: 'var(--text2)', marginBottom: 12, lineHeight: 1.5 }}>
              القسم الآخر والتطبيق كلّه لا يزالان يعملان بشكل طبيعي.
            </div>
            {this.state.error && (
              <pre style={{
                fontSize: '.7rem',
                color: 'var(--muted)',
                background: 'var(--surface3)',
                borderRadius: 8,
                padding: '10px 14px',
                margin: '0 0 16px',
                textAlign: 'left',
                direction: 'ltr',
                overflow: 'auto',
                maxHeight: 100,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                fontFamily: 'monospace',
              }}>
                {this.state.error.message}
              </pre>
            )}
            <button
              onClick={this.reset}
              style={{
                background: 'var(--grad-primary)',
                color: '#fff',
                border: 'none',
                borderRadius: 12,
                padding: '9px 22px',
                fontWeight: 600,
                fontSize: '.9rem',
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              🔄 إعادة المحاولة
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
