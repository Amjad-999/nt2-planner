import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { describe, it, expect, beforeEach } from 'vitest'
import Today from '@/sections/Today'
import { NavTabs } from '@/components/NavTabs'
import { useAppStore } from '@/store/useAppStore'
import { defaultObs } from '@/features/observatory/state'

/* The central journey, at component level: start → answer → help → feedback
   → leave → resume with the answer and position intact. The browser-level
   version of the same journey (plus keyboard, phone widths, reduced motion)
   is run with Playwright; these keep the contract in the regular suite. */

beforeEach(() => {
  localStorage.clear()
  useAppStore.setState({ observatory: defaultObs(), vocab: [], activeTab: 'today' })
})

describe('Today — first use', () => {
  it('answers what/next with one primary action and honest, empty evidence', () => {
    render(<Today />)
    expect(screen.getByRole('heading', { level: 1, name: /لنبدأ من موقف حقيقي/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: /ابدأ جلستك الأولى/ })).toHaveLength(1)
    expect(screen.getByText(/لا يوجد سجل بعد/)).toBeInTheDocument()
    expect(screen.getByText(/لا تُكشف الإجابة قبل أن تحاول/)).toBeInTheDocument()
  })
})

describe('Lesson — attempt before answer, help never reveals it', () => {
  it('starts a session, opens help rungs without revealing the answer, then gives feedback', async () => {
    render(<Today />)
    fireEvent.click(screen.getByRole('button', { name: /ابدأ جلستك الأولى/ }))
    expect(useAppStore.getState().observatory.session?.itemId).toBe('obs-apotheek')
    fireEvent.click(await screen.findByRole('button', { name: 'انتقل إلى الأسئلة' }))

    // Help: three rungs, and still no option is marked right
    fireEvent.click(await screen.findByRole('button', { name: /^مساعدة/ }))
    fireEvent.click(await screen.findByRole('button', { name: /مساعدة إضافية/ }))
    fireEvent.click(await screen.findByRole('button', { name: /مساعدة إضافية/ }))
    expect(await screen.findByText(/السؤال يطلب الشيء الذي يجب أن تحمله معك/)).toBeInTheDocument()
    expect(screen.queryByText('صحيح')).not.toBeInTheDocument()

    // Checking without choosing: validation, nothing recorded
    fireEvent.click(screen.getByRole('button', { name: 'تحقّق' }))
    expect(screen.getByRole('alert')).toHaveTextContent('اختر إجابة أولًا')
    expect(useAppStore.getState().observatory.session?.answers.questions['q-apotheek-1']).toBeUndefined()

    // A wrong first attempt explains THAT option and keeps the right one hidden
    fireEvent.click(screen.getByRole('radio', { name: /Het recept van de huisarts/ }))
    fireEvent.click(screen.getByRole('button', { name: 'تحقّق' }))
    expect(await screen.findByText(/ليس هذا بعد/)).toBeInTheDocument()
    expect(screen.queryByText(/الإجابة الصحيحة/)).not.toBeInTheDocument()
    const a = useAppStore.getState().observatory.session!.answers.questions['q-apotheek-1']
    expect(a).toMatchObject({ tries: 1, correct: false, help: 3 })
    expect(useAppStore.getState().observatory.difficulties.keyword?.count).toBe(1)
  })

  it('keeps position and the chosen (unsent) answer after leaving and coming back', async () => {
    const { unmount } = render(<Today />)
    fireEvent.click(screen.getByRole('button', { name: /ابدأ جلستك الأولى/ }))
    fireEvent.click(await screen.findByRole('button', { name: 'انتقل إلى الأسئلة' }))
    fireEvent.click(await screen.findByRole('radio', { name: /Uw identiteitsbewijs/ }))
    fireEvent.click(screen.getByRole('button', { name: /احفظ واخرج/ }))
    unmount()

    render(<Today />)
    expect(screen.getByRole('heading', { level: 1, name: /تابِع من حيث توقفت/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'تابِع الجلسة' }))
    await waitFor(() => expect(screen.getByRole('radio', { name: /Uw identiteitsbewijs/ })).toBeChecked())
  })
})

describe('Navigation — four workspaces and «المزيد»', () => {
  it('marks the current workspace and reaches every original tool through a dialog', async () => {
    render(<NavTabs />)
    const top = screen.getByRole('navigation', { name: 'التنقل الرئيسي' })
    expect(within(top).getByRole('button', { name: /اليوم/ })).toHaveAttribute('aria-current', 'page')
    fireEvent.click(within(top).getByRole('button', { name: /المزيد/ }))
    const dialog = await screen.findByRole('dialog', { name: 'كل الأدوات' })
    for (const label of ['محاكاة الامتحان', 'تمارين', 'قواعد', 'لوحة التحكم', 'خطة الكتب', 'التحليلات', 'المفردات + AI', 'الكتب', 'مصادر DUO', 'منصّتي']) {
      expect(within(dialog).getByRole('button', { name: label })).toBeInTheDocument()
    }
    fireEvent.click(within(dialog).getByRole('button', { name: 'خطة الكتب' }))
    expect(useAppStore.getState().activeTab).toBe('plan')
  })
})
