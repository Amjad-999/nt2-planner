/**
 * Smoke tests for the ExamCountdowns dashboard section — renders from the real
 * store, exercises the pass toggle, and guards the editor-reset fix (passing an
 * exam whose date editor was open must not leave the editor able to reopen).
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import { ExamCountdowns } from '@/components/ExamCountdowns'
import { useAppStore } from '@/store/useAppStore'
import { defaultState } from '@/store/migration'

beforeEach(() => {
  localStorage.clear()
  // reset just the exam slice to the 5 canonical defaults
  useAppStore.setState({ inburgeringExams: defaultState().inburgeringExams })
})

describe('ExamCountdowns', () => {
  it('renders the 5 exams with their default day counts', () => {
    render(<ExamCountdowns />)
    for (const name of ['Lezen', 'Luisteren', 'Schrijven', 'Spreken', 'KNM']) {
      expect(screen.getByText(name)).toBeInTheDocument()
    }
    expect(screen.getByText('57')).toBeInTheDocument()
    expect(screen.getByText('25')).toBeInTheDocument()
  })

  it('marking an exam passed swaps to the success state and disables editing', () => {
    render(<ExamCountdowns />)
    fireEvent.click(screen.getByRole('button', { name: 'تحديد نجاح Lezen' }))

    expect(screen.getByText(/تمّ النجاح/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تعديل تاريخ امتحان Lezen' })).toBeDisabled()
    // toggle exists in the un-pass direction now
    expect(screen.getByRole('button', { name: 'إلغاء نجاح Lezen' })).toBeInTheDocument()
  })

  it('un-marking restores the counter', () => {
    render(<ExamCountdowns />)
    fireEvent.click(screen.getByRole('button', { name: 'تحديد نجاح Lezen' }))
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء نجاح Lezen' }))

    expect(screen.getByText('57')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'تعديل تاريخ امتحان Lezen' })).not.toBeDisabled()
  })

  it('does not reopen the date editor after passing then un-passing (regression)', () => {
    render(<ExamCountdowns />)
    // open the date editor
    fireEvent.click(screen.getByRole('button', { name: 'تعديل تاريخ امتحان Lezen' }))
    expect(screen.getByLabelText('تاريخ امتحان Lezen')).toBeInTheDocument()

    // pass while the editor is open — editor must close
    fireEvent.click(screen.getByRole('button', { name: 'تحديد نجاح Lezen' }))
    expect(screen.queryByLabelText('تاريخ امتحان Lezen')).not.toBeInTheDocument()

    // un-pass — editor must STAY closed (the editingId was cleared on pass)
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء نجاح Lezen' }))
    expect(screen.queryByLabelText('تاريخ امتحان Lezen')).not.toBeInTheDocument()
  })

  it('persists a passed exam to the store', () => {
    render(<ExamCountdowns />)
    fireEvent.click(screen.getByRole('button', { name: 'تحديد نجاح Spreken' }))
    const spreken = useAppStore.getState().inburgeringExams.find((e) => e.id === 'spreken')
    expect(spreken!.passed).toBe(true)
  })
})
