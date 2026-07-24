import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { Mascot } from '@/components/mascot/Mascot'
import { useAppStore } from '@/store/useAppStore'
import { MASCOT_NAME_AR } from '@/data/mascotDialogs'

describe('Mascot', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      focusMode: false, mascotDismissed: false, name: '', streak: { count: 0, last: '' },
      dailyHistory: {}, unlockedBadges: [], inburgeringExams: [],
    })
  })

  it('renders the character by default', () => {
    render(<Mascot />)
    expect(screen.getByRole('button', { name: new RegExp(MASCOT_NAME_AR) })).toBeInTheDocument()
  })

  it('is hidden entirely in Focus Mode', () => {
    useAppStore.setState({ focusMode: true })
    render(<Mascot />)
    expect(screen.queryByRole('button', { name: new RegExp(MASCOT_NAME_AR) })).not.toBeInTheDocument()
  })

  it('is hidden once permanently dismissed', () => {
    useAppStore.setState({ mascotDismissed: true })
    render(<Mascot />)
    expect(screen.queryByRole('button', { name: new RegExp(MASCOT_NAME_AR) })).not.toBeInTheDocument()
  })

  it('opens a dialog bubble on click, with a working close button', () => {
    render(<Mascot />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(MASCOT_NAME_AR) }))
    expect(screen.getByRole('status')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('greets a named user by name on mount', async () => {
    useAppStore.setState({ name: 'سارة' })
    render(<Mascot />)
    // The greeting types out character-by-character (see MascotBubble's
    // typed-text effect) — wait for it to finish rather than racing it.
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('سارة'), { timeout: 5000 })
  }, 10000)
})
