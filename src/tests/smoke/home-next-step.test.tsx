import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'

/**
 * The whole shell, end to end: five primary destinations, and a home screen
 * that opens on one clear next step. Every piece of this is lazily loaded and
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

  it('offers five primary destinations, each named in words', async () => {
    const { AppShell } = await freshShell()
    render(<AppShell />)
    const nav = screen.getByRole('navigation', { name: 'التنقّل الرئيسي' })
    for (const label of ['الرئيسية', 'تعلّم', 'تدرّب', 'المفردات', 'تقدّمي']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
    expect(nav.querySelectorAll('button')).toHaveLength(5)
  })

  it('opens home on a next step with a single primary action', async () => {
    const { AppShell } = await freshShell()
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
