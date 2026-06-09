import { useEffect, useRef } from 'react'
import { useAppStore, totalLearnedWords } from '@/store/useAppStore'
import { PASS_THRESHOLD } from '@/data/phases'
import { BADGE_DEFS, type BadgeInput } from '@/features/achievements/badges'
import { celebrate } from '@/lib/celebrate'
import { todayKey } from '@/lib/utils'

/**
 * Mounted once in AppShell. Watches the relevant store slices and unlocks
 * badges + fires their confetti when conditions are newly met.
 *
 * Uses a ref to track the "previous set" of unlocked badges so it only fires
 * once per badge, not on every render.
 */
export function useBadgeCheck() {
  const streak       = useAppStore(s => s.streak.count)
  const vocab        = useAppStore(s => s.vocab)
  const skill        = useAppStore(s => s.skill)
  const dailyHistory = useAppStore(s => s.dailyHistory)
  const unlocked     = useAppStore(s => s.unlockedBadges)
  const unlockBadge  = useAppStore(s => s.unlockBadge)

  const processedRef = useRef<Set<string>>(new Set(unlocked))

  useEffect(() => {
    const { learned } = totalLearnedWords(vocab)
    const input: BadgeInput = {
      streak,
      learnedWords: learned,
      vocabWords:   vocab.length,
      examPassed:   Object.values(skill).some(sk => sk.best >= PASS_THRESHOLD),
      examAttempted: Object.values(skill).some(sk => sk.attempts > 0),
      dailyTasks:   dailyHistory[todayKey()]?.tasks ?? 0,
    }

    for (const badge of BADGE_DEFS) {
      // Already in store OR already fired this session
      if (unlocked.includes(badge.id) || processedRef.current.has(badge.id)) continue
      if (badge.condition(input)) {
        processedRef.current.add(badge.id)
        unlockBadge(badge.id)
        celebrate(badge.celeb)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streak, vocab, skill, dailyHistory, unlocked])
}
