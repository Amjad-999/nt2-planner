import { useState } from 'react'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { FlashCard } from '@/components/FlashCard'
import { speakDutch } from '@/features/tts/speakDutch'
import type { VocabWord } from '@/store/types'

vi.mock('@/hooks/useWordDetail', () => ({ useWordDetail: () => null }))
vi.mock('@/hooks/useReducedMotion', () => ({ useReducedMotion: () => true }))
vi.mock('@/features/vocab/fsrs', () => ({}))
vi.mock('@/features/tts/speakDutch', () => ({ speakDutch: vi.fn().mockResolvedValue(undefined) }))

const words: VocabWord[] = ['de afspraak', 'het station', 'de huisarts'].map((dutch, index) => ({
  id: `word-${index}`, dutch, arabic: ['الموعد', 'المحطة', 'طبيب الأسرة'][index],
  example: 'U heeft morgen een afspraak.', level: 'B1', box: 0, due: 0, reps: 0,
}))

afterEach(() => { cleanup(); vi.clearAllMocks(); vi.useRealTimers() })

async function revealAndGrade() {
  fireEvent.click(screen.getByRole('button', { name: 'إظهار المعنى' }))
  fireEvent.click(screen.getByRole('button', { name: /عرفتها/ }))
  await screen.findByRole('button', { name: 'التالي فوراً' })
}

describe('FlashCard session integrity', () => {
  it('reviews every original word when grading shrinks the due queue, then shows completion', async () => {
    const graded: string[] = []
    const done = vi.fn()
    function DueQueue() {
      const [queue, setQueue] = useState(words)
      return <FlashCard queue={queue} onDone={done} onGrade={(id) => {
        graded.push(id)
        setQueue((current) => current.filter((word) => word.id !== id))
        return 3
      }} />
    }
    render(<DueQueue />)
    for (const word of words) {
      expect(screen.getByRole('heading', { name: word.dutch })).toBeInTheDocument()
      await revealAndGrade()
      fireEvent.click(screen.getByRole('button', { name: 'التالي فوراً' }))
    }
    expect(graded).toEqual(words.map((word) => word.id))
    expect(screen.getByRole('heading', { name: 'اكتملت المراجعة' })).toBeInTheDocument()
    expect(done).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'العودة إلى الكلمات' }))
    expect(done).toHaveBeenCalledOnce()
  })

  it('keeps the answer available after a failed grade and allows retry', async () => {
    const grade = vi.fn().mockRejectedValueOnce(new Error('chunk unavailable')).mockResolvedValue(2)
    render(<FlashCard queue={words} onGrade={grade} onDone={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'إظهار المعنى' }))
    fireEvent.click(screen.getByRole('button', { name: /عرفتها/ }))
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر حفظ التقييم')
    expect(screen.getByText('الموعد')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /عرفتها/ }))
    await screen.findByRole('button', { name: 'التالي فوراً' })
    expect(grade.mock.calls).toEqual([['word-0', 2], ['word-0', 2]])
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('blocks repeated ratings while a grade is pending', async () => {
    let resolveGrade!: (days: number) => void
    const grade = vi.fn(() => new Promise<number>((resolve) => { resolveGrade = resolve }))
    render(<FlashCard queue={words} onGrade={grade} onDone={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'إظهار المعنى' }))
    const rating = screen.getByRole('button', { name: /عرفتها/ })
    fireEvent.click(rating)
    fireEvent.click(rating)
    expect(rating).toBeDisabled()
    expect(grade).toHaveBeenCalledOnce()
    await act(async () => { resolveGrade(1) })
  })

  it('does not exit a later screen when a pending automatic advance is unmounted', async () => {
    vi.useFakeTimers()
    const done = vi.fn()
    const page = render(<FlashCard queue={[words[0]]} onGrade={() => 1} onDone={done} />)
    fireEvent.click(screen.getByRole('button', { name: 'إظهار المعنى' }))
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: /عرفتها/ })) })
    page.unmount()
    act(() => { vi.advanceTimersByTime(2000) })
    expect(done).not.toHaveBeenCalled()
  })

  it('keeps meaning hidden until reveal and isolates Dutch and Arabic directions', () => {
    render(<FlashCard queue={words} onGrade={() => 1} onDone={vi.fn()} />)
    expect(screen.queryByText('الموعد')).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: words[0].dutch })).toHaveAttribute('dir', 'ltr')
    fireEvent.click(screen.getByRole('button', { name: 'إظهار المعنى' }))
    expect(screen.getByText('الموعد')).toHaveAttribute('dir', 'rtl')
    expect(screen.getByText(words[0].example)).toHaveAttribute('lang', 'nl')
  })

  it('shows an actionable audio failure without blocking the review', async () => {
    vi.mocked(speakDutch).mockImplementationOnce(async (_text, _button, options) => { options?.onError?.() })
    render(<FlashCard queue={words} onGrade={() => 1} onDone={vi.fn()} />)
    fireEvent.click(screen.getByRole('button', { name: 'استمع إلى الكلمة' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('تعذّر تشغيل الصوت')
    expect(screen.getByRole('button', { name: 'إظهار المعنى' })).toBeEnabled()
  })
})
