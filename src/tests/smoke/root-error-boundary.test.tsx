import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { RootErrorBoundary } from '@/components/RootErrorBoundary'

/**
 * Regression guard: chrome outside the active section (top bar, tabs, modals,
 * mascot) had no boundary, so a throw there produced a blank page. This asserts
 * the recovery screen appears AND that it protects unsynced local progress.
 */

function Boom(): never {
  throw new Error('top bar exploded')
}

let consoleError: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  localStorage.clear()
  // React logs the caught error; keep the test output readable.
  consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  consoleError.mockRestore()
  vi.restoreAllMocks()
})

describe('RootErrorBoundary', () => {
  it('renders children untouched while nothing throws', () => {
    render(
      <RootErrorBoundary>
        <p>محتوى التطبيق</p>
      </RootErrorBoundary>,
    )
    expect(screen.getByText('محتوى التطبيق')).toBeInTheDocument()
  })

  it('replaces a white screen with an announced recovery screen', () => {
    render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    )

    const alert = screen.getByRole('alert')
    expect(alert).toBeInTheDocument()
    expect(screen.getByText('توقّف التطبيق عن العمل')).toBeInTheDocument()
    // The failure reason stays visible instead of being swallowed.
    expect(screen.getByText(/top bar exploded/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /أعِد تشغيل التطبيق/ })).toBeInTheDocument()
  })

  it('offers a download of local progress when there is progress to lose', () => {
    localStorage.setItem('nt2planner_v6', JSON.stringify({ state: { studySec: 4200 } }))

    render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    )

    const save = screen.getByRole('button', { name: /نزّل نسخة من بياناتي/ })

    const createObjectURL = vi.fn(() => 'blob:stub')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    fireEvent.click(save)

    expect(createObjectURL).toHaveBeenCalledOnce()
    expect(click).toHaveBeenCalledOnce()
    // The object URL must not be leaked.
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:stub')
  })

  it('hides the download button when there is nothing stored to rescue', () => {
    render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    )
    expect(screen.queryByRole('button', { name: /نزّل نسخة من بياناتي/ })).not.toBeInTheDocument()
  })
})
