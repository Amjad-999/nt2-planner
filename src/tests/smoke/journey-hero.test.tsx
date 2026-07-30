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
    // Pinned so no earlier case can leak it and auto-open the date picker.
    onboarded: false,
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

  it('shows the exam countdown ring and every stat the hero carries', () => {
    render(<JourneyHero />)

    // The ring is a real button (it opens the date picker) and names both the
    // days remaining and the share of the study timeline already spent.
    expect(screen.getByRole('button', { name: /متبقٍ 30 يوم على امتحان NT2/ })).toBeInTheDocument()

    for (const label of ['مواظبة', 'درست', 'اليوم', 'جاهزية', 'يوم', 'تقدمك اليومي']) {
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
    expect(screen.getByRole('button', { name: /متبقٍ 30 يوم على امتحان NT2/ })).toBeInTheDocument()
    for (const label of ['مواظبة', 'درست', 'اليوم', 'جاهزية', 'يوم', 'تقدمك اليومي']) {
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
  it('no exam date → a real focusable CTA button (no invented countdown), which opens the date modal', async () => {
    // `onboarded: false` keeps the ring's own first-visit auto-open out of the
    // way so this asserts the CLICK path, not the automatic one.
    useAppStore.setState({ examDate: '', onboarded: false })
    render(<JourneyHero />)

    // Nothing counts down, and the button carries no digits at all — the app
    // never shows a number the user did not choose.
    const btn = screen.getByRole('button', { name: /حدّد موعد امتحانك/ })
    expect(btn.tagName).toBe('BUTTON')
    expect(btn.textContent).not.toMatch(/[0-9]/)
    btn.focus()
    expect(btn).toHaveFocus()

    fireEvent.click(btn)
    expect(await screen.findByRole('dialog')).toBeInTheDocument()
  })

  it('brand-new user (nothing measured yet) → the readiness stat shows a dash, never a hollow zero', () => {
    useAppStore.setState({ skill: skillAt(0) })
    render(<JourneyHero />)

    expect(screen.getByText('جاهزية')).toBeInTheDocument()
    // A dash, not "0%" — nothing was measured, so there is nothing to score.
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})

describe('JourneyHero — three store states', () => {
  it('(a) empty store: CTA button renders and no countdown number is invented', () => {
    useAppStore.setState({
      examDate: '', onboarded: false, dailyHistory: {}, skill: skillAt(0), streak: { count: 0, last: '' },
    })
    render(<JourneyHero />)

    const btn = screen.getByRole('button', { name: /حدّد موعد امتحانك/ })
    expect(btn).toBeInTheDocument()
    // No days-left figure anywhere, and the CTA itself carries no digits
    expect(screen.queryByText('حتى الامتحان')).not.toBeInTheDocument()
    expect(btn.textContent).not.toMatch(/[0-9]/)
  })

  it('(b) mid-journey: days-left, streak, minutes and plan position render with exact values', () => {
    const now = Date.now()
    useAppStore.setState({
      examDate: new Date(now + 10 * 86400000).toISOString(),   // ceil → 10 days left
      planStart: new Date(now - 2 * 86400000).toISOString(),   // round → day 3 of 12
      streak: { count: 7, last: todayKey() },
      dailyHistory: { [todayKey()]: day(25) },                 // 25/60 → bar 42%
      skill: skillAt(60),                                      // ring 60%
    })
    render(<JourneyHero />)

    expect(screen.getAllByText('10').length).toBeGreaterThan(0)    // المتبقّي (حلقة العدّ)
    expect(screen.getAllByText('7').length).toBeGreaterThan(0)     // مواظبة
    expect(screen.getAllByText('25د').length).toBeGreaterThan(0)   // درست اليوم
    expect(screen.getAllByText('3/12').length).toBeGreaterThan(0)  // اليوم / الخطة
    expect(screen.getAllByText('60%').length).toBeGreaterThan(0)   // جاهزية
    expect(screen.getAllByText('42%').length).toBeGreaterThan(0)   // تقدم اليوم
  })

  it('(c) goal met: bar saturates at 100% and the day is consumed without a first-paint celebration', () => {
    useAppStore.setState({ dailyHistory: { [todayKey()]: day(75) } })  // 75 ≥ 60
    render(<JourneyHero />)

    expect(screen.getAllByText('100%').length).toBeGreaterThan(0)
    expect(celebrate).not.toHaveBeenCalled()
    expect(useAppStore.getState().goalCelebratedOn).toBe(todayKey())
  })

  it('remount after a fired celebration does not re-fire (flag persisted in the store)', () => {
    useAppStore.setState({ dailyHistory: { [todayKey()]: day(30) } })
    const first = render(<JourneyHero />)
    act(() => { useAppStore.getState().setDayMinutes(todayKey(), 60) })
    expect(celebrate).toHaveBeenCalledTimes(1)

    first.unmount()
    render(<JourneyHero />)
    expect(celebrate).toHaveBeenCalledTimes(1)
  })
})
