import { readFileSync } from 'node:fs'
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

  it('is actually visible — nothing in the icon chain is left at opacity 0', () => {
    // Regression: the icon used to mount with the entrance variant's
    // {opacity:0, scale:0} and never animate in, so it existed in the DOM but
    // was invisible on screen. Entrance is CSS now, and NO element from the
    // stage down to the button may carry an inline opacity of 0 at rest.
    const { container } = render(<Mascot />)
    const btn = screen.getByRole('button', { name: new RegExp(`${MASCOT_NAME_AR} — اضغط`) })
    const stage = screen.getByTestId('mascot-stage')

    for (const el of [stage, stage.querySelector('.mascot-3d')!, btn]) {
      const o = (el as HTMLElement).style.opacity
      expect(o === '' || Number(o) > 0).toBe(true)
    }
    expect(btn.querySelector('.mascot-orb')).not.toBeNull()
    expect(container.querySelector('.mascot-photo')).not.toBeNull()
  })

  it('never hides the icon behind an animation frame that may never run', () => {
    // The entrance is CSS and must animate transform ONLY. If it owned opacity,
    // a frozen animation clock (background tab, throttled device, a preview
    // that is not compositing) would leave the icon stuck on its first
    // keyframe — i.e. invisible again. Worst case must be "smaller", not "gone".
    // Read from the repo root (vitest's cwd) — vitest stubs CSS imports to '',
    // so the stylesheet has to be read as a plain file to be asserted on.
    const css = readFileSync('src/styles/globals.css', 'utf8')
    const popKeyframes = /@keyframes mascot-pop\s*\{([\s\S]*?)^\}/m.exec(css)?.[1] ?? ''
    expect(popKeyframes).not.toBe('')
    expect(popKeyframes).not.toMatch(/opacity/)
  })

  it('renders the real portrait, and keeps a drawn fallback if it fails to load', () => {
    const { container } = render(<Mascot />)
    const img = container.querySelector('.mascot-photo') as HTMLImageElement
    expect(img.getAttribute('src')).toBe('/images/cartoon-cat.jpg')
    // A missing asset must degrade to the drawn cat, never to an empty icon
    fireEvent.error(img)
    expect(container.querySelector('.mascot-photo')).toBeNull()
    expect(container.querySelector('.mascot-orb svg')).not.toBeNull()
  })

  it('mounts a real 3D stage (perspective + preserve-3d), not a flat slide', () => {
    render(<Mascot />)
    const stage = screen.getByTestId('mascot-stage')
    expect(stage.style.perspective).toBe('1000px')
    const layer = stage.querySelector('.mascot-3d') as HTMLElement
    expect(layer.style.transformStyle).toBe('preserve-3d')
  })

  it('performs a quick duty on click instead of only opening a menu', () => {
    render(<Mascot />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${MASCOT_NAME_AR} — اضغط`) }))
    // A duty always speaks — the bubble is a live region
    expect(screen.getByRole('status')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('reaches the full panel from the bubble, with a working close button', () => {
    render(<Mascot />)
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${MASCOT_NAME_AR} — اضغط`) }))
    fireEvent.click(screen.getByRole('button', { name: /كل ما أستطيع فعله/ }))
    expect(screen.getByRole('dialog', { name: new RegExp(MASCOT_NAME_AR) })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  function openPanel() {
    fireEvent.click(screen.getByRole('button', { name: new RegExp(`${MASCOT_NAME_AR} — اضغط`) }))
    fireEvent.click(screen.getByRole('button', { name: /كل ما أستطيع فعله/ }))
  }

  it('shows the app guide inside the panel', () => {
    render(<Mascot />)
    openPanel()
    fireEvent.click(screen.getByRole('button', { name: /دليل التطبيق/ }))
    expect(screen.getByText('محاكاة الامتحان')).toBeInTheDocument()
    // «رجوع» returns to the menu
    fireEvent.click(screen.getByRole('button', { name: 'رجوع' }))
    expect(screen.getByRole('button', { name: /نكتة هولندية/ })).toBeInTheDocument()
  })

  it('shows a Dutch joke with its Arabic translation', () => {
    render(<Mascot />)
    openPanel()
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
