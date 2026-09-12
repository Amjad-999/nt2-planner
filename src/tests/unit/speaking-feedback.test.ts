import { describe, it, expect } from 'vitest'
import { wordFeedback } from '@/features/speaking/similarity'

/**
 * The honest half of pronunciation practice: which words the recogniser
 * caught. No score is invented — see the note in similarity.ts.
 */

const states = (target: string, heard: string) => wordFeedback(target, heard).map((w) => w.state)

describe('wordFeedback', () => {
  it('marks every word heard when the sentence comes through', () => {
    expect(states('Ik wil graag een afspraak maken', 'ik wil graag een afspraak maken'))
      .toEqual(['heard', 'heard', 'heard', 'heard', 'heard', 'heard'])
  })

  it('ignores punctuation and case, as the recogniser does', () => {
    expect(states('Pinnen, alstublieft.', 'pinnen alstublieft')).toEqual(['heard', 'heard'])
  })

  it('names the word that never arrived', () => {
    const fb = wordFeedback('ik heb koorts', 'ik heb')
    expect(fb.find((w) => w.word === 'koorts')!.state).toBe('missing')
  })

  it('calls a one-letter miss close, not missing, on a long word', () => {
    // A real recogniser slip: the plural ending glued onto the noun.
    expect(wordFeedback('gemeente', 'gemeenten')[0].state).toBe('close')
  })

  it('still calls a genuinely different word missing', () => {
    expect(wordFeedback('afspraak', 'afspraken')[0].state).toBe('missing')
  })

  it('keeps short lookalikes apart — het is not hij', () => {
    expect(wordFeedback('het', 'hij')[0].state).toBe('missing')
  })

  it('does not let one heard word cover two identical targets', () => {
    expect(states('ik ik', 'ik')).toEqual(['heard', 'missing'])
  })

  it('reports nothing heard as all missing rather than crashing', () => {
    expect(states('goedemorgen meneer', '')).toEqual(['missing', 'missing'])
  })
})
