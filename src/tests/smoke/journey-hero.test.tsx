import { render, screen } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { JourneyHero } from '@/components/hero/JourneyHero'

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
