import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { SituationDialogue } from '@/components/practice/SituationDialogue'
import { SITUATIONS } from '@/data/situations'

/**
 * The conversation flow: one line at a time, a wrong pick explained and
 * retryable, the right one carried into the transcript, and phrases to keep
 * at the end.
 */

const situation = SITUATIONS[0]
const correctIndex = (turn: number) => situation.turns[turn].choices.findIndex((c) => c.ok)
const wrongIndex = (turn: number) => situation.turns[turn].choices.findIndex((c) => !c.ok)

const optionButton = (turn: number, index: number) =>
  screen.getByRole('button', { name: new RegExp(situation.turns[turn].choices[index].nl.slice(0, 24).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')) })

describe('SituationDialogue', () => {
  it('opens on the first line with the scene and hides the Arabic meaning', () => {
    render(<SituationDialogue situation={situation} onExit={() => {}} />)
    expect(screen.getByText(situation.contextAr)).toBeInTheDocument()
    expect(screen.getByText(situation.turns[0].nl)).toBeInTheDocument()
    expect(screen.queryByText(situation.turns[0].ar)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'إظهار المعنى بالعربية' }))
    expect(screen.getByText(situation.turns[0].ar)).toBeInTheDocument()
  })

  it('explains a wrong reply, keeps the turn open, and accepts the right one', () => {
    render(<SituationDialogue situation={situation} onExit={() => {}} />)
    const wrong = wrongIndex(0)
    fireEvent.click(optionButton(0, wrong))

    expect(screen.getByText(situation.turns[0].choices[wrong].whyAr)).toBeInTheDocument()
    // still on the same line: no "next" until the fitting reply is found
    expect(screen.queryByRole('button', { name: /الجملة التالية|أنهِ الحوار/ })).not.toBeInTheDocument()

    fireEvent.click(optionButton(0, correctIndex(0)))
    expect(screen.getByRole('button', { name: /الجملة التالية|أنهِ الحوار/ })).toBeInTheDocument()
  })

  it('carries the finished exchange into the transcript and ends with phrases to keep', () => {
    render(<SituationDialogue situation={situation} onExit={() => {}} />)
    for (let t = 0; t < situation.turns.length; t++) {
      fireEvent.click(optionButton(t, correctIndex(t)))
      fireEvent.click(screen.getByRole('button', { name: /الجملة التالية|أنهِ الحوار/ }))
    }
    expect(screen.getByText(/أنهيت هذا الموقف/)).toBeInTheDocument()
    // every reply the learner chose is still readable above
    expect(screen.getAllByText(situation.turns[0].choices[correctIndex(0)].nl).length).toBeGreaterThan(0)
    // getAllBy: a kept phrase may also stand in the transcript above it.
    for (const p of situation.phrases) expect(screen.getAllByText(p.nl).length).toBeGreaterThan(0)
  })

  it('offers a way back to the list at any point', () => {
    const onExit = vi.fn()
    render(<SituationDialogue situation={situation} onExit={onExit} />)
    fireEvent.click(screen.getByRole('button', { name: /العودة إلى كل المواقف/ }))
    expect(onExit).toHaveBeenCalled()
  })
})
