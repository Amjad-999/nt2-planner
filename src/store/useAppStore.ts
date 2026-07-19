import { create } from 'zustand'
import { persist, type StorageValue } from 'zustand/middleware'
import { todayKey, dayKeyOffset, daysBetween } from '@/lib/utils'
import { idbGet, idbSet } from '@/lib/idb'
import { defaultState, applyState } from './migration'
import type { State, VocabWord, ExamWord, SkillKey, TabId } from './types'
import { TOTAL_PLAN_DAYS, LEARNED_BOX, PASS_THRESHOLD, planTaskId, scaledPhases, SKILL_AR } from '@/data/phases'
import { scheduleCard, isFsrsLearned, type FsrsQuality } from '@/features/vocab/fsrs'
import { completionPct } from '@/features/exam/scoring'
import { celebrate } from '@/lib/celebrate'
import { toast } from '@/components/Toast'

/* ── localStorage keys (match original) ── */
const SK6 = 'nt2planner_v6'
const SK5 = 'nt2planner_v5'
const SK_BACKUP = 'nt2planner_v6_backup'

/* ── Custom storage: reads Zustand-wrapped OR original raw JSON ── */
const customStorage = {
  getItem(name: string): StorageValue<State> | null {
    try {
      // Try Zustand-wrapped first
      const raw = localStorage.getItem(name)
      if (raw) {
        const parsed = JSON.parse(raw)
        if (parsed && parsed.state) {
          // Older save() builds persisted activeTab — tab choice is per-session
          delete parsed.state.activeTab
          // Always sanitize on rehydrate: version-6 payloads skip migrate(),
          // so without this a corrupted/inflated stored state loads verbatim
          return { state: applyState(parsed.state), version: 6 }
        }
        // Original app stores raw S — migrate it
        return { state: applyState(parsed), version: 6 }
      }
      // Legacy v5 key
      const v5 = localStorage.getItem(SK5)
      if (v5) return { state: applyState(JSON.parse(v5)), version: 5 }
      // Backup key
      const bk = localStorage.getItem(SK_BACKUP)
      if (bk) return { state: applyState(JSON.parse(bk)), version: 6 }
    } catch {
      // corrupt JSON or storage blocked — fall through to a fresh state
    }
    return null
  },
  setItem(name: string, value: StorageValue<State>): void {
    try {
      const str = JSON.stringify(value)
      localStorage.setItem(name, str)
      localStorage.setItem(SK_BACKUP, str)
      idbSet(str).catch(() => {})
    } catch {
      // quota exceeded or storage blocked — persisting is best-effort
    }
  },
  removeItem(name: string): void {
    localStorage.removeItem(name)
    localStorage.removeItem(SK_BACKUP)
  },
}

/* ── IDB restore on startup if localStorage is empty ── */
export async function idbRestoreIfNeeded(set: (s: Partial<AppStore>) => void) {
  if (localStorage.getItem(SK6) || localStorage.getItem(SK5)) return
  const raw = await idbGet()
  if (!raw) return
  try {
    const parsed = JSON.parse(raw)
    const state = parsed?.state ? applyState(parsed.state) : applyState(parsed)
    set(state)
  } catch {
    // corrupt IDB payload — keep the default state
  }
}

/* ── Store interface ── */
export interface AppStore extends State {
  activeTab: TabId

  // UI actions
  setActiveTab: (tab: TabId) => void
  toggleTheme: () => void

  // Persistence
  save: () => void

  // Daily history
  todayHist: () => State['dailyHistory'][string]
  bumpHist: (field: keyof Omit<State['dailyHistory'][string], 'examTaken'>, n?: number) => void
  bumpStreak: () => void
  recordStudyMinutes: (mins: number) => void
  setDayMinutes: (dayKey: string, mins: number) => void

  // Gamification
  unlockBadge: (id: string) => void

  // Vocab
  vocabAdd: (dutch: string, arabic: string, example: string, level: string) => boolean
  removeVocab: (id: string) => void
  gradeFlash: (wordId: string, quality: FsrsQuality, isExamWord?: boolean) => number

  // Plan
  toggleTaskDone: (id: string) => void

  // Exam
  recordExam: (skill: SkillKey, pct: number) => void
  answerReading: (textId: string, qi: number, oi: number, questions?: readonly { correct: number }[]) => void
  resetReading: (textId: string) => void
  answerListening: (itemId: string, qi: number, oi: number, questions?: readonly { correct: number }[]) => void
  resetListening: (itemId: string) => void
  saveWriting: (id: string, text: string) => void
  scoreWriting: (id: string, score: number, feedback: string) => void
  resetWriting: (id: string) => void
  setSpeakingScore: (id: string, score: number) => void

  // ExamWords
  addExamWord: (nl: string, ar: string, ex: string, level: string) => boolean
  removeExamWord: (id: string) => void

  // Books
  toggleBookUnit: (bookId: string, unitIdx: number) => void

  // Settings
  saveSettings: (patch: Partial<Pick<State, 'name' | 'examDate' | 'planDay'> & { prefs: Partial<State['prefs']> }>) => void
  setCustomDur: (taskId: string, mins: number) => void
  resetAll: () => void
  importData: (raw: string) => boolean

  // Grammar exercises progress
  markGrammarDone: (topicId: string, exIndex: number) => void
}

/* Deep-link support: ?tab=exam opens the app on that tab (never persisted) */
const VALID_TABS: TabId[] = ['dashboard', 'plan', 'vocab', 'books', 'exam', 'exercises', 'grammar', 'stats', 'resources', 'platform']
function initialTab(): TabId {
  try {
    const t = new URLSearchParams(window.location.search).get('tab') as TabId | null
    if (t && VALID_TABS.includes(t)) return t
  } catch { /* no window (tests) — fall through */ }
  return 'dashboard'
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      ...defaultState(),
      activeTab: initialTab(),

      setActiveTab: (tab) => set({ activeTab: tab }),

      unlockBadge: (id) => {
        if (get().unlockedBadges.includes(id)) return
        set((st) => ({ unlockedBadges: [...st.unlockedBadges, id] }))
        get().save()
      },

      toggleTheme: () => {
        const theme = get().theme === 'dark' ? 'light' : 'dark'
        set({ theme })
        document.documentElement.setAttribute('data-theme', theme)
        get().save()
      },

      save: () => {
        // Exclude activeTab — parity with the persist partialize below
        const { activeTab, ...state } = get()
        void activeTab
        try {
          const s = JSON.stringify({ state, version: 6 })
          localStorage.setItem(SK6, s)
          localStorage.setItem(SK_BACKUP, s)
          idbSet(s).catch(() => {})
        } catch {
          // storage quota — silently ignore in save(); toast happens at call site
        }
      },

      todayHist: () => {
        const k = todayKey()
        const s = get()
        if (!s.dailyHistory[k]) {
          set((st) => ({
            dailyHistory: { ...st.dailyHistory, [k]: { mins: 0, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [] } },
          }))
        }
        return get().dailyHistory[k]
      },

      bumpHist: (field, n = 1) => {
        const k = todayKey()
        set((st) => {
          const today = st.dailyHistory[k] ?? { mins: 0, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [] }
          return { dailyHistory: { ...st.dailyHistory, [k]: { ...today, [field]: (today[field] as number) + n } } }
        })
      },

      bumpStreak: () => {
        const { streak } = get()
        const t = todayKey()
        if (streak.last === t) return
        const y = dayKeyOffset(-1)
        const count = streak.last === y ? streak.count + 1 : 1
        set({ streak: { count, last: t } })
        if ([3, 7, 14, 30].includes(count)) celebrate('streak')
      },

      recordStudyMinutes: (mins) => {
        if (!mins || mins <= 0) return
        // Cap a single entry at 10 h — a typo like 99999 would poison the
        // stats forever (cloud merge keeps the max, so it never self-heals)
        const m = Math.min(600, Math.round(mins))
        set((st) => ({ studySec: st.studySec + m * 60 }))
        get().bumpHist('mins', m)
        get().bumpStreak()
        get().save()
      },

      // Set a given day's studied minutes to an absolute value (inline editing).
      setDayMinutes: (dayKey, mins) => {
        const m = Math.min(600, Math.max(0, Math.round(mins) || 0))
        set((st) => {
          const prev = st.dailyHistory[dayKey] ?? { mins: 0, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [] }
          return { dailyHistory: { ...st.dailyHistory, [dayKey]: { ...prev, mins: m } } }
        })
        if (dayKey === todayKey() && m > 0) get().bumpStreak()
        get().save()
      },

      vocabAdd: (dutch, arabic, example, level) => {
        if (!dutch || !arabic) return false
        const norm = dutch.trim().toLowerCase()
        if (get().vocab.some((w) => w.dutch.toLowerCase() === norm)) return false
        const word: VocabWord = {
          id: 'w' + Math.random().toString(36).slice(2, 9),
          dutch: dutch.trim(), arabic: arabic.trim(),
          example: (example ?? '').trim(),
          level: (['A1','A2','B1','B2','C1'] as const).includes(level as never) ? level as VocabWord['level'] : 'B1',
          box: 0, due: Date.now(), reps: 0,
        }
        set((st) => ({ vocab: [...st.vocab, word] }))
        get().bumpHist('wordsAdded', 1)
        get().save()
        return true
      },

      removeVocab: (id) => {
        set((st) => ({ vocab: st.vocab.filter((w) => w.id !== id) }))
        get().save()
      },

      gradeFlash: (wordId, quality, isExamWord = false) => {
        let intervalDays = 1
        if (isExamWord) {
          set((st) => {
            const words = st.examWords.map((w) => {
              if (w.id !== wordId) return w
              const { due, intervalDays: ivl, fsrsFields } = scheduleCard(w, quality)
              intervalDays = ivl
              return { ...w, ...fsrsFields, due, reps: w.reps + 1 }
            })
            return { examWords: words }
          })
        } else {
          set((st) => {
            const vocab = st.vocab.map((w) => {
              if (w.id !== wordId) return w
              const { due, intervalDays: ivl, fsrsFields } = scheduleCard(w, quality)
              intervalDays = ivl
              const updated = { ...w, ...fsrsFields, due, reps: w.reps + 1 }
              const justLearned = !isFsrsLearned(w) && isFsrsLearned(updated)
              if (justLearned) { get().bumpHist('wordsLearned', 1); celebrate('word') }
              return updated
            })
            return { vocab }
          })
        }
        get().save()
        return intervalDays
      },

      toggleTaskDone: (id) => {
        const alreadyDone = !!get().done[id]
        const done = { ...get().done }
        if (alreadyDone) { delete done[id] }
        else { done[id] = true; get().bumpHist('tasks', 1); get().bumpStreak() }
        set({ done })
        // Celebrate when all today's plan tasks are completed
        if (!alreadyDone) {
          const st = get()
          const remaining = generateTodayPlan(st).tasks.filter(t => t.id !== 'srs')
          if (remaining.length === 0) { celebrate('tasks'); toast('🎉 أنجزت كل مهام اليوم!') }
          else toast('أُنجزت المهمة')
        }
        get().save()
      },

      recordExam: (skill, pct) => {
        set((st) => {
          const sk = { ...st.skill[skill] }
          sk.attempts += 1
          if (pct > sk.best) sk.best = pct
          sk.history = [...(sk.history ?? []), { date: todayKey(), score: pct }].slice(-50)
          const k = todayKey()
          const today = st.dailyHistory[k] ?? { mins: 0, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [] }
          return {
            skill: { ...st.skill, [skill]: sk },
            dailyHistory: { ...st.dailyHistory, [k]: { ...today, examTaken: [...today.examTaken, { skill, score: pct }] } },
          }
        })
        get().bumpStreak()
        if (pct >= PASS_THRESHOLD) celebrate('exam')
        get().save()
      },

      answerReading: (textId, qi, oi, questions) => {
        const prev = get().examReading[textId] ?? {}
        set((st) => ({ examReading: { ...st.examReading, [textId]: { ...(st.examReading[textId] ?? {}), [qi]: oi } } }))
        if (questions) {
          const pct = completionPct(prev, qi, oi, questions)
          if (pct !== null) get().recordExam('reading', pct)
        }
        get().save()
      },
      resetReading: (textId) => {
        set((st) => ({ examReading: { ...st.examReading, [textId]: {} } }))
        get().save()
      },

      answerListening: (itemId, qi, oi, questions) => {
        const prev = get().examListening[itemId] ?? {}
        set((st) => ({ examListening: { ...st.examListening, [itemId]: { ...(st.examListening[itemId] ?? {}), [qi]: oi } } }))
        if (questions) {
          const pct = completionPct(prev, qi, oi, questions)
          if (pct !== null) get().recordExam('listening', pct)
        }
        get().save()
      },
      resetListening: (itemId) => {
        set((st) => ({ examListening: { ...st.examListening, [itemId]: {} } }))
        get().save()
      },

      saveWriting: (id, text) => {
        set((st) => ({ examWriting: { ...st.examWriting, [id]: { ...(st.examWriting[id] ?? {}), text } } }))
      },
      scoreWriting: (id, score, feedback) => {
        const text = get().examWriting[id]?.text ?? ''
        set((st) => ({ examWriting: { ...st.examWriting, [id]: { text, score, feedback, at: Date.now() } } }))
        get().recordExam('writing', score)
        get().save()
      },
      resetWriting: (id) => {
        set((st) => ({ examWriting: { ...st.examWriting, [id]: { text: '', score: 0 } } }))
        get().save()
      },

      setSpeakingScore: (id, v) => {
        const score = Math.max(0, Math.min(100, v))
        set((st) => {
          const newSpeaking = { ...st.examSpeaking, [id]: { score, at: Date.now() } }
          const best = Math.max(0, ...Object.values(newSpeaking).map((x) => x.score))
          const sk = { ...st.skill.speaking }
          if (best > sk.best) {
            sk.best = best
            sk.history = [...sk.history, { date: todayKey(), score: best }].slice(-50)
          }
          return { examSpeaking: newSpeaking, skill: { ...st.skill, speaking: sk } }
        })
        get().save()
      },

      addExamWord: (nl, ar, ex, level) => {
        if (!nl || !ar) return false
        const norm = nl.trim().toLowerCase()
        if (get().examWords.some((w) => w.nl.toLowerCase() === norm)) return false
        const word: ExamWord = {
          id: 'ew' + Math.random().toString(36).slice(2, 9),
          nl: nl.trim(), ar: ar.trim(), ex: (ex ?? '').trim(),
          level: (['A1','A2','B1','B2','C1'] as const).includes(level as never) ? level as ExamWord['level'] : 'B1',
          box: 0, due: Date.now(), reps: 0, added: Date.now(),
        }
        set((st) => ({ examWords: [...st.examWords, word] }))
        get().bumpHist('wordsAdded', 1)
        get().save()
        return true
      },

      removeExamWord: (id) => {
        set((st) => ({ examWords: st.examWords.filter((w) => w.id !== id) }))
        get().save()
      },

      toggleBookUnit: (bookId, unitIdx) => {
        set((st) => {
          const arr = [...(st.bookUnits[bookId] ?? [])]
          const i = arr.indexOf(unitIdx)
          if (i === -1) arr.push(unitIdx)
          else arr.splice(i, 1)
          return { bookUnits: { ...st.bookUnits, [bookId]: arr } }
        })
        if (!get().bookUnits[bookId]?.includes(unitIdx)) {
          // was just removed — no bump needed
        } else {
          get().bumpHist('tasks', 1)
          get().bumpStreak()
        }
        get().save()
      },

      saveSettings: (patch) => {
        const { name, examDate, planDay, prefs } = patch
        set((st) => ({
          ...(name !== undefined && { name }),
          ...(examDate !== undefined && { examDate, planStart: st.planStart || new Date().toISOString() }),
          ...(planDay !== undefined && { planDay: Math.min(TOTAL_PLAN_DAYS, Math.max(1, planDay)) }),
          ...(prefs && { prefs: { ...st.prefs, ...prefs } }),
          onboarded: true,
        }))
        if (patch.prefs?.fontSize !== undefined) {
          document.documentElement.style.setProperty('--font-size-base', `${patch.prefs.fontSize}px`)
        }
        get().save()
      },

      setCustomDur: (taskId, mins) => {
        set((st) => ({ customDur: { ...st.customDur, [taskId]: mins } }))
        get().save()
      },

      resetAll: () => {
        try {
          localStorage.removeItem(SK6)
          localStorage.removeItem(SK5)
          localStorage.removeItem(SK_BACKUP)
        } catch {
          // storage blocked — still reset the in-memory state below
        }
        const fresh = defaultState()
        set({ ...fresh, activeTab: 'dashboard' })
        document.documentElement.setAttribute('data-theme', 'light')
        get().save()
      },

      importData: (raw) => {
        try {
          const parsed = JSON.parse(raw)
          const state = parsed?.state ? applyState(parsed.state) : applyState(parsed)
          set({ ...state })
          document.documentElement.setAttribute('data-theme', state.theme)
          get().save()
          return true
        } catch {
          return false
        }
      },

      markGrammarDone: (topicId, exIndex) => {
        const cur = get().grammarProgress[topicId] ?? []
        if (cur.includes(exIndex)) return
        set((st) => ({ grammarProgress: { ...st.grammarProgress, [topicId]: [...(st.grammarProgress[topicId] ?? []), exIndex] } }))
        get().save()
      },
    }),
    {
      name: SK6,
      storage: customStorage,
      // Must match the version save() writes — on a mismatch with no migrate()
      // zustand logs an error and DISCARDS the persisted state (data loss)
      version: 6,
      // Handles 5 (legacy nt2planner_v5) and 0 (payloads written by this
      // middleware before `version` was set). applyState normalizes any shape;
      // zustand's merge re-attaches the live actions on top
      migrate: (persisted) => applyState(persisted) as unknown as Omit<AppStore, 'activeTab'>,
      partialize: (state) => {
        const { activeTab, ...rest } = state
        void activeTab
        return rest
      },
    },
  ),
)

/* ── Selector helpers ── */
export function getDaysLeft(examDate: string): number | null {
  if (!examDate) return null
  return Math.max(0, Math.ceil((new Date(examDate).getTime() - Date.now()) / 86400000))
}

/* ── Date-driven plan window: the plan adapts to the user's exam date ── */
export function getPlanTotal(s: { planStart?: string; examDate?: string }): number {
  if (s.planStart && s.examDate) return Math.max(1, daysBetween(s.planStart, s.examDate))
  return TOTAL_PLAN_DAYS
}
export function getCurrentDay(s: { planStart?: string; planDay?: number }, totalDays: number): number {
  if (s.planStart) {
    const elapsed = daysBetween(s.planStart, new Date().toISOString())
    return Math.min(totalDays, Math.max(1, elapsed + 1))
  }
  return Math.min(totalDays, Math.max(1, s.planDay ?? 1))
}

export function totalLearnedWords(vocab: State['vocab']) {
  const isLearned = (w: VocabWord) =>
    w.fsrs_state !== undefined ? isFsrsLearned(w) : w.box >= LEARNED_BOX
  return { all: vocab.length, learned: vocab.filter(isLearned).length }
}

export function avgBestScore(skill: State['skill']): number {
  const ks: SkillKey[] = ['reading', 'listening', 'writing', 'speaking']
  const vals = ks.map((k) => skill[k]?.best ?? 0)
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
}

export function weakestSkill(skill: State['skill']): SkillKey {
  const ks: SkillKey[] = ['reading', 'listening', 'writing', 'speaking']
  let min = 101, key: SkillKey = 'reading'
  ks.forEach((k) => { if ((skill[k]?.best ?? 0) < min) { min = skill[k]?.best ?? 0; key = k } })
  return key
}

export function sumLastNDays(history: State['dailyHistory'], field: 'mins' | 'tasks' | 'wordsAdded' | 'wordsLearned', n: number): number {
  let s = 0
  for (let i = 0; i < n; i++) { const h = history[dayKeyOffset(-i)]; if (h) s += h[field] ?? 0 }
  return s
}

export function sumPrevNDays(history: State['dailyHistory'], field: 'mins' | 'tasks' | 'wordsAdded' | 'wordsLearned', n: number, off: number): number {
  let s = 0
  for (let i = off; i < off + n; i++) { const h = history[dayKeyOffset(-i)]; if (h) s += h[field] ?? 0 }
  return s
}

export function tasksRemaining(done: State['done'], planDays: number = TOTAL_PLAN_DAYS) {
  let rem = 0, total = 0
  scaledPhases(planDays).forEach((ph) => {
    for (let d = ph.dayFrom; d <= ph.dayTo; d++) {
      ph.tasks.forEach((_t, i) => { total++; if (!done[planTaskId(ph.id, d, i)]) rem++ })
    }
  })
  return { rem, total }
}

export function planHealth(
  state: Pick<State, 'examDate' | 'planDay' | 'done'> & { planStart?: string },
  // FIX 3: accept user-configured study capacity (optional, defaults match migration defaults)
  prefs?: { minutesPerTask?: number; studyDayMinutes?: number },
) {
  const minutesPerTask  = prefs?.minutesPerTask  ?? 30
  const studyDayMinutes = prefs?.studyDayMinutes ?? 60

  // FIX: total days + current day derive from the user's real exam window (planStart→examDate)
  const planDays = getPlanTotal({ planStart: state.planStart, examDate: state.examDate })
  const curDay   = getCurrentDay({ planStart: state.planStart, planDay: state.planDay }, planDays)

  const left = getDaysLeft(state.examDate)
  const { rem, total } = tasksRemaining(state.done, planDays)
  const done = total - rem
  const expectedDone = Math.round((curDay / planDays) * total)
  const lag    = expectedDone - done
  const lagPct = total ? (lag / total) * 100 : 0
  // FIX 3: use user's minutesPerTask instead of hardcoded 30
  const needMins = left && rem ? Math.round((rem * minutesPerTask) / Math.max(1, left)) : 0

  let status: 'ok' | 'tight' | 'crit', badge: string, title: string, why: string

  // FIX 4: recalibrated thresholds — critical must mean BEHIND, not just "many tasks remain".
  //
  //  ok   → lagPct < 10   (on pace regardless of workload)
  //  tight → 10 <= lagPct < 25  OR  needMins is above daily budget but still reachable (≤ 2×)
  //  crit  → lagPct >= 25  OR  daily need exceeds 2× user's available time
  //
  // This prevents Day-1 "critical" when nothing is actually overdue.
  if (left === null) {
    status = 'tight'; badge = '⚙️'
    title = 'حدّد تاريخ الامتحان أوّلًا'
    why   = 'افتح الإعدادات لإضافة تاريخ الامتحان حتى نحسب الكثافة المطلوبة.'
  } else if (lagPct < 10) {
    status = 'ok'; badge = '✅'
    title = 'الخطّة على المسار الصحيح'
    why   = `متبقّي ${left} يوم و${rem} مهمّة — تحتاج تقريبًا ${needMins} دقيقة/يوم لإكمال الخطّة في الموعد.`
  } else if (lagPct < 25 || needMins <= studyDayMinutes * 2) {
    status = 'tight'; badge = '⚠️'
    title = 'الخطّة مشدودة — لكنها قابلة للتنفيذ'
    why   = `أنت متأخّر ${Math.max(0, lag)} مهمّة عن الإيقاع المثالي. ارفع وتيرتك إلى ~${needMins} دقيقة/يوم (لديك ${studyDayMinutes} د/يوم متاحة).`
  } else {
    status = 'crit'; badge = '🚨'
    title = 'حالة حرجة — إعادة توزيع تلقائية'
    why   = `متبقّي ${left} يوم و${rem} مهمّة. تحتاج ${needMins} دقيقة/يوم — يتجاوز ضعف وقتك المتاح (${studyDayMinutes} د). يُنصح بإسقاط المهام الأقلّ أولوية.`
  }
  return { status, badge, title, why, left, rem, total, done, needMins, lag, lagPct }
}

export function generateTodayPlan(state: Pick<State, 'planDay' | 'done' | 'vocab' | 'skill'> & { planStart?: string; examDate?: string }) {
  const { done, vocab, skill } = state
  // FIX: derive plan length + current day from the exam window; scale the 5 phases to fit.
  const planDays = getPlanTotal({ planStart: state.planStart, examDate: state.examDate })
  const day      = getCurrentDay({ planStart: state.planStart, planDay: state.planDay }, planDays)
  const phases   = scaledPhases(planDays)
  const wkSkill = weakestSkill(skill)
  const overdue: { id: string; name: string; mins: number; skill: string; why: string; phase: string }[] = []
  phases.forEach((ph) => {
    for (let d = ph.dayFrom; d <= Math.min(day, ph.dayTo); d++) {
      ph.tasks.forEach((task, i) => {
        const id = planTaskId(ph.id, d, i)
        if (!done[id]) overdue.push({ id, name: task.name, mins: task.mins, skill: task.skill, why: 'متأخّرة عن اليوم ' + d, phase: ph.title })
      })
    }
  })
  const todayPhase = phases.find((p) => day >= p.dayFrom && day <= p.dayTo) ?? phases[0]
  const t = todayPhase.tasks
    .map((task, i) => ({ id: planTaskId(todayPhase.id, day, i), name: task.name, mins: task.mins, skill: task.skill, why: 'مهمّة اليوم ' + day, phase: todayPhase.title }))
    .filter((x) => !done[x.id])
  overdue.sort((a, b) => (b.skill === wkSkill ? 1 : 0) - (a.skill === wkSkill ? 1 : 0))
  let added = 0
  for (const od of overdue) {
    if (added >= 2) break
    if (!t.find((x) => x.id === od.id)) { t.push(od); added++ }
  }
  const isLearned = (w: VocabWord) =>
    w.fsrs_state !== undefined ? isFsrsLearned(w) : w.box >= LEARNED_BOX
  const due = (vocab ?? []).filter((w) => (w.due ?? 0) <= Date.now() && !isLearned(w)).length
  if (due > 0) t.push({ id: 'srs', name: `راجع ${due} كلمة مستحقّة (SRS)`, mins: Math.min(20, Math.max(5, Math.round(due * 0.6))), skill: 'vocab', why: due + ' كلمة وصلت موعد المراجعة', phase: '' })
  return { tasks: t, weakestSkill: SKILL_AR[wkSkill] ?? wkSkill }
}

/* ── Init: apply theme + IDB restore + persist events ── */
export function initStore() {
  const state = useAppStore.getState()
  document.documentElement.setAttribute('data-theme', state.theme)
  const fs = state.prefs.fontSize ?? 15
  document.documentElement.style.setProperty('--font-size-base', `${fs}px`)

  // IDB fallback restore
  idbRestoreIfNeeded((patch) => useAppStore.setState(patch as Partial<AppStore>))

  // Save on page hide
  const save = () => useAppStore.getState().save()
  window.addEventListener('pagehide', save)
  window.addEventListener('beforeunload', save)
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') save() })
}
