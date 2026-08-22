/**
 * Smoke tests for the writing feedback panel.
 *
 * Guards the two things a user would notice immediately if they broke:
 *  - the panel renders and the checklist reacts to what is typed;
 *  - a missing or failing AI backend never blocks the local report.
 */
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { WritingFeedbackPanel } from '@/components/exam/WritingFeedbackPanel'
import type { ExamWritingItem } from '@/store/types'

const TASK: ExamWritingItem = {
  id: 'smoke1', kind: 'email', ar: 'اختبار', titleNl: 'Smoke', briefNl: 'brief', briefAr: 'اختبار',
  minWords: 10, maxWords: 30, register: 'formeel',
  points: [
    { ar: 'اذكر السبب', any: ['omdat'] },
    { ar: 'اذكر الموعد', any: ['maandag'] },
  ],
}

const GOOD = 'Geachte heer, ik kan niet komen omdat ik moet werken op maandag. Met vriendelijke groet, Amjad.'

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new Error('offline'))))
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('WritingFeedbackPanel', () => {
  it('renders the required-points checklist with an empty text', () => {
    render(<WritingFeedbackPanel task={TASK} text="" onRecord={() => {}} />)
    expect(screen.getByText('اذكر السبب')).toBeInTheDocument()
    expect(screen.getByText('اذكر الموعد')).toBeInTheDocument()
  })

  it('shows nothing covered when the text is empty and both covered when it is complete', () => {
    const { unmount } = render(<WritingFeedbackPanel task={TASK} text="" onRecord={() => {}} />)
    expect(screen.getAllByText(/0 من 2/).length).toBeGreaterThan(0)
    unmount()
    render(<WritingFeedbackPanel task={TASK} text={GOOD} onRecord={() => {}} />)
    expect(screen.getAllByText(/2 من 2/).length).toBeGreaterThan(0)
    expect(screen.queryByText(/0 من 2/)).not.toBeInTheDocument()
  })

  it('tells the user the task is formal', () => {
    render(<WritingFeedbackPanel task={TASK} text="" onRecord={() => {}} />)
    expect(screen.getByText(/رسمية/)).toBeInTheDocument()
  })

  it('hands the local total to onRecord when the user records it', () => {
    const onRecord = vi.fn()
    render(<WritingFeedbackPanel task={TASK} text={GOOD} onRecord={onRecord} />)
    fireEvent.click(screen.getByText('سجّل الدرجة'))
    expect(onRecord).toHaveBeenCalledTimes(1)
    const [total, summary] = onRecord.mock.calls[0]
    expect(total).toBeGreaterThan(0)
    expect(total).toBeLessThanOrEqual(100)
    expect(String(summary)).toContain('2 من 2')
  })

  it('does not let the record button fire on an empty text', () => {
    const onRecord = vi.fn()
    render(<WritingFeedbackPanel task={TASK} text="" onRecord={onRecord} />)
    fireEvent.click(screen.getByText('سجّل الدرجة'))
    expect(onRecord).not.toHaveBeenCalled()
  })

  it('keeps the local report visible when the AI layer is unavailable', () => {
    render(<WritingFeedbackPanel task={TASK} text={GOOD} onRecord={() => {}} />)
    // the local block is present regardless of any backend
    expect(screen.getByText('التقييم المحلّي')).toBeInTheDocument()
    // and the panel says so plainly instead of showing a dead button
    expect(screen.getByText(/غير مُهيَّأ/)).toBeInTheDocument()
  })

  it('surfaces confirmed errors with an Arabic explanation', () => {
    render(<WritingFeedbackPanel task={TASK} text="Hun hebben op maandag gebeld omdat het moest." onRecord={() => {}} />)
    expect(screen.getByText(/أخطاء مؤكّدة/)).toBeInTheDocument()
    expect(screen.getByText(/ليست فاعلًا/)).toBeInTheDocument()
  })

  it('shows no error block for clean formal Dutch', () => {
    render(<WritingFeedbackPanel task={TASK} text={GOOD} onRecord={() => {}} />)
    expect(screen.queryByText(/أخطاء مؤكّدة/)).not.toBeInTheDocument()
  })
})
