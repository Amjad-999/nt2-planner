import { render, screen } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { SmartGreeting } from '@/components/SmartGreeting'
import { useAppStore } from '@/store/useAppStore'

afterEach(() => {
  vi.useRealTimers()
})

beforeEach(() => {
  useAppStore.setState({ examDate: '', dailyHistory: {} })
})

describe('SmartGreeting', () => {
  it('CRITICAL: no exam date set → the headline never invents "0 يوم متبقي"', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T08:00:00'))
    render(<SmartGreeting />)

    expect(screen.queryByText(/يوم متبقي/)).not.toBeInTheDocument()
    expect(screen.getAllByText(/حدّد موعد امتحانك/).length).toBeGreaterThan(0)
  })

  it('a real, near exam date still shows the real day count in the morning', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T08:00:00'))
    useAppStore.setState({ examDate: new Date(Date.now() + 3 * 86400000).toISOString() })
    render(<SmartGreeting />)

    expect(screen.getByText(/3 يوم فقط/)).toBeInTheDocument()
  })
})
