import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { Mascot } from '@/components/mascot/Mascot'
import { useAppStore } from '@/store/useAppStore'
import { MASCOT_NAME_AR } from '@/data/mascotDialogs'

describe('Mascot', () => {
  beforeEach(() => {
    localStorage.clear()
    useAppStore.setState({
      focusMode: false, mascotDismissed: false, botWordReminders: true, name: '',
      streak: { count: 0, last: '' },
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

  it('opens the help panel on click, with a working close button', () => {
    render(<Mascot />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(MASCOT_NAME_AR) }))
    expect(screen.getByRole('dialog', { name: new RegExp(MASCOT_NAME_AR) })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('shows the app guide inside the panel', () => {
    render(<Mascot />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(MASCOT_NAME_AR) }))
    fireEvent.click(screen.getByRole('button', { name: /دليل التطبيق/ }))
    expect(screen.getByText('محاكاة الامتحان')).toBeInTheDocument()
    // «رجوع» returns to the menu
    fireEvent.click(screen.getByRole('button', { name: 'رجوع' }))
    expect(screen.getByRole('button', { name: /نكتة هولندية/ })).toBeInTheDocument()
  })

  it('shows a Dutch joke with its Arabic translation', () => {
    render(<Mascot />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(MASCOT_NAME_AR) }))
    fireEvent.click(screen.getByRole('button', { name: /نكتة هولندية/ }))
    // Both the Dutch original (lang=nl) and an Arabic line render
    const panel = screen.getByRole('dialog', { name: new RegExp(MASCOT_NAME_AR) })
    expect(panel.querySelector('[lang="nl"]')).not.toBeNull()
    expect(screen.getByRole('button', { name: /نكتة أخرى/ })).toBeInTheDocument()
  })

  it('greets a named user by name on mount', async () => {
    useAppStore.setState({ name: 'سارة' })
    render(<Mascot />)
    // The greeting types out character-by-character (see MascotBubble's
    // typed-text effect) — wait for it to finish rather than racing it.
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('سارة'), { timeout: 5000 })
  }, 10000)
})
