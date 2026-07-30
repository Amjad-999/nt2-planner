import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TodayFocus } from '@/components/dashboard/TodayFocus'
import { QuoteTicker } from '@/components/dashboard/QuoteTicker'
import { useAppStore } from '@/store/useAppStore'
import { QUOTES } from '@/data/dutchQuotes'

const skillAt = (best: Record<string, number>) => ({
  reading: { best: best.reading ?? 0, attempts: 0, history: [] as { date: string; score: number }[] },
  listening: { best: best.listening ?? 0, attempts: 0, history: [] as { date: string; score: number }[] },
  writing: { best: best.writing ?? 0, attempts: 0, history: [] as { date: string; score: number }[] },
  speaking: { best: best.speaking ?? 0, attempts: 0, history: [] as { date: string; score: number }[] },
})

beforeEach(() => {
  useAppStore.setState({
    vocab: [],
    skill: skillAt({ reading: 70, listening: 40, writing: 80, speaking: 90 }),
    activeTab: 'dashboard',
  })
})

describe('TodayFocus — the landing view surfaces real exam-prep content', () => {
  it("names today's recommended skill in Dutch and Arabic, and routes to its exercises", () => {
    render(<TodayFocus onStartSession={() => {}} />)

    // listening is the weakest (40) → Luisteren
    expect(screen.getByText('Luisteren · الاستماع')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /مهارة اليوم/ }))
    expect(useAppStore.getState().activeTab).toBe('exercises')
  })

  it('counts vocabulary actually due for review, and says so plainly when none is', () => {
    render(<TodayFocus onStartSession={() => {}} />)
    expect(screen.getByText('لا شيء الآن')).toBeInTheDocument()

    const past = Date.now() - 60_000
    useAppStore.setState({
      vocab: [
        { id: 'a', dutch: 'huis', arabic: 'بيت', example: '', level: 'B1', box: 1, due: past, reps: 1 },
        { id: 'b', dutch: 'boek', arabic: 'كتاب', example: '', level: 'B1', box: 1, due: past, reps: 1 },
        // Not due until tomorrow — must not be counted
        { id: 'c', dutch: 'tafel', arabic: 'طاولة', example: '', level: 'B1', box: 1, due: Date.now() + 86400000, reps: 1 },
        // Already learned — must not be counted
        { id: 'd', dutch: 'stoel', arabic: 'كرسي', example: '', level: 'B1', box: 5, due: past, reps: 9 },
      ],
    })
    render(<TodayFocus onStartSession={() => {}} />)
    expect(screen.getAllByText('2 كلمة').length).toBeGreaterThan(0)
  })

  it('shows the most recent mock score — and a CTA instead of a hollow zero when none exists', () => {
    render(<TodayFocus onStartSession={() => {}} />)
    expect(screen.getByText('لم تبدأ بعد')).toBeInTheDocument()
    expect(screen.queryByText('0%')).not.toBeInTheDocument()

    const s = skillAt({ reading: 70, listening: 40 })
    s.reading.history = [{ date: '2026-07-01', score: 55 }]
    // Later date wins even though reading's score is higher
    s.listening.history = [{ date: '2026-07-20', score: 48 }]
    useAppStore.setState({ skill: s })

    // Second render of the same test — assert with getAllBy since the first
    // tree is still mounted (RTL only auto-cleans between tests).
    render(<TodayFocus onStartSession={() => {}} />)
    expect(screen.getAllByText('48%').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Luisteren · 2026-07-20').length).toBeGreaterThan(0)
  })

  it('offers the primary session CTA plus quick links to grammar and the exam simulator', () => {
    const onStart = vi.fn()
    render(<TodayFocus onStartSession={onStart} />)

    fireEvent.click(screen.getByRole('button', { name: /ابدأ جلسة اليوم/ }))
    expect(onStart).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: /القواعد/ }))
    expect(useAppStore.getState().activeTab).toBe('grammar')

    fireEvent.click(screen.getByRole('button', { name: 'محاكاة الامتحان' }))
    expect(useAppStore.getState().activeTab).toBe('exam')
  })

  it('every interactive target clears the 44px minimum', () => {
    render(<TodayFocus onStartSession={() => {}} />)
    for (const btn of screen.getAllByRole('button')) {
      expect(parseInt(String(btn.style.minHeight))).toBeGreaterThanOrEqual(44)
    }
  })
})

describe('QuoteTicker', () => {
  it('shows a Dutch proverb with its Arabic gloss and advances on a real button press', async () => {
    const { container } = render(<QuoteTicker />)
    // AnimatePresence mode="wait" keeps the outgoing quote mounted until its
    // exit finishes, so read the LAST one rather than the first.
    const dutch = () => {
      const all = container.querySelectorAll('[lang="nl"]')
      return all[all.length - 1]?.textContent
    }

    const before = dutch()
    expect(before).toBeTruthy()
    // Rotation must never be the ONLY way forward — there is a real button.
    fireEvent.click(screen.getByRole('button', { name: 'اعرض الحكمة التالية' }))
    await waitFor(() => expect(dutch()).not.toBe(before))
  })

  it('uses formal Dutch only — never the informal je/jij/jouw', () => {
    for (const q of QUOTES) {
      expect(q.nl).not.toMatch(/\b(je|jij|jouw|jou)\b/i)
    }
  })
})
