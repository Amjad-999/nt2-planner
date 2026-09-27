import type { State, TabId, SkillKey } from '@/store/types'
import { dueCount as queueDueCount } from '@/features/vocab/queue'

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

/**
 * Words whose review time has arrived — the exact size of the review session.
 * Mastered words count too: see features/vocab/queue for why skipping them
 * made the dashboard disagree with the session it opened.
 */
export function dueCount(vocab: State['vocab'], now: number): number {
  return queueDueCount(vocab, now)
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

/** Today's lessons from the study programme, when one is active. */
export interface ProgramToday {
  total: number
  done: number
}

export interface PlanInput {
  now: number
  todayKey: string
  /** How many words a single review sitting should cover. */
  reviewBatch: number
  /** Total grammar lessons available, to know whether one is left. */
  totalLessons: number
  /** Fully solved lessons; opening or partly solving a lesson does not count. */
  completedLessons?: number
  /** null / absent = no programme, or no lessons scheduled today. */
  program?: ProgramToday | null
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
  const due = dueCount(state.vocab, input.now)
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

  /* 3 — today's new lessons from the book programme: the main learning of
     the day, but only when a programme is active and schedules some today. */
  const program = input.program
  if (program && program.total > 0) {
    const left = Math.max(0, program.total - program.done)
    tasks.push({
      id: 'program',
      ar: 'ادرس دروس اليوم من برنامجك',
      detailAr: left === 0
        ? `أنجزت دروس اليوم كلّها (${program.total}).`
        : `أنجزت ${program.done} من ${program.total}. بقي ${left}.`,
      tab: 'plan',
      done: left === 0,
      urgent: false,
    })
  }

  /* 4 — the weakest skill, named, so the day has one clear direction. */
  const focus = weakest(state.skill)
  tasks.push({
    id: 'focus',
    ar: `تدرّب على ${SKILL_AR_SHORT[focus]}`,
    detailAr: practised.has(focus)
      ? 'أنجزتها اليوم.'
      : state.skill[focus]?.attempts || state.skill[focus]?.best
        ? `أقل نتيجة تدريبية لديك: ${state.skill[focus]?.best ?? 0} من 100.`
        : 'لم تجرّب هذه المهارة بعد. ابدأ بمحاولة قصيرة لتحديد نقطة البداية.',
    tab: 'exam',
    done: practised.has(focus),
    urgent: false,
  })

  /* 5 — one grammar lesson, only while there is one left to open. */
  const lessonsDone = input.completedLessons ?? Object.keys(state.grammarProgress ?? {}).length
  if (lessonsDone < input.totalLessons) {
    tasks.push({
      id: 'grammar',
      ar: 'تابع مسار القواعد',
      detailAr: `أنجزت ${lessonsDone} من ${input.totalLessons} درسًا.`,
      tab: 'grammar',
      done: false,
      urgent: false,
    })
  }

  /* 6 — the minute goal, only if the user actually set one. */
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
 * The one thing to do now: the first unfinished task. The list is already
 * ordered by urgency (running exam → due reviews → today's lessons → weakest
 * skill → grammar → minutes), so no second ranking is needed — and the home
 * screen can never recommend something the checklist below it disagrees with.
 */
export function nextTask(plan: TodayPlan): DailyTask | null {
  return plan.tasks.find((t) => !t.done) ?? null
}

/**
 * The most recent completed full run, preferred over single-skill history
 * because a four-part run is the only number comparable to a real exam.
 */
export function latestMockRun(runs: State['mockRuns']): State['mockRuns'][number] | null {
  if (!runs || runs.length === 0) return null
  return runs.reduce((best, r) => ((r.finishedAt ?? 0) >= (best.finishedAt ?? 0) ? r : best), runs[0])
}
