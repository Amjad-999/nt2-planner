import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { ExamCountdown } from '@/components/countdown/ExamCountdown'
import { useAppStore } from '@/store/useAppStore'

// canvas-confetti has no 2D context under jsdom (same reasoning as
// exam-record.test.ts) — celebrate() fires here (isPast), so mock it instead
// of relying on staying under a threshold.
vi.mock('@/lib/celebrate', () => ({ celebrate: vi.fn() }))

const STORAGE_KEY = 'nt2_exam_date'

beforeEach(() => {
  localStorage.clear()
  // Most scenarios here represent a user past the app's own first-run
  // OnboardModal — ExamCountdown deliberately waits for that (onboarded)
  // before auto-opening its own modal, so the two don't stack on a true
  // first visit (see the dedicated test below for that gating behavior).
  useAppStore.setState({ onboarded: true })
})

describe('ExamCountdown', () => {
  it('shows all-zero tiles and opens the date modal on first visit', async () => {
    render(<ExamCountdown />)
    expect(screen.getAllByText('00')).toHaveLength(4)
    expect(await screen.findByRole('dialog', {}, { timeout: 9000 })).toBeInTheDocument()
  }, 10000)

  it('does not stack its modal on top of the app-level OnboardModal for a brand-new user', async () => {
    useAppStore.setState({ onboarded: false })
    render(<ExamCountdown />)
    expect(screen.getAllByText('00')).toHaveLength(4)
    // Give the lazy modal every chance to appear before asserting its absence.
    await new Promise((r) => setTimeout(r, 300))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    // Once the app's own onboarding completes, ExamCountdown's modal should
    // then open (still no exam date saved for this specific feature).
    useAppStore.setState({ onboarded: true })
    expect(await screen.findByRole('dialog', {}, { timeout: 9000 })).toBeInTheDocument()
  }, 10000)

  it('saves the picked date to localStorage and starts a live countdown', async () => {
    render(<ExamCountdown />)
    const dialog = await screen.findByRole('dialog', {}, { timeout: 9000 })

    // Build the <input type="date"> value from local date parts (not
    // toISOString, which is UTC — see utils.ts's todayKey for the same
    // pitfall) so this is robust regardless of the test machine's timezone.
    const target = new Date()
    target.setDate(target.getDate() + 5)
    const dateValue = `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`

    const input = dialog.querySelector('input[type="date"]') as HTMLInputElement
    fireEvent.change(input, { target: { value: dateValue } })
    fireEvent.click(screen.getByText('💾 حفظ الموعد'))

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    const saved = localStorage.getItem(STORAGE_KEY)
    expect(saved).toBeTruthy()

    // Derive the expected day count the same way the hook does, rather than
    // hardcoding a number — avoids re-introducing a timing/timezone-fragile assertion.
    const expectedDays = Math.floor((new Date(saved as string).getTime() - Date.now()) / 86400000)
    expect(screen.getByText(String(expectedDays).padStart(2, '0'))).toBeInTheDocument()
  }, 10000)

  it('shows a celebratory message once the exam date has passed', () => {
    localStorage.setItem(STORAGE_KEY, new Date(Date.now() - 86400000).toISOString())
    render(<ExamCountdown />)
    // The 🎉 is its own element (bounces in via framer-motion — see emojiBounce
    // in @/lib/animations), so the message is split across elements; match by
    // the parent's full text content instead of an exact single-node string.
    expect(screen.getByText((_, node) => node?.textContent === '🎉 مبروك! حان يوم امتحانك!')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('reopens the modal, pre-filled, to change an already-set date', async () => {
    localStorage.setItem(STORAGE_KEY, new Date(Date.now() + 3 * 86400000).toISOString())
    render(<ExamCountdown />)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('✏️ تغيير الموعد'))
    const dialog = await screen.findByRole('dialog', {}, { timeout: 9000 })
    const input = dialog.querySelector('input[type="date"]') as HTMLInputElement
    expect(input.value).not.toBe('')
  }, 10000)
})
