import { useEffect, useState } from 'react'
import { getWordImage } from '@/features/vocab/images'

interface Props {
  word: string
  sentence: string
  meaning: string
}

const VISUALS: Array<{ words: string[]; icon: string }> = [
  { words: ['fiets', 'trein', 'bus', 'auto', 'rijbewijs', 'reizen', 'station'], icon: '🚲' },
  { words: ['huis', 'kamer', 'wonen', 'verhuizen', 'buur', 'straat', 'gebouw'], icon: '🏠' },
  { words: ['eten', 'drinken', 'keuken', 'koken', 'restaurant', 'brood', 'maaltijd'], icon: '🍽️' },
  { words: ['werk', 'baan', 'kantoor', 'collega', 'werkgever', 'werknemer', 'vergadering'], icon: '💼' },
  { words: ['school', 'leren', 'studeren', 'cursus', 'les', 'toets', 'examen'], icon: '📚' },
  { words: ['arts', 'ziek', 'gezondheid', 'ziekenhuis', 'tandarts', 'medicijn'], icon: '🩺' },
  { words: ['geld', 'betalen', 'rekening', 'prijs', 'kopen', 'verkopen', 'verzekering'], icon: '💳' },
  { words: ['familie', 'kind', 'man', 'vrouw', 'vriend', 'gezin', 'ouders'], icon: '👥' },
  { words: ['natuur', 'regen', 'weer', 'zon', 'tuin', 'dier', 'landbouw'], icon: '🌿' },
  { words: ['sport', 'wandelen', 'zwemmen', 'voetbal', 'bewegen'], icon: '🏃' },
  { words: ['film', 'muziek', 'kunst', 'boek', 'lezen', 'feest', 'theater'], icon: '🎭' },
  { words: ['gevoel', 'blij', 'verdriet', 'boos', 'stress', 'hoop', 'probleem'], icon: '💭' },
]

function pickIcon(text: string): string {
  const normalized = text.toLocaleLowerCase('nl-NL')
  return VISUALS.find((visual) => visual.words.some((word) => normalized.includes(word)))?.icon ?? '💡'
}

interface Resolved { word: string; photo: string | null; broken: boolean }

export function WordMeaningVisual({ word, sentence, meaning }: Props) {
  const icon = pickIcon(`${word} ${sentence}`)
  // Tagged with the word it answers — a resolution for a previous word (still
  // in flight when `word` changes) is simply ignored below instead of needing
  // a synchronous reset in the effect.
  const [resolved, setResolved] = useState<Resolved>({ word, photo: null, broken: false })

  useEffect(() => {
    let cancelled = false
    getWordImage(word).then((photo) => { if (!cancelled) setResolved({ word, photo, broken: false }) })
    return () => { cancelled = true }
  }, [word])

  const photo = resolved.word === word && !resolved.broken ? resolved.photo : null
  const label = `صورة توضيحية لمعنى ${word}: ${meaning}`

  return (
    <div className="word-meaning-visual" role="img" aria-label={label} title={label}>
      {photo
        ? <img src={photo} alt="" loading="lazy" decoding="async" width={76} height={76} onError={() => setResolved((r) => ({ ...r, broken: true }))} />
        : <span aria-hidden="true">{icon}</span>}
    </div>
  )
}
