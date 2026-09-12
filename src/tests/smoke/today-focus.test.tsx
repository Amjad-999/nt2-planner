import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { TodayFocus } from '@/components/dashboard/TodayFocus'
import { QuoteTicker } from '@/components/dashboard/QuoteTicker'
import { useAppStore } from '@/store/useAppStore'
import { QUOTES } from '@/data/dutchQuotes'
import { GRAMMAR_EXERCISES } from '@/data/grammarExercises'
import { peekNavIntent } from '@/lib/navIntent'
import { todayKey } from '@/lib/utils'

const skillAt = (best: Record<string, number>) => ({
  reading: { best: best.reading ?? 0, attempts: 0, history: [] as { date: string; score: number }[] },
  listening: { best: best.listening ?? 0, attempts: 0, history: [] as { date: string; score: number }[] },
  writing: { best: best.writing ?? 0, attempts: 0, history: [] as { date: string; score: number }[] },
  speaking: { best: best.speaking ?? 0, attempts: 0, history: [] as { date: string; score: number }[] },
})

const word = (due: number) => ({
  id: Math.random().toString(36).slice(2),
  dutch: 'huis', arabic: 'بيت', example: '', level: 'B1' as const, box: 1, due, reps: 1,
})

beforeEach(() => {
  useAppStore.setState({
    vocab: [],
    skill: skillAt({ reading: 70, listening: 40, writing: 80, speaking: 90 }),
    activeTab: 'dashboard',
    mockSession: null,
    grammarProgress: {},
    dailyHistory: {},
  })
})

describe('TodayFocus — one dominant next step', () => {
  it('puts due reviews first and opens the session itself, not just the tab', () => {
    useAppStore.setState({ vocab: [word(Date.now() - 60_000), word(Date.now() - 30_000)] })
    render(<TodayFocus onStartSession={() => {}} />)

    expect(screen.getByRole('heading', { name: /راجع المفردات المستحقّة/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /راجع 2 كلمة الآن/ }))
    expect(useAppStore.getState().activeTab).toBe('vocab')
    expect(peekNavIntent('vocab')?.view).toBe('review')
  })

  it('falls through to the weakest skill, named in Dutch, when nothing is due', () => {
    render(<TodayFocus onStartSession={() => {}} />)

    // listening is the weakest (40) → Luisteren
    expect(screen.getByText('Luisteren', { exact: false })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /تدرّب على الاستماع/ }))
    expect(useAppStore.getState().activeTab).toBe('exam')
    expect(peekNavIntent('exam')?.view).toBe('listening')
  })

  it('lets a running exam outrank everything else', () => {
    useAppStore.setState({
      vocab: [word(Date.now() - 1000)],
      mockSession: {
        id: 'm1', skill: 'writing', order: ['writing'], startedAt: Date.now(), endsAt: Date.now() + 60_000,
        scores: {}, minutes: { reading: 1, listening: 1, writing: 1, speaking: 1 },
      },
    })
    render(<TodayFocus onStartSession={() => {}} />)
    expect(screen.getByRole('heading', { name: /أكمل الامتحان الكامل الجاري/ })).toBeInTheDocument()
  })

  it('names what comes after the current step', () => {
    useAppStore.setState({ vocab: [word(Date.now() - 1000)] })
    render(<TodayFocus onStartSession={() => {}} />)
    expect(screen.getByText(/بعدها:/)).toBeInTheDocument()
  })

  it('offers the study programme as the secondary action', () => {
    const onStart = vi.fn()
    render(<TodayFocus onStartSession={onStart} />)
    fireEvent.click(screen.getByRole('button', { name: 'برنامج اليوم الكامل' }))
    expect(onStart).toHaveBeenCalledTimes(1)
  })

  it('celebrates a finished day and offers real extra practice', () => {
    useAppStore.setState({
      vocab: [],
      grammarProgress: Object.fromEntries(Object.entries(GRAMMAR_EXERCISES).map(([id, questions]) => [id, questions.map((_, i) => i)])),
      dailyHistory: { [todayKey()]: { mins: 600, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [{ skill: 'listening', score: 70 }] } },
    })
    render(<TodayFocus onStartSession={() => {}} />)
    expect(screen.getByText(/اكتملت مهام اليوم/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /تدرّب على موقف يومي/ }))
    expect(useAppStore.getState().activeTab).toBe('situations')
  })

  it('keeps every control at or above the touch floor', () => {
    render(<TodayFocus onStartSession={() => {}} />)
    // Sizing lives in components.css (.btn / .btn--lg), so assert the class
    // contract rather than an inline style that is no longer there.
    for (const btn of screen.getAllByRole('button')) {
      expect(btn.className).toContain('btn')
    }
  })

  it('does not count partly answered lessons as completed', () => {
    useAppStore.setState({
      grammarProgress: Object.fromEntries(Object.keys(GRAMMAR_EXERCISES).map(id => [id, [0]])),
      dailyHistory: { [todayKey()]: { mins: 600, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [{ skill: 'listening', score: 70 }] } },
    })
    render(<TodayFocus onStartSession={() => {}} />)
    expect(screen.getByRole('button', { name: 'افتح درس القواعد' })).toBeInTheDocument()
    expect(screen.queryByText(/اكتملت مهام اليوم/)).not.toBeInTheDocument()
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
