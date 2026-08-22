import type { State, TabId, SkillKey } from '@/store/types'
import { isFsrsLearned } from '@/features/vocab/fsrs-lite'

/**
 * الحلقة اليومية — ماذا يفعل المستخدم اليوم، بالأرقام.
 *
 * Pure. Takes the whole state and `now`, returns a concrete, ordered checklist.
 *
 * The rule that shapes everything here: never invent a task. Every item is
 * derived from something already true in the state — words actually due, a mock
 * actually in progress, a minute target the user actually set. A daily plan that
 * makes things up is worse than no plan, because the learner stops trusting it.
 */

export interface DailyTask {
  id: string
  /** ماذا يفعل، جملة واحدة قصيرة. */
  ar: string
  /** الرقم أو التفصيل الذي يجعل المهمّة قابلة للقياس. */
  detailAr: string
  /** أين ينفّذها. */
  tab: TabId
  done: boolean
  /** true إذا كانت المهمّة عاجلة ولا تُؤجَّل. */
  urgent: boolean
}

export interface TodayPlan {
  tasks: DailyTask[]
  doneCount: number
  /** 0..100 across the listed tasks. */
  pct: number
  minutesDone: number
  minutesTarget: number
  /** One line summarising where the day stands. */
  headlineAr: string
}

export const SKILL_AR_SHORT: Record<SkillKey, string> = {
  reading: 'القراءة',
  listening: 'الاستماع',
  writing: 'الكتابة',
  speaking: 'التحدّث',
}

/** Words whose review time has arrived and that are not yet counted as learned. */
export function dueCount(vocab: State['vocab'], now: number, learnedBox: number): number {
  return vocab.filter((w) => {
    const learned = w.fsrs_state !== undefined ? isFsrsLearned(w) : (w.box ?? 0) >= learnedBox
    return !learned && (w.due ?? 0) <= now
  }).length
}

/** The weakest of the four skills by best score; ties resolve to the first. */
export function weakest(skill: State['skill']): SkillKey {
  const ks: SkillKey[] = ['reading', 'listening', 'writing', 'speaking']
  let key: SkillKey = 'reading'
  let min = 101
  for (const k of ks) {
    const v = skill[k]?.best ?? 0
    if (v < min) { min = v; key = k }
  }
  return key
}

/** Skills the user already practised today, from the day's own history row. */
function skillsTodayFrom(state: Pick<State, 'dailyHistory'>, todayKey: string): Set<string> {
  const row = state.dailyHistory[todayKey]
  return new Set((row?.examTaken ?? []).map((e) => e.skill))
}

export interface PlanInput {
  now: number
  todayKey: string
  learnedBox: number
  /** How many words a single review sitting should cover. */
  reviewBatch: number
  /** Total grammar lessons available, to know whether one is left. */
  totalLessons: number
}

export function buildTodayPlan(
  state: Pick<State, 'vocab' | 'skill' | 'dailyHistory' | 'prefs' | 'mockSession' | 'grammarProgress'>,
  input: PlanInput,
): TodayPlan {
  const tasks: DailyTask[] = []
  const today = state.dailyHistory[input.todayKey]
  const minutesDone = today?.mins ?? 0
  const minutesTarget = Math.max(0, state.prefs?.studyDayMinutes ?? 0)
  const practised = skillsTodayFrom(state, input.todayKey)

  /* 1 — an unfinished timed exam outranks everything: the clock is running. */
  if (state.mockSession) {
    tasks.push({
      id: 'mock',
      ar: 'أكمل الامتحان الكامل الجاري',
      detailAr: `المهارة الحالية: ${SKILL_AR_SHORT[state.mockSession.skill]}. المؤقّت يعمل.`,
      tab: 'exam',
      done: false,
      urgent: true,
    })
  }

  /* 2 — spaced repetition is time-critical: a word reviewed late loses value. */
  const due = dueCount(state.vocab, input.now, input.learnedBox)
  tasks.push({
    id: 'vocab',
    ar: due > 0 ? 'راجع المفردات المستحقّة' : 'المراجعة مكتملة',
    detailAr: due > 0
      ? `${due} كلمة وصلت موعدها. ابدأ بـ ${Math.min(due, input.reviewBatch)} منها.`
      : 'لا كلمة مستحقّة الآن. أضف كلمات جديدة إن أردت.',
    tab: 'vocab',
    done: due === 0,
    urgent: due >= input.reviewBatch,
  })

  /* 3 — the weakest skill, named, so the day has one clear direction. */
  const focus = weakest(state.skill)
  tasks.push({
    id: 'focus',
    ar: `تدرّب على ${SKILL_AR_SHORT[focus]}`,
    detailAr: practised.has(focus)
      ? 'أنجزتها اليوم.'
      : `أضعف مهاراتك حاليًّا: ${state.skill[focus]?.best ?? 0} من 100.`,
    tab: 'exam',
    done: practised.has(focus),
    urgent: false,
  })

  /* 4 — one grammar lesson, only while there is one left to open. */
  const lessonsDone = Object.keys(state.grammarProgress ?? {}).length
  if (lessonsDone < input.totalLessons) {
    tasks.push({
      id: 'grammar',
      ar: 'ادرس درس قواعد واحدًا',
      detailAr: `أنجزت ${lessonsDone} من ${input.totalLessons} درسًا.`,
      tab: 'grammar',
      done: false,
      urgent: false,
    })
  }

  /* 5 — the minute goal, only if the user actually set one. */
  if (minutesTarget > 0) {
    tasks.push({
      id: 'minutes',
      ar: 'أكمل دقائق اليوم',
      detailAr: `${minutesDone} من ${minutesTarget} دقيقة.`,
      tab: 'plan',
      done: minutesDone >= minutesTarget,
      urgent: false,
    })
  }

  const doneCount = tasks.filter((t) => t.done).length
  const pct = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0

  let headlineAr: string
  if (state.mockSession) headlineAr = 'امتحان كامل قيد التنفيذ. أكمِله أوّلًا.'
  else if (tasks.length === 0) headlineAr = 'لا مهام اليوم.'
  else if (doneCount === tasks.length) headlineAr = 'أنجزت مهام اليوم كلّها.'
  else if (doneCount === 0) headlineAr = `${tasks.length} مهام لليوم. ابدأ بالأولى.`
  else headlineAr = `أنجزت ${doneCount} من ${tasks.length}. بقيت ${tasks.length - doneCount}.`

  return { tasks, doneCount, pct, minutesDone, minutesTarget, headlineAr }
}

/**
 * The most recent completed full run, preferred over single-skill history
 * because a four-part run is the only number comparable to a real exam.
 */
export function latestMockRun(runs: State['mockRuns']): State['mockRuns'][number] | null {
  if (!runs || runs.length === 0) return null
  return runs.reduce((best, r) => ((r.finishedAt ?? 0) >= (best.finishedAt ?? 0) ? r : best), runs[0])
}
