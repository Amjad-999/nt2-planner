/**
 * A11y tests for the shared modal <Overlay> focus management:
 * initial focus into the dialog, Escape to close, Tab/Shift+Tab focus trap,
 * and focus restoration to the trigger on close.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { Overlay } from '@/components/SettingsModal'

function renderOverlay(onClose = vi.fn()) {
  const trigger = document.createElement('button')
  document.body.appendChild(trigger)
  trigger.focus()
  const utils = render(
    <Overlay onClose={onClose} label="اختبار">
      <button>أول</button>
      <button>وسط</button>
      <button>آخر</button>
    </Overlay>,
  )
  const panel = screen.getByRole('dialog').querySelector('[tabindex="-1"]') as HTMLElement
  return { trigger, onClose, panel, ...utils }
}

afterEach(() => {
  document.querySelectorAll('body > button').forEach((b) => b.remove())
})

describe('Overlay — focus management', () => {
  it('moves focus into the dialog panel on open', () => {
    const { panel } = renderOverlay()
    expect(document.activeElement).toBe(panel)
  })

  it('closes on Escape', () => {
    const { onClose } = renderOverlay()
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('traps Tab: from the last focusable it wraps to the first', () => {
    renderOverlay()
    const first = screen.getByText('أول')
    const last = screen.getByText('آخر')
    last.focus()
    fireEvent.keyDown(document, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
  })

  it('traps Shift+Tab: from the first focusable it wraps to the last', () => {
    renderOverlay()
    const first = screen.getByText('أول')
    const last = screen.getByText('آخر')
    first.focus()
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })

  it('restores focus to the trigger on close', () => {
    const { trigger, unmount } = renderOverlay()
    expect(document.activeElement).not.toBe(trigger)  // focus moved into the dialog
    unmount()
    expect(document.activeElement).toBe(trigger)
  })
})
