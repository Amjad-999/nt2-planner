/**
 * Smoke tests: all 3 exercise modes with NORMAL (populated) data.
 * Verifies no crash and that exercise UI renders.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'

const MOCK_VOCAB = [
  { dutch: 'hallo',   arabic: 'مرحبا',    example: 'Ik zeg hallo tegen iedereen.' },
  { dutch: 'fiets',   arabic: 'دراجة',    example: 'Ik rij elke dag op mijn fiets.' },
  { dutch: 'school',  arabic: 'مدرسة',    example: 'De kinderen gaan naar school.' },
  { dutch: 'water',   arabic: 'ماء',      example: 'Ik drink elke dag veel water.' },
  { dutch: 'boek',    arabic: 'كتاب',     example: 'Dit is een interessant boek.' },
]

// 6-word sentence — passes the 5..12 word filter in Exercises.tsx
const VALID_SENTENCE = 'Ik ga elke dag naar school.'

vi.mock('@/data/examContent', () => ({
  EXAM_SPEAKING: [
    {
      id: 'test-1',
      deel: 1,
      sec: 60,
      ar: 'اختبار',
      situatieNl: 'test',
      taakNl: 'test',
      voorbeeldNl: VALID_SENTENCE,
      situatieAr: 'test',
      taakAr: 'test',
    },
  ],
}))
vi.mock('@/data/themas', () => ({ B1_THEMAS: [] }))
vi.mock('@/store/useAppStore', () => ({
  useAppStore: (sel: (s: { vocab: typeof MOCK_VOCAB }) => unknown) =>
    sel({ vocab: MOCK_VOCAB }),
}))

const ExercisesModule = await import('@/sections/Exercises')
const Exercises = ExercisesModule.default

describe('Exercises — normal data', () => {
  it('matching mode renders exercise UI without crashing', () => {
    render(<Exercises />)
    // Matching tab is active by default — shows NL/AR column headers
    // (exercise renders in all 3 panels; getAllByText avoids "multiple elements" error)
    expect(screen.getAllByText(/الكلمات الهولندية/).length).toBeGreaterThan(0)
    expect(screen.getAllByText(/المعاني العربية/).length).toBeGreaterThan(0)
  })

  it('sorting mode renders draggable word chips — no crash', () => {
    render(<Exercises />)
    fireEvent.click(screen.getByRole('tab', { name: /ترتيب الجملة/i }))
    // Instructions paragraph appears (may appear 3× — one per panel)
    expect(screen.getAllByText(/رتّب الكلمات/).length).toBeGreaterThan(0)
    // The shuffled words from the valid sentence appear as listitem elements
    const items = document.querySelectorAll('[role="listitem"]')
    expect(items.length).toBeGreaterThan(0)
  })

  it('fill-the-gap mode renders gapped sentence — no crash', () => {
    render(<Exercises />)
    fireEvent.click(screen.getByRole('tab', { name: /ملء الفراغ/i }))
    // Instructions paragraph appears
    expect(screen.getAllByText(/اسحب الكلمة الصحيحة/).length).toBeGreaterThan(0)
  })
})
