import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, afterEach, beforeEach, vi } from 'vitest'
import { JourneyHero } from '@/components/hero/JourneyHero'
import { useAppStore } from '@/store/useAppStore'
import { todayKey } from '@/lib/utils'
import { celebrate } from '@/lib/celebrate'

// Real confetti needs a canvas 2D context jsdom doesn't have (same reasoning
// as exam-countdown.test.tsx) — and mocking lets us assert call counts.
vi.mock('@/lib/celebrate', () => ({ celebrate: vi.fn() }))

const day = (mins: number) => ({ mins, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [] })
const skillAt = (best: number) => ({
  reading: { best, attempts: best ? 1 : 0, history: [] },
  listening: { best, attempts: best ? 1 : 0, history: [] },
  writing: { best, attempts: best ? 1 : 0, history: [] },
  speaking: { best, attempts: best ? 1 : 0, history: [] },
})

/* The global test-setup matchMedia mock always reports matches:false (motion
   allowed, fine pointer). For the reduced-motion case we swap in a
   query-aware mock — restored after each test so order can't matter. */
const originalMatchMedia = window.matchMedia

function mockReducedMotion() {
  window.matchMedia = ((query: string) => ({
    matches: query.includes('prefers-reduced-motion'),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia
}

afterEach(() => {
  window.matchMedia = originalMatchMedia
})

beforeEach(() => {
  vi.mocked(celebrate).mockClear()
  useAppStore.setState({
    dailyHistory: {},
    goalCelebratedOn: '',
    streak: { count: 0, last: '' },
    // A future date + measured skills → the ring renders its value mode by
    // default; empty-state tests override these per case.
    examDate: new Date(Date.now() + 30 * 86400000).toISOString(),
    skill: skillAt(60),
  })
})

describe('JourneyHero', () => {
  it('renders the full animated scene: 4 phase layers (one active), skyline, and the ember field', () => {
    const { container } = render(<JourneyHero />)

    const phases = container.querySelectorAll('.hero-phase')
    expect(phases).toHaveLength(4)
    expect(container.querySelectorAll('.hero-phase.on')).toHaveLength(1)

    expect(container.querySelectorAll('.hero-sky')).toHaveLength(2)
    expect(container.querySelectorAll('.ember')).toHaveLength(10)
  })

  it('shows the readiness ring and every stat the old hero carried', () => {
    render(<JourneyHero />)

    // Ring exposes its value to AT; visible label sits in the ring center
    expect(screen.getByRole('img', { name: /جاهزية/ })).toBeInTheDocument()

    for (const label of ['مواظبة', 'درست', 'اليوم', 'يوم', 'تقدمك اليومي']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })

  it('reduced motion: drops the embers but loses zero information', () => {
    mockReducedMotion()
    const { container } = render(<JourneyHero />)

    // Decorative-only elements gone…
    expect(container.querySelectorAll('.ember')).toHaveLength(0)

    // …while every informational element is still there, just static
    expect(container.querySelectorAll('.hero-phase.on')).toHaveLength(1)
    expect(screen.getByRole('img', { name: /جاهزية/ })).toBeInTheDocument()
    for (const label of ['مواظبة', 'درست', 'اليوم', 'يوم', 'تقدمك اليومي']) {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0)
    }
  })
})

describe('JourneyHero — daily-goal celebration', () => {
  it('CRITICAL: never fires on first paint when the goal was already met earlier today', () => {
    useAppStore.setState({ dailyHistory: { [todayKey()]: day(60) } })
    render(<JourneyHero />)

    expect(celebrate).not.toHaveBeenCalled()
    // The flag is consumed silently, so later minute-bumps today stay quiet too
    expect(useAppStore.getState().goalCelebratedOn).toBe(todayKey())
  })

  it('fires exactly once on a live crossing, pulses the ring, and stays quiet for the rest of the day', () => {
    useAppStore.setState({ dailyHistory: { [todayKey()]: day(30) } })
    const { container } = render(<JourneyHero />)
    expect(celebrate).not.toHaveBeenCalled()

    act(() => { useAppStore.getState().setDayMinutes(todayKey(), 60) })
    expect(celebrate).toHaveBeenCalledTimes(1)
    expect(celebrate).toHaveBeenCalledWith('tasks')
    expect(container.querySelector('.ring-pulse')).not.toBeNull()
    expect(useAppStore.getState().goalCelebratedOn).toBe(todayKey())

    act(() => { useAppStore.getState().setDayMinutes(todayKey(), 90) })
    expect(celebrate).toHaveBeenCalledTimes(1)
  })

  it('stays quiet after a reload when the flag is already persisted for today', () => {
    useAppStore.setState({
      goalCelebratedOn: todayKey(),
      dailyHistory: { [todayKey()]: day(60) },
    })
    render(<JourneyHero />)
    expect(celebrate).not.toHaveBeenCalled()
  })

  it('reduced motion: a live crossing never pulses the ring', () => {
    mockReducedMotion()
    useAppStore.setState({ dailyHistory: { [todayKey()]: day(30) } })
    const { container } = render(<JourneyHero />)

    act(() => { useAppStore.getState().setDayMinutes(todayKey(), 60) })
    expect(container.querySelector('.ring-pulse')).toBeNull()
    // the day is still consumed — switching motion prefs later must not re-fire
    expect(useAppStore.getState().goalCelebratedOn).toBe(todayKey())
  })
})

describe('JourneyHero — smart empty states', () => {
  it('no exam date → a real focusable CTA button (no hollow number), which opens the date modal', async () => {
    useAppStore.setState({ examDate: '' })
    render(<JourneyHero />)

    // No value-mode ring at all…
    expect(screen.queryByRole('img', { name: /جاهزية/ })).not.toBeInTheDocument()

    // …but a genuine <button> with an accessible name, keyboard-reachable
    const btn = screen.getByRole('button', { name: /حدّد موعد امتحانك/ })
    expect(btn.tagName).toBe('BUTTON')
    btn.focus()
    expect(btn).toHaveFocus()

    fireEvent.click(btn)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('brand-new user (date set, nothing measured yet) → CTA into the first exam simulation', () => {
    useAppStore.setState({ skill: skillAt(0) })
    render(<JourneyHero />)

    expect(screen.queryByRole('img', { name: /جاهزية/ })).not.toBeInTheDocument()
    const btn = screen.getByRole('button', { name: /أول محاكاة امتحان/ })
    fireEvent.click(btn)
    expect(useAppStore.getState().activeTab).toBe('exam')
  })
})
