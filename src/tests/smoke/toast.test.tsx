/**
 * A11y tests for Toast: a keyboard-focusable close button dismisses the toast,
 * and toasts still auto-dismiss on their own timer.
 */
import { render, screen, fireEvent, act } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { ToastHost, toast } from '@/components/Toast'

afterEach(() => {
  // flush any pending toast timers, then restore real timers
  try { act(() => { vi.advanceTimersByTime(5000) }) } catch { /* real timers */ }
  vi.useRealTimers()
})

describe('Toast', () => {
  it('renders a keyboard-accessible close button that dismisses the toast', () => {
    vi.useFakeTimers()
    render(<ToastHost />)
    act(() => { toast('حُفظت الإعدادات') })

    expect(screen.getByText('حُفظت الإعدادات')).toBeInTheDocument()
    const close = screen.getByRole('button', { name: 'إغلاق التنبيه' })
    expect(close).toBeInTheDocument()

    fireEvent.click(close)
    act(() => { vi.advanceTimersByTime(300) })  // leave animation (240ms) → drop
    expect(screen.queryByText('حُفظت الإعدادات')).not.toBeInTheDocument()
  })

  it('auto-dismisses after ~3s without interaction', () => {
    vi.useFakeTimers()
    render(<ToastHost />)
    act(() => { toast('اختفِ تلقائيًّا') })
    expect(screen.getByText('اختفِ تلقائيًّا')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(3000 + 300) })
    expect(screen.queryByText('اختفِ تلقائيًّا')).not.toBeInTheDocument()
  })

  it('announces via an aria-live region', () => {
    vi.useFakeTimers()
    const { container } = render(<ToastHost />)
    act(() => { toast('رسالة') })
    const live = container.querySelector('[aria-live="polite"]')
    expect(live).toBeTruthy()
    expect(live!.textContent).toContain('رسالة')
  })
})
