/**
 * Smoke tests: all 3 exercise modes with EMPTY data.
 * Verifies no crash and that graceful empty-state renders.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

// These mocks are hoisted — they run before Exercises.tsx is imported,
// so module-level constants (SORT_SENTENCES, THEMA_WORDS) see empty arrays.
vi.mock('@/data/examContent', () => ({ EXAM_SPEAKING: [] }))
vi.mock('@/data/themas', () => ({ B1_THEMAS: [] }))
vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: { vocab: [] }) => unknown) => sel({ vocab: [] }),
}))

// Lazy import AFTER mocks are set up
const ExercisesModule = await import('@/sections/Exercises')
const Exercises = ExercisesModule.default

describe('Exercises — empty data', () => {
  it('matching mode renders without crashing', () => {
    const { container } = render(<Exercises />)
    // Should render the mode tabs and matching exercise area
    expect(container.querySelector('[role="tablist"]')).toBeTruthy()
    // Matching exercise renders even with 0 words (empty grid)
    expect(screen.getByText(/المطابقة/)).toBeInTheDocument()
  })

  it('sorting mode shows graceful empty state — no crash', () => {
    render(<Exercises />)
    fireEvent.click(screen.getByRole('tab', { name: /ترتيب الجملة/i }))
    // SORT_SENTENCES is [] so SortingExercise must render the empty-state div
    // (renders in all 3 panels; getAllByText avoids "multiple elements" error)
    expect(screen.getAllByText(/لا توجد جمل للتدريب/).length).toBeGreaterThan(0)
  })

  it('fill-the-gap mode shows graceful empty state — no crash', () => {
    render(<Exercises />)
    fireEvent.click(screen.getByRole('tab', { name: /ملء الفراغ/i }))
    // buildGap returns null → empty-state message
    expect(screen.getAllByText(/أضف مفردات مع جمل أمثلة/).length).toBeGreaterThan(0)
  })
})
