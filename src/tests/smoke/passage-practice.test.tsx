import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { PassagePractice } from '@/components/exam/PassagePractice'
import type { ExamReadingItem, ExamListeningItem } from '@/store/types'

/**
 * Exam practice, one passage at a time.
 *
 * The three properties that make it practice rather than a wall of text: a
 * library that says where the learner stands, one honest try per question
 * (the answer cannot be swapped once the correct one lights up), and a
 * listening transcript that stays shut until the questions are answered.
 */

const reading: ExamReadingItem[] = [
  {
    id: 'r1', title: 'Bericht van de school', ar: 'رسالة من المدرسة',
    text: 'Beste ouders,\n\nOp vrijdag is de school gesloten.',
    questions: [
      { q: 'Wanneer is de school gesloten?', ar: 'متى تُغلق المدرسة؟', opts: ['Op maandag', 'Op vrijdag', 'Op zondag'], correct: 1, why: 'يذكر النصّ يوم الجمعة صراحةً.' },
      { q: 'Voor wie is het bericht?', ar: 'لمن الرسالة؟', opts: ['Voor ouders', 'Voor de gemeente', 'Voor de huisarts'], correct: 0, why: 'الرسالة تبدأ بـ Beste ouders.' },
    ],
  },
]

const listening: ExamListeningItem[] = [
  {
    id: 'l1', title: 'Een afspraak verzetten', ar: 'تأجيل موعد',
    transcript: 'Medewerker: Goedemorgen, waarmee kan ik u helpen?',
    questions: [
      { q: 'Wie belt er?', ar: 'من المتّصل؟', opts: ['Een klant', 'Een arts'], correct: 0 },
    ],
  },
]

describe('PassagePractice — the library', () => {
  it('shows what is unstarted, half done and finished, and points at the next one', () => {
    render(<PassagePractice kind="reading" items={reading} answers={{ r1: { 0: 1 } }} onAnswer={() => {}} onReset={() => {}} />)
    expect(screen.getByText(/أجبت 1 من 2/)).toBeInTheDocument()
    expect(screen.getByText('التالي')).toBeInTheDocument()
  })

  it('opens one passage, with its Dutch text and a question count', () => {
    render(<PassagePractice kind="reading" items={reading} answers={{}} onAnswer={() => {}} onReset={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Bericht van de school/ }))
    expect(screen.getByText(/Op vrijdag is de school gesloten/)).toBeInTheDocument()
    expect(screen.getByText(/النصّ 1 من 1/)).toBeInTheDocument()
  })
})

describe('PassagePractice — one honest try', () => {
  it('reports the answer and then locks the question', () => {
    const onAnswer = vi.fn()
    render(<PassagePractice kind="reading" items={reading} answers={{ r1: { 0: 0 } }} onAnswer={onAnswer} onReset={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Bericht van de school/ }))

    // question 1 was answered wrongly: the correct option is shown, and every
    // option of that question is now disabled
    expect(screen.getByText(/الإجابة الصحيحة: B/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Op vrijdag/ })).toBeDisabled()
    expect(screen.getByText('يذكر النصّ يوم الجمعة صراحةً.')).toBeInTheDocument()

    // question 2 is untouched and still answerable
    fireEvent.click(screen.getByRole('button', { name: /Voor ouders/ }))
    expect(onAnswer).toHaveBeenCalledWith('r1', 1, 0, reading[0].questions)
  })

  it('reports the score once every question is answered', () => {
    render(<PassagePractice kind="reading" items={reading} answers={{ r1: { 0: 1, 1: 0 } }} onAnswer={() => {}} onReset={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Bericht van de school/ }))
    expect(screen.getByText(/النتيجة: 2 من 2/)).toBeInTheDocument()
  })
})

describe('PassagePractice — listening', () => {
  it('keeps the transcript shut until the questions are answered', () => {
    const { rerender } = render(<PassagePractice kind="listening" items={listening} answers={{}} onAnswer={() => {}} onReset={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Een afspraak verzetten/ }))
    expect(screen.getByText(/النصّ المكتوب يُفتح بعد أن تجيب/)).toBeInTheDocument()
    expect(screen.queryByText(/waarmee kan ik u helpen/)).not.toBeInTheDocument()

    rerender(<PassagePractice kind="listening" items={listening} answers={{ l1: { 0: 0 } }} onAnswer={() => {}} onReset={() => {}} />)
    expect(screen.getByText(/waarmee kan ik u helpen/)).toBeInTheDocument()
  })

  it('offers audio and a slower speed', () => {
    render(<PassagePractice kind="listening" items={listening} answers={{}} onAnswer={() => {}} onReset={() => {}} />)
    fireEvent.click(screen.getByRole('button', { name: /Een afspraak verzetten/ }))
    expect(screen.getByRole('button', { name: /استمع إلى التسجيل/ })).toBeInTheDocument()
    expect(screen.getByRole('group', { name: 'سرعة الصوت' })).toBeInTheDocument()
  })
})
