import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The dashboard's auth entry point. `configured` is snapshotted by cloudStore
 * at module-evaluation time, so @/lib/supabase has to be mocked BEFORE the
 * first import — hence vi.resetModules() + a dynamic import per case, the same
 * technique auth-gate.test.tsx uses.
 */
async function freshAuthBar(opts: { configured: boolean }) {
  vi.resetModules()
  localStorage.clear()
  vi.doMock('@/lib/supabase', () => ({
    cloudConfigured: () => opts.configured,
    getCloud: () => Promise.resolve(null),
    CLOUD_TABLE: 'nt2_state',
  }))
  const { AuthBar } = await import('@/components/auth/AuthBar')
  const { useCloud } = await import('@/features/cloud/cloudStore')
  return { AuthBar, useCloud }
}

beforeEach(() => {
  vi.resetModules()
  localStorage.clear()
})

describe('AuthBar', () => {
  it('renders nothing when no cloud backend is configured — never offers sync that cannot work', async () => {
    const { AuthBar } = await freshAuthBar({ configured: false })
    const { container } = render(<AuthBar />)
    expect(container).toBeEmptyDOMElement()
  })

  it('a signed-out user gets a sync call-to-action at the top of the view, not buried in settings', async () => {
    const { AuthBar } = await freshAuthBar({ configured: true })
    render(<AuthBar />)

    const btn = screen.getByRole('button', { name: /زامن تقدّمك/ })
    expect(btn).toHaveAttribute('aria-haspopup', 'dialog')
    // Touch target ≥ 44px (WCAG 2.5.5) — this row is thumb-reachable chrome.
    expect(parseInt(String(btn.style.minHeight))).toBeGreaterThanOrEqual(44)
  })

  it('opens a DISMISSABLE sign-in dialog (the first-run gate is the non-dismissable one)', async () => {
    const { AuthBar } = await freshAuthBar({ configured: true })
    render(<AuthBar />)

    fireEvent.click(screen.getByRole('button', { name: /زامن تقدّمك/ }))
    expect(await screen.findByRole('dialog', {}, { timeout: 9000 })).toBeInTheDocument()

    fireEvent.click(screen.getByText('ليس الآن'))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  }, 10000)

  it('a signed-in user gets a compact pill: name, sync state with its own icon, and logout', async () => {
    const { AuthBar, useCloud } = await freshAuthBar({ configured: true })
    useCloud.setState({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      user: { id: 'u1', email: 'amjad@example.com', user_metadata: { full_name: 'Amjad' } } as any,
      status: 'synced',
    })
    render(<AuthBar />)

    expect(screen.getByText('Amjad')).toBeInTheDocument()
    // Colour is never the only carrier of the sync state — an icon rides along.
    expect(screen.getByText('✓')).toBeInTheDocument()
    expect(screen.getByText('محفوظ في السحابة')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تسجيل الخروج من الحساب' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /زامن تقدّمك/ })).not.toBeInTheDocument()
  })
})
