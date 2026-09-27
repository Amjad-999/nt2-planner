import { describe, it, expect } from 'vitest'
import { dueWords, dueCount, isDue } from '@/features/vocab/queue'
import { splitArticle } from '@/features/vocab/article'
import { formatWaitAr, formatIntervalAr } from '@/features/vocab/fsrs-lite'

const NOW = 1_700_000_000_000
const w = (id: string, due: number) => ({ id, due })

describe('the review queue is one definition', () => {
  it('includes a word the moment its time arrives', () => {
    expect(isDue(w('a', NOW), NOW)).toBe(true)
    expect(isDue(w('b', NOW + 1), NOW)).toBe(false)
  })

  it('presents the longest-waiting word first', () => {
    const list = [w('new', NOW - 10), w('old', NOW - 10_000), w('mid', NOW - 500)]
    expect(dueWords(list, NOW).map((x) => x.id)).toEqual(['old', 'mid', 'new'])
  })

  it('counts exactly what it returns — the figure every screen shows', () => {
    const list = [w('a', NOW - 1), w('b', NOW + 1), w('c', NOW)]
    expect(dueCount(list, NOW)).toBe(dueWords(list, NOW).length)
  })
})

describe('de of het', () => {
  it('splits the article off a noun', () => {
    expect(splitArticle('de fiets')).toEqual({ article: 'de', word: 'fiets' })
    expect(splitArticle('het gemeentehuis')).toEqual({ article: 'het', word: 'gemeentehuis' })
    expect(splitArticle('  De  Fiets  ')).toEqual({ article: 'de', word: 'Fiets' })
  })

  it('leaves phrases alone — they are not article plus noun', () => {
    expect(splitArticle('de hele dag').article).toBeNull()
    expect(splitArticle('opgroeien').article).toBeNull()
    expect(splitArticle('iets halen').article).toBeNull()
  })
})

describe('how long until it comes back, in Arabic', () => {
  it('counts minutes and hours for short-term steps', () => {
    expect(formatWaitAr(60_000)).toBe('بعد دقيقة')
    expect(formatWaitAr(2 * 60_000)).toBe('بعد دقيقتين')
    expect(formatWaitAr(10 * 60_000)).toBe('بعد 10 دقائق')
    expect(formatWaitAr(2 * 3_600_000)).toBe('بعد ساعتين')
  })

  it('agrees with the noun, which a bare plural does not', () => {
    // "14 أيام" is wrong Arabic; 11–99 takes the singular.
    expect(formatIntervalAr(14)).toBe('بعد 14 يومًا')
    expect(formatIntervalAr(3)).toBe('بعد 3 أيام')
    expect(formatIntervalAr(1)).toBe('بعد يوم')
    expect(formatIntervalAr(2)).toBe('بعد يومين')
  })

  it('switches to months once days stop being readable', () => {
    expect(formatIntervalAr(60)).toBe('بعد شهرين')
    expect(formatIntervalAr(180)).toBe('بعد 6 أشهر')
  })
})
