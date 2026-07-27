import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useAppStore, generateTodayPlan, getPlanTotal, type AppStore } from '@/store/useAppStore'
import { useFocusMode } from './useFocusMode'
import { todayKey, dayKeyOffset } from '@/lib/utils'
import { scaledPhases } from '@/data/phases'
import type { MascotMood } from '@/components/mascot/MascotAnimations'
import {
  GREETINGS, MILESTONE_STREAK, MILESTONE_BADGE, MILESTONE_EXAM,
  DUTCH_TIPS, DUTCH_FACTS, ENCOURAGEMENT, NUDGE_MISSED_DAY,
  TASK_DONE, ALL_DONE_DANCE, DANCE_LINES,
  PROGRESS_GOAL_MET_NOW, PROGRESS_GOAL_MET_TODAY, PROGRESS_ON_TRACK,
  type MascotLine,
} from '@/data/mascotDialogs'
import { CULTURE_FACTS } from '@/data/dutchCulture'
import { DUTCH_JOKES } from '@/data/dutchJokes'
import { heroProgressFromState } from '@/components/hero/heroProgress'

const STREAK_MILESTONES = [3, 7, 14, 30, 50, 100]
const TIP_INTERVAL_MS = 4 * 60 * 1000       // random Dutch tip/fact roughly every 4 min of active use
const REMINDER_INTERVAL_MS = 2 * 60 * 1000  // completed-task word reminder every 2 min
const DANCE_MS = 6000                        // one victory dance lasts ~6s, then settle to idle

/* كلمة درسها المستخدم اليوم + دفعة الكلمات المربوطة بمهمة مكتملة */
export interface ReminderWord { nl: string; ar: string }
export interface WordBatch { task: string; words: ReminderWord[]; day: string }

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

/** Words reviewed (FSRS) today — the reload-safe seed for the "studied today"
 *  pool. Words added today but never reviewed are picked up live by the
 *  subscribe diff below instead. */
function studiedTodayWords(st: AppStore): Map<string, ReminderWord> {
  const start = new Date(); start.setHours(0, 0, 0, 0)
  const t0 = start.getTime()
  const m = new Map<string, ReminderWord>()
  for (const w of st.vocab) if ((w.fsrs_last_review ?? 0) >= t0) m.set(w.id, { nl: w.dutch, ar: w.arabic })
  for (const w of st.examWords) if ((w.fsrs_last_review ?? 0) >= t0) m.set(w.id, { nl: w.nl, ar: w.ar })
  return m
}

function snapshotReps(st: AppStore): Map<string, number> {
  const m = new Map<string, number>()
  for (const w of st.vocab) m.set(w.id, w.reps)
  for (const w of st.examWords) m.set(w.id, w.reps)
  return m
}

/** Human name for a completed plan-task id (`phase_dN_tI` — see planTaskId). */
function taskNameFromId(id: string, st: AppStore): string {
  if (id === 'srs') return 'مراجعة الكلمات (SRS)'
  const m = /^(.+)_d\d+_t(\d+)$/.exec(id)
  if (m) {
    const ph = scaledPhases(getPlanTotal(st)).find((p) => p.id === m[1])
    const task = ph?.tasks[Number(m[2])]
    if (task) return task.name
  }
  return 'مهمة اليوم'
}

export function useMascot() {
  const focusMode = useFocusMode().focusMode
  const mascotDismissed = useAppStore((s) => s.mascotDismissed)
  const botWordReminders = useAppStore((s) => s.botWordReminders)
  const name = useAppStore((s) => s.name)
  const toggleMascot = useAppStore((s) => s.toggleMascot)

  // Refs used to detect *changes* (badge/streak/exam/task/word counts) in the
  // subscribe-based effect below — refs must only be touched in an
  // effect/event handler (not during render), so they're seeded there,
  // not alongside the initial-dialog computation just below.
  const prevBadgeCount = useRef<number | null>(null)
  const prevStreak = useRef<number | null>(null)
  const prevPassedExams = useRef<number | null>(null)
  const prevGoalDay = useRef<string | null>(null)
  const prevReps = useRef<Map<string, number> | null>(null)
  const prevDone = useRef<Set<string> | null>(null)
  // Words studied today that no completed task has claimed yet. Seeded once
  // from FSRS review timestamps (reload-safe); task grouping itself is
  // session-only by design — a batch belongs to the task the user finished
  // while studying those words in *this* sitting.
  const pendingWords = useRef<Map<string, ReminderWord>>(new Map())
  const pendingSeeded = useRef(false)
  const reminderIdx = useRef(0)
  const dutyIdx = useRef(0)
  const danceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    // Real-progress commentary — the same derivation the hero ring uses
    // (heroProgress.ts), so Katja and the dashboard never disagree about how
    // today is going. Only 'behind' falls through to the static greeting:
    // an empty morning is normal, not something to guilt-trip over.
    const progress = heroProgressFromState(st, todayKey())
    if (progress === 'goal-met') {
      return { mood: 'excited', dialog: fillName(pick(PROGRESS_GOAL_MET_TODAY), st.name) }
    }
    if (progress === 'on-track') {
      return { mood: 'happy', dialog: fillName(pick(PROGRESS_ON_TRACK), st.name) }
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
  const [panelOpen, setPanelOpen] = useState(false)
  const [batches, setBatches] = useState<WordBatch[]>([])

  const say = useCallback((line: MascotLine, m: MascotMood, opts?: { settleTo?: MascotMood }) => {
    setDialog(fillName(line, name))
    setMood(m)
    setBubbleOpen(true)
    if (opts?.settleTo) {
      const t = setTimeout(() => setMood(opts.settleTo!), 2400)
      return () => clearTimeout(t)
    }
  }, [name])

  /** رقصة النصر (نمط بيكاتشو) — تدوم ثوانيَ ثم تعود للهدوء. */
  const dance = useCallback((line?: MascotLine) => {
    say(line ?? pick(DANCE_LINES), 'dancing')
    if (danceTimer.current) clearTimeout(danceTimer.current)
    danceTimer.current = setTimeout(() => setMood('idle'), DANCE_MS)
  }, [say])

  useEffect(() => () => { if (danceTimer.current) clearTimeout(danceTimer.current) }, [])

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
  // milestones / exam passes / word reviews / task completions as they happen.
  useEffect(() => {
    if (!visible) return
    const seed = useAppStore.getState()
    prevBadgeCount.current = seed.unlockedBadges.length
    prevStreak.current = seed.streak.count
    prevPassedExams.current = seed.inburgeringExams.filter((e) => e.passed).length
    // Congratulate the daily minutes-goal only when it's achieved during this
    // mounted session — if it was already met at seed time, the initial
    // greeting covered it, and the hero's silent flag-consume on mount (goal
    // met earlier today elsewhere) must not read as a fresh achievement.
    const goalMetAtSeed = heroProgressFromState(seed, todayKey()) === 'goal-met'
    prevGoalDay.current = seed.goalCelebratedOn
    prevReps.current = snapshotReps(seed)
    prevDone.current = new Set(Object.keys(seed.done))
    if (!pendingSeeded.current) {
      pendingWords.current = studiedTodayWords(seed)
      pendingSeeded.current = true
    }

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

      // Daily minutes-goal reached — the hero marks goalCelebratedOn (with its
      // confetti) and Katja cheers in the same beat, exactly once per day.
      // Distinct from ALL_DONE_DANCE ("every plan task done"); both can
      // happen, and the dance stays the bigger beat.
      if (
        !goalMetAtSeed &&
        prevGoalDay.current !== null && st.goalCelebratedOn !== prevGoalDay.current &&
        st.goalCelebratedOn === todayKey()
      ) {
        say(pick(PROGRESS_GOAL_MET_NOW), 'excited', { settleTo: 'happy' })
      }
      prevGoalDay.current = st.goalCelebratedOn

      // Words studied since the last snapshot: any rep bump or brand-new word
      // joins the unclaimed pool the next completed task will own.
      if (prevReps.current) {
        for (const w of st.vocab) {
          const p = prevReps.current.get(w.id)
          if (p === undefined || w.reps > p) pendingWords.current.set(w.id, { nl: w.dutch, ar: w.arabic })
        }
        for (const w of st.examWords) {
          const p = prevReps.current.get(w.id)
          if (p === undefined || w.reps > p) pendingWords.current.set(w.id, { nl: w.nl, ar: w.ar })
        }
      }
      prevReps.current = snapshotReps(st)

      // Completed task → claim the pending words as this task's batch and
      // start (or keep feeding) the 2-min reminder rotation. Un-checking a
      // task is intentionally ignored.
      if (prevDone.current) {
        const added = Object.keys(st.done).filter((id) => !prevDone.current!.has(id))
        if (added.length > 0) {
          const day = todayKey()
          const words = Array.from(pendingWords.current.values())
          pendingWords.current.clear()
          if (words.length > 0) {
            const task = taskNameFromId(added[0], st)
            setBatches((prev) => [...prev.filter((b) => b.day === day), { task, words, day }])
          }
          const remaining = generateTodayPlan(st).tasks.filter((t) => t.id !== 'srs')
          if (remaining.length === 0) dance(pick(ALL_DONE_DANCE))
          else say(pick(TASK_DONE), 'happy', { settleTo: 'idle' })
        }
      }
      prevDone.current = new Set(Object.keys(st.done))
    })
  }, [visible, say, dance])

  // كلمات التذكير: كل كلمات دفعات اليوم، مع اسم مهمتها — تدور بالتناوب.
  const reminderWords = useMemo(() => {
    const day = todayKey()
    return batches
      .filter((b) => b.day === day)
      .flatMap((b) => b.words.map((w) => ({ ...w, task: b.task })))
  }, [batches])

  // The requested loop: every 2 minutes, re-surface one word (with its Arabic
  // meaning) from a task completed today — only while nothing else is open.
  useEffect(() => {
    if (!visible || !botWordReminders || reminderWords.length === 0) return
    const id = setInterval(() => {
      if (bubbleOpen || panelOpen) return
      const w = reminderWords[reminderIdx.current % reminderWords.length]
      reminderIdx.current++
      say(
        { ar: `تذكير سريع 📖 «${w.nl}» تعني «${w.ar}» — من مهمة «${w.task}» التي أنجزتها اليوم.`, nl: w.nl },
        'happy',
        { settleTo: 'idle' },
      )
    }, REMINDER_INTERVAL_MS)
    return () => clearInterval(id)
  }, [visible, botWordReminders, reminderWords, bubbleOpen, panelOpen, say])

  // Occasional unprompted tip / fact / culture nugget / encouragement — only
  // while nothing is open, and paused while word reminders are running so
  // the corner never turns into a notification firehose.
  useEffect(() => {
    if (!visible) return
    const remindersActive = botWordReminders && reminderWords.length > 0
    if (remindersActive) return
    const id = setInterval(() => {
      if (bubbleOpen || panelOpen) return
      setMood('thinking')
      setTimeout(() => {
        const pools = [DUTCH_TIPS, DUTCH_FACTS, CULTURE_FACTS, ENCOURAGEMENT]
        say(pick(pick(pools)), 'idle')
      }, 700)
    }, TIP_INTERVAL_MS)
    return () => clearInterval(id)
  }, [visible, bubbleOpen, panelOpen, botWordReminders, reminderWords, say])

  const closeBubble = useCallback(() => { setBubbleOpen(false) }, [])
  const closePanel = useCallback(() => { setPanelOpen(false) }, [])

  const openPanel = useCallback(() => {
    setBubbleOpen(false)
    setPanelOpen(true)
  }, [])

  /** Tapping the icon performs ONE of Katja's routine duties, rotating through
   *  them so consecutive taps never repeat: today's word reminder → next task
   *  → Dutch tip → culture fact → joke → encouragement → victory dance. The
   *  full menu stays one tap further in (the bubble's «كل ما أستطيع فعله»). */
  const doDuty = useCallback(() => {
    const st = useAppStore.getState()
    const duties: (() => void)[] = []

    // Only offered once the user actually has words from a completed task.
    if (reminderWords.length > 0) {
      duties.push(() => {
        const w = reminderWords[reminderIdx.current % reminderWords.length]
        reminderIdx.current++
        say(
          { ar: `تذكير سريع 📖 «${w.nl}» تعني «${w.ar}» — من مهمة «${w.task}» التي أنجزتها اليوم.`, nl: w.nl },
          'happy', { settleTo: 'idle' },
        )
      })
    }

    duties.push(() => {
      const tasks = generateTodayPlan(st).tasks
      if (tasks.length === 0) { dance(pick(ALL_DONE_DANCE)); return }
      const t = tasks[0]
      say({ ar: `خطوتك التالية 👉 «${t.name}» — حوالي ${t.mins} دقيقة. ابدأ بها وسأكون هنا حين تنتهي 💪` }, 'excited', { settleTo: 'idle' })
    })

    duties.push(() => say(pick(DUTCH_TIPS), 'thinking', { settleTo: 'idle' }))
    duties.push(() => say(pick(CULTURE_FACTS), 'idle'))
    duties.push(() => {
      const j = pick(DUTCH_JOKES)
      say({ ar: `😹 ${j.ar}`, nl: j.nl }, 'happy', { settleTo: 'idle' })
    })
    duties.push(() => say(pick(ENCOURAGEMENT), 'happy', { settleTo: 'idle' }))
    duties.push(() => dance())

    duties[dutyIdx.current % duties.length]()
    dutyIdx.current++
  }, [reminderWords, say, dance])

  return {
    visible, mood, dialog, bubbleOpen, closeBubble,
    panelOpen, openPanel, closePanel,
    batches, reminderCount: reminderWords.length,
    dance, doDuty,
    dismissForever: toggleMascot,
  }
}
