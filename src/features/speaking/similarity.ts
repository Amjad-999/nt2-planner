/** Normalise Dutch text for comparison: lowercase, strip punctuation, collapse diacritics */
export function normalise(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip combining diacritics
    .toLowerCase()
    .replace(/[.,!?;:'"()\-–—]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Levenshtein edit distance (Wagner–Fischer, O(n·m)) */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const dp: number[] = Array.from({ length: n + 1 }, (_, i) => i)
  for (let i = 1; i <= m; i++) {
    let prev = dp[0]
    dp[0] = i
    for (let j = 1; j <= n; j++) {
      const tmp = dp[j]
      dp[j] = a[i - 1] === b[j - 1] ? prev : 1 + Math.min(prev, dp[j], dp[j - 1])
      prev = tmp
    }
  }
  return dp[n]
}

/** Jaccard similarity of word-token sets */
function tokenJaccard(a: string, b: string): number {
  const ta = new Set(a.split(' ').filter(Boolean))
  const tb = new Set(b.split(' ').filter(Boolean))
  if (ta.size === 0 && tb.size === 0) return 1
  const inter = [...ta].filter((w) => tb.has(w)).length
  const union = new Set([...ta, ...tb]).size
  return union === 0 ? 0 : inter / union
}

/**
 * Return a 0–100 similarity score between a spoken transcript and the
 * target Dutch sentence.  Higher = more similar.
 *
 * Weighted combination:
 *  60 % token-Jaccard (word-level recall — forgives word-order variation)
 *  40 % character edit-distance (catches close pronunciations)
 */
export function speakScore(transcript: string, target: string): number {
  const a = normalise(transcript)
  const b = normalise(target)
  if (!a && !b) return 100
  if (!a || !b) return 0

  const jac = tokenJaccard(a, b)
  const maxLen = Math.max(a.length, b.length)
  const editSim = maxLen === 0 ? 1 : 1 - levenshtein(a, b) / maxLen

  const combined = 0.6 * jac + 0.4 * Math.max(0, editSim)
  return Math.round(Math.min(1, combined) * 100)
}

export type ScoreLabel = { text: string; color: string }

export function scoreLabel(pct: number): ScoreLabel {
  if (pct >= 95) return { text: 'ممتاز! 🎉',       color: 'var(--green)'  }
  if (pct >= 80) return { text: 'جيّد جدًّا 👍',    color: 'var(--green)'  }
  if (pct >= 60) return { text: 'جيّد — قارب!',     color: 'var(--blue)'   }
  if (pct >= 40) return { text: 'مقبول — استمرّ',   color: 'var(--amber)'  }
  return           { text: 'ضعيف — حاول مجدّدًا', color: 'var(--red)'    }
}
