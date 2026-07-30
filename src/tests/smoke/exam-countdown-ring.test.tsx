import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExamCountdownRing } from '@/components/countdown/ExamCountdownRing'
import { useAppStore } from '@/store/useAppStore'

// canvas-confetti has no 2D context under jsdom (same reasoning as
// exam-record.test.ts) — celebrate() fires on exam day, so mock it.
vi.mock('@/lib/celebrate', () => ({ celebrate: vi.fn() }))

const DAY = 86400000

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState({
    examDate: '',
    planStart: new Date(Date.now() - 10 * DAY).toISOString(),
    // Most cases represent a user past the app's own first-run OnboardModal.
    onboarded: true,
  })
})

describe('ExamCountdownRing', () => {
  it('CRITICAL: a brand-new user sees no invented countdown — only the question', async () => {
    render(<ExamCountdownRing />)

    const btn = screen.getByRole('button', { name: /حدّد موعد امتحانك/ })
    expect(btn.textContent).not.toMatch(/[0-9]/)
    expect(screen.queryByText('حتى الامتحان')).not.toBeInTheDocument()
    // …and the question is asked on the first visit, not buried
    expect(await screen.findByRole('dialog', {}, { timeout: 9000 })).toBeInTheDocument()
  }, 10000)

  it('does not stack its modal on top of the app-level OnboardModal for a first-time visitor', async () => {
    useAppStore.setState({ onboarded: false })
    render(<ExamCountdownRing />)

    // Give the lazy modal every chance to appear before asserting its absence.
    await new Promise((r) => setTimeout(r, 300))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Once the app's own onboarding completes, the question is asked.
    useAppStore.setState({ onboarded: true })
    expect(await screen.findByRole('dialog', {}, { timeout: 9000 })).toBeInTheDocument()
  }, 10000)

  it('saves the picked date to the Zustand store (not a private localStorage key) and counts down', async () => {
    render(<ExamCountdownRing />)
    const dialog = await screen.findByRole('dialog', {}, { timeout: 9000 })

    // Build the <input type="date"> value from local parts (not toISOString,
    // which is UTC — see todayKey in utils.ts) so timezone can't skew this.
    const target = new Date()
    target.setDate(target.getDate() + 5)
    const value = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`

    fireEvent.change(dialog.querySelector('input[type="date"]') as HTMLInputElement, { target: { value } })
    fireEvent.click(screen.getByText('💾 حفظ الموعد'))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())

    // Single source of truth: the store field, which the persist middleware
    // writes to localStorage + idb-keyval and the cloud merge syncs.
    const saved = useAppStore.getState().examDate
    expect(saved).toBeTruthy()
    expect(localStorage.getItem('nt2_exam_date')).toBeNull()

    expect(screen.getByText('5')).toBeInTheDocument()
    expect(screen.getByText('حتى الامتحان')).toBeInTheDocument()
  }, 10000)

  it('announces the days left AND the share of the study window spent', () => {
    useAppStore.setState({
      planStart: new Date(Date.now() - 10 * DAY).toISOString(),
      examDate: new Date(Date.now() + 10 * DAY).toISOString(),
    })
    render(<ExamCountdownRing />)

    // 10 of a 20-day window spent → 50%
    expect(screen.getByRole('button', { name: /متبقٍ 10 يوم على امتحان NT2، وانقضى 50% من مدّة تحضيرك/ }))
      .toBeInTheDocument()
  })

  it('greets exam day instead of counting to zero, and reopens the picker afterwards', async () => {
    const today = new Date()
    today.setHours(9, 0, 0, 0)
    useAppStore.setState({ examDate: today.toISOString() })
    render(<ExamCountdownRing />)

    expect(screen.getByText('اليوم موعدك')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /اليوم هو موعد امتحان NT2/ }))
    const dialog = await screen.findByRole('dialog', {}, { timeout: 9000 })
    expect((dialog.querySelector('input[type="date"]') as HTMLInputElement).value).not.toBe('')
  }, 10000)
})
