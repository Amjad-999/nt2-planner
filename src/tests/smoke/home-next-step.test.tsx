import { render, screen, within } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The whole shell, end to end: four daily workspaces + «المزيد», a first
 * screen that opens on today, and a dashboard with one clear next step. Every piece of this is lazily loaded and
 * composed at runtime, so a broken import or a missing section shows up here
 * and nowhere else in the suite.
 */

async function freshShell() {
  vi.resetModules()
  localStorage.clear()
  vi.doMock('@/lib/supabase', () => ({
    cloudConfigured: () => false,
    getCloud: () => Promise.resolve(null),
    CLOUD_TABLE: 'nt2_state',
  }))
  const { AppShell } = await import('@/components/AppShell')
  const { useAppStore } = await import('@/store/useAppStore')
  useAppStore.setState({ onboarded: true })
  return { AppShell, useAppStore }
}

describe('the app shell', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.resetModules()
  })

  it('offers four workspaces and «المزيد», each named in words', async () => {
    const { AppShell } = await freshShell()
    render(<AppShell />)
    const nav = screen.getByRole('navigation', { name: 'التنقل الرئيسي' })
    for (const label of ['اليوم', 'تدريب', 'كلماتي', 'تعلّمي', 'المزيد']) {
      expect(within(nav).getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(nav.querySelectorAll('button')).toHaveLength(5)
  })

  it('opens on the today workspace', async () => {
    const { AppShell, useAppStore } = await freshShell()
    render(<AppShell />)
    expect(useAppStore.getState().activeTab).toBe('today')
    expect(await screen.findByRole('heading', { level: 1 }, { timeout: 8000 })).toBeInTheDocument()
  }, 20000)

  it('keeps the dashboard on a next step with a single primary action', async () => {
    const { AppShell, useAppStore } = await freshShell()
    useAppStore.setState({ activeTab: 'dashboard' })
    render(<AppShell />)
    expect(await screen.findByText(/خطوتك التالية|اكتملت مهام اليوم/, {}, { timeout: 8000 })).toBeInTheDocument()
    const primaries = document.querySelectorAll('.btn--primary')
    expect(primaries.length, 'home must present one dominant action').toBe(1)
  }, 20000)

  it('reaches the situations section from navigation', async () => {
    const { AppShell, useAppStore } = await freshShell()
    render(<AppShell />)
    useAppStore.getState().setActiveTab('situations')
    expect(await screen.findByRole('heading', { name: 'مواقف من الحياة اليومية' }, { timeout: 8000 })).toBeInTheDocument()
  }, 20000)
})
