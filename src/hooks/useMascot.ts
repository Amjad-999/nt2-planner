import { useEffect, useRef, useState, useCallback } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useFocusMode } from './useFocusMode'
import { todayKey, dayKeyOffset } from '@/lib/utils'
import type { MascotMood } from '@/components/mascot/MascotAnimations'
import {
  GREETINGS, MILESTONE_STREAK, MILESTONE_BADGE, MILESTONE_EXAM,
  DUTCH_TIPS, DUTCH_FACTS, ENCOURAGEMENT, NUDGE_MISSED_DAY, THINKING,
  type MascotLine,
} from '@/data/mascotDialogs'

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100]
const TIP_INTERVAL_MS = 4 * 60 * 1000 // random Dutch tip/fact roughly every 4 min of active use

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)] }

function fillName(line: MascotLine, name: string): MascotLine {
  return { ...line, ar: line.ar.replace('{name}', name || 'صديقي') }
}

/** True if the user studied yesterday but hasn't studied yet today
 *  (a broken-streak moment worth a gentle nudge, not a scolding one). */
function missedYesterday(dailyHistory: Record<string, { mins: number }>): boolean {
  const yestKey = dayKeyOffset(-1)
  const studiedYesterday = (dailyHistory[yestKey]?.mins ?? 0) > 0
  const studiedToday = (dailyHistory[todayKey()]?.mins ?? 0) > 0
  return !studiedYesterday && !studiedToday
}

export function useMascot() {
  const focusMode = useFocusMode().focusMode
  const mascotDismissed = useAppStore((s) => s.mascotDismissed)
  const name = useAppStore((s) => s.name)
  const toggleMascot = useAppStore((s) => s.toggleMascot)

  // Refs used to detect *changes* (badge/streak/exam counts) in the
  // subscribe-based effect below — refs must only be touched in an
  // effect/event handler (not during render), so they're seeded there,
  // not alongside the initial-dialog computation just below.
  const prevBadgeCount = useRef<number | null>(null)
  const prevStreak = useRef<number | null>(null)
  const prevPassedExams = useRef<number | null>(null)

  // One-time greeting-or-nudge, computed as initial state (not in an effect —
  // this needs to run exactly once, synchronously, before first paint; see
  // react-hooks/set-state-in-effect, and useCountdown.ts for the same
  // "adjust state during render" convention used elsewhere in this app).
  const [initial] = useState<{ mood: MascotMood; dialog: MascotLine | null }>(() => {
    const st = useAppStore.getState()
    const hadStreak = st.streak.count > 0
    if (hadStreak && missedYesterday(st.dailyHistory)) {
      return { mood: 'sad', dialog: fillName(pick(NUDGE_MISSED_DAY), st.name) }
    }
    if (st.name) {
      return { mood: 'excited', dialog: fillName(pick(GREETINGS), st.name) }
    }
    // No name and nothing to nudge about — stay quietly idle until clicked.
    return { mood: 'idle', dialog: null }
  })

  const [mood, setMood] = useState<MascotMood>(initial.mood)
  const [dialog, setDialog] = useState<MascotLine | null>(initial.dialog)
  const [bubbleOpen, setBubbleOpen] = useState(initial.dialog !== null)

  const say = useCallback((line: MascotLine, m: MascotMood, opts?: { settleTo?: MascotMood }) => {
    setDialog(fillName(line, name))
    setMood(m)
    setBubbleOpen(true)
    if (opts?.settleTo) {
      const t = setTimeout(() => setMood(opts.settleTo!), 2400)
      return () => clearTimeout(t)
    }
  }, [name])

  const visible = !focusMode && !mascotDismissed

  // Settle the initial greeting/nudge mood back to idle after a beat — the
  // setState here happens inside a timer callback, not synchronously in the
  // effect body, so it's the "subscribe to an external timer" shape the
  // purity rule expects (unlike the mount computation above).
  useEffect(() => {
    if (initial.mood === 'idle') return
    const t = setTimeout(() => setMood('idle'), 2400)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally mount-only
  }, [])

  // Seed the "previous value" refs, then react to badge unlocks / streak
  // milestones / exam passes as they happen from here on.
  useEffect(() => {
    if (!visible) return
    const seed = useAppStore.getState()
    prevBadgeCount.current = seed.unlockedBadges.length
    prevStreak.current = seed.streak.count
    prevPassedExams.current = seed.inburgeringExams.filter((e) => e.passed).length

    return useAppStore.subscribe(() => {
      const st = useAppStore.getState()

      const badgeCount = st.unlockedBadges.length
      if (prevBadgeCount.current !== null && badgeCount > prevBadgeCount.current) {
        say(pick(MILESTONE_BADGE), 'excited', { settleTo: 'idle' })
      }
      prevBadgeCount.current = badgeCount

      const streakCount = st.streak.count
      if (
        prevStreak.current !== null && streakCount !== prevStreak.current &&
        STREAK_MILESTONES.includes(streakCount)
      ) {
        say(pick(MILESTONE_STREAK), 'happy', { settleTo: 'idle' })
      }
      prevStreak.current = streakCount

      const passedCount = st.inburgeringExams.filter((e) => e.passed).length
      if (prevPassedExams.current !== null && passedCount > prevPassedExams.current) {
        say(pick(MILESTONE_EXAM), 'excited', { settleTo: 'happy' })
      }
      prevPassedExams.current = passedCount
    })
  }, [visible, say])

  // Occasional unprompted Dutch tip/fact — only while the bubble is closed,
  // so it never interrupts something the user is already reading.
  useEffect(() => {
    if (!visible) return
    const id = setInterval(() => {
      if (bubbleOpen) return
      setMood('thinking')
      setTimeout(() => {
        const line = Math.random() < 0.5 ? pick(DUTCH_TIPS) : pick(DUTCH_FACTS)
        say(line, 'idle')
      }, 700)
    }, TIP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [visible, bubbleOpen, say])

  const closeBubble = useCallback(() => { setBubbleOpen(false) }, [])

  /** User tapped the (now-quiet) character — offer something encouraging. */
  const openBubble = useCallback(() => {
    say(pick(THINKING), 'thinking')
    setTimeout(() => say(pick(ENCOURAGEMENT), 'happy', { settleTo: 'idle' }), 550)
  }, [say])

  return { visible, mood, dialog, bubbleOpen, openBubble, closeBubble, dismissForever: toggleMascot }
}
