/**
 * De of het? Nouns in the word banks are stored with their article
 * ("de huisarts", "het gemeentehuis"). Showing the article as its own chip
 * makes it the first thing a learner sees — it is the part NT2 learners get
 * wrong most, and it cannot be derived from the noun itself.
 *
 * Only a single word after the article counts as a noun: "de hele dag" or
 * "het regent niet" are phrases, not an article plus a noun.
 */

export type Article = 'de' | 'het'

export interface SplitWord {
  article: Article | null
  /** The word without its article; the full input when there is none. */
  word: string
}

export function splitArticle(nl: string): SplitWord {
  const text = nl.trim()
  const m = text.match(/^(de|het)\s+(\S+)$/i)
  if (!m) return { article: null, word: text }
  return { article: m[1].toLowerCase() as Article, word: m[2] }
}
