import { render, screen, fireEvent, within } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { NavTabs } from '@/components/NavTabs'
import { useAppStore } from '@/store/useAppStore'

beforeEach(() => useAppStore.setState({ activeTab: 'dashboard' }))

describe('grouped navigation', () => {
  it('reaches every section through visible controls', () => {
    render(<NavTabs />)
    const destinations = [
      ['الرئيسية', 'اليوم', 'dashboard'], ['الرئيسية', 'المصادر', 'resources'], ['الرئيسية', 'منصّتي', 'platform'],
      ['تعلّم', 'خطة الدراسة', 'plan'], ['تعلّم', 'مسار القواعد', 'grammar'], ['تعلّم', 'الكتب', 'books'],
      ['تدرّب', 'تدريب يومي', 'exercises'], ['تدرّب', 'مواقف يومية', 'situations'], ['تدرّب', 'تدريب الامتحان', 'exam'],
      ['المفردات', null, 'vocab'], ['تقدّمي', null, 'stats'],
    ]
    for (const [group, label, tab] of destinations) {
      fireEvent.click(screen.getByRole('button', { name: group! }))
      if (label) fireEvent.click(screen.getByRole('button', { name: label }))
      expect(useAppStore.getState().activeTab).toBe(tab)
      expect(document.getElementById(`ntab-${tab}`)).toHaveAttribute('aria-current', 'page')
    }
  })

  it('remembers a learning section but always returns Home to today', () => {
    render(<NavTabs />)
    fireEvent.click(screen.getByRole('button', { name: 'تعلّم' }))
    fireEvent.click(screen.getByRole('button', { name: 'مسار القواعد' }))
    fireEvent.click(screen.getByRole('button', { name: 'المفردات' }))
    fireEvent.click(screen.getByRole('button', { name: 'تعلّم' }))
    expect(useAppStore.getState().activeTab).toBe('grammar')
    fireEvent.click(screen.getByRole('button', { name: 'الرئيسية' }))
    fireEvent.click(screen.getByRole('button', { name: 'المصادر' }))
    fireEvent.click(screen.getByRole('button', { name: 'الرئيسية' }))
    expect(useAppStore.getState().activeTab).toBe('dashboard')
  })

  it('supports RTL arrows and Home/End without activating a different screen', () => {
    render(<NavTabs />)
    const buttons = within(screen.getByRole('navigation', { name: 'التنقّل الرئيسي' })).getAllByRole('button')
    buttons[0].focus()
    fireEvent.keyDown(buttons[0], { key: 'ArrowLeft' })
    expect(buttons[1]).toHaveFocus()
    fireEvent.keyDown(buttons[1], { key: 'End' })
    expect(buttons[4]).toHaveFocus()
    fireEvent.keyDown(buttons[4], { key: 'Home' })
    expect(buttons[0]).toHaveFocus()
    expect(useAppStore.getState().activeTab).toBe('dashboard')
  })
})
