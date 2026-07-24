import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The first-run auth gate (Task 5) sits in front of EVERYTHING — a bug here
 * can lock every user out of the app entirely, so it gets its own coverage
 * rather than relying on the existing suite happening to exercise it.
 *
 * @/lib/supabase is mocked per-test (not just cloudConfigured()) because
 * useCloud's `configured` field snapshots cloudConfigured() once at module
 * evaluation time — the mock has to be in place before cloudStore.ts (and
 * therefore AppShell) is first imported, hence vi.resetModules() + a fresh
 * dynamic import every time, same technique as freshStore() elsewhere.
 */
async function freshAppShell(opts: { configured: boolean }) {
  vi.resetModules()
  localStorage.clear()
  vi.doMock('@/lib/supabase', () => ({
    cloudConfigured: () => opts.configured,
    // Resolves to null: simulates "backend configured, but no active
    // session" without needing a fake Supabase client — cloudStore's init()
    // treats a null client as "checked, no user" (see its `if (!cloud)` branch).
    getCloud: () => Promise.resolve(null),
    CLOUD_TABLE: 'nt2_state',
  }))
  const { AppShell } = await import('@/components/AppShell')
  const { useAppStore } = await import('@/store/useAppStore')
  return { AppShell, useAppStore }
}

describe('first-run auth gate', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('never appears when cloud is not configured (local dev without .env)', async () => {
    const { AppShell } = await freshAppShell({ configured: false })
    render(<AppShell />)
    // Give any lazy chunk every chance to appear before asserting its absence.
    await new Promise((r) => setTimeout(r, 300))
    expect(screen.queryByRole('dialog', { name: 'تسجيل الدخول' })).not.toBeInTheDocument()
  })

  it('shows the login/signup gate before onboarding when cloud is configured and no session exists', async () => {
    const { AppShell } = await freshAppShell({ configured: true })
    render(<AppShell />)
    expect(await screen.findByRole('dialog', { name: 'تسجيل الدخول' }, { timeout: 9000 })).toBeInTheDocument()
    // Onboarding (name/exam-date form) must not appear behind/before the gate resolves.
    expect(screen.queryByText('اسمك (كيف تريد أن يناديك التطبيق؟)')).not.toBeInTheDocument()
  }, 10000)

  it('"continue as guest" dismisses the gate and persists guestMode', async () => {
    const { AppShell, useAppStore } = await freshAppShell({ configured: true })
    render(<AppShell />)
    await screen.findByRole('dialog', { name: 'تسجيل الدخول' }, { timeout: 9000 })

    fireEvent.click(screen.getByText('المتابعة بلا حساب (ضيف)'))

    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'تسجيل الدخول' })).not.toBeInTheDocument())
    expect(useAppStore.getState().guestMode).toBe(true)
  }, 10000)
})
