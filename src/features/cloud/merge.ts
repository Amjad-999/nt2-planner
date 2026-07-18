import type { State, VocabWord, ExamWord, DayRecord, SkillKey, SkillRecord } from '@/store/types'

/**
 * دمج آمن بلا فقدان: يُنتج حالةً تَجمع كل تقدّم الطرفين (المحلّي + السحابي).
 * المبدأ: لا يُحذف أي عنصر موجود في أيٍّ من الطرفين.
 *  • المصفوفات (كلمات/شارات/تقدّم القواعد): اتّحاد.
 *  • العدّادات (الوقت/أفضل نتيجة): الأقصى.
 *  • السجلّ اليومي: الأقصى لكل حقل + اتّحاد الامتحانات.
 *  • الإعدادات القياسية (الاسم/التاريخ/المظهر/التفضيلات): الأحدث يفوز (_savedAt).
 */

const num = (x: unknown, d = 0): number => (typeof x === 'number' && isFinite(x) ? x : d)
const uniqStrs = (a: string[] = [], b: string[] = []): string[] => Array.from(new Set([...(a ?? []), ...(b ?? [])]))
const uniqNums = (a: number[] = [], b: number[] = []): number[] => Array.from(new Set([...(a ?? []), ...(b ?? [])])).sort((x, y) => x - y)

function mergeWordArray<T extends { id: string; reps: number; fsrs_last_review?: number }>(a: T[] = [], b: T[] = []): T[] {
  const map = new Map<string, T>()
  for (const w of a ?? []) if (w && w.id) map.set(w.id, w)
  for (const w of b ?? []) {
    if (!w || !w.id) continue
    const cur = map.get(w.id)
    if (!cur) { map.set(w.id, w); continue }
    const curRev = num(cur.fsrs_last_review), wRev = num(w.fsrs_last_review)
    if (wRev > curRev || (wRev === curRev && num(w.reps) > num(cur.reps))) map.set(w.id, w)
  }
  return Array.from(map.values())
}

/** Multiset union: per (skill,score) pair keep the max count seen on either
 *  side. Plain concatenation doubled shared history on every sync cycle
 *  (local and remote are identical after a sync), growing exponentially. */
function mergeExamTaken(a: DayRecord['examTaken'] = [], b: DayRecord['examTaken'] = []): DayRecord['examTaken'] {
  const count = (list: DayRecord['examTaken']) => {
    const m = new Map<string, { entry: DayRecord['examTaken'][number]; n: number }>()
    for (const e of list ?? []) {
      if (!e || typeof e !== 'object') continue
      const k = `${e.skill}:${e.score}`
      const cur = m.get(k)
      if (cur) cur.n += 1
      else m.set(k, { entry: e, n: 1 })
    }
    return m
  }
  const ca = count(a), cb = count(b)
  const out: DayRecord['examTaken'] = []
  for (const k of new Set([...ca.keys(), ...cb.keys()])) {
    const n = Math.max(ca.get(k)?.n ?? 0, cb.get(k)?.n ?? 0)
    const entry = (ca.get(k) ?? cb.get(k))!.entry
    for (let i = 0; i < n; i++) out.push(entry)
  }
  return out
}

function mergeDay(x?: DayRecord, y?: DayRecord): DayRecord {
  const a = x ?? { mins: 0, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [] }
  const b = y ?? { mins: 0, tasks: 0, wordsAdded: 0, wordsLearned: 0, examTaken: [] }
  return {
    mins: Math.max(num(a.mins), num(b.mins)),
    tasks: Math.max(num(a.tasks), num(b.tasks)),
    wordsAdded: Math.max(num(a.wordsAdded), num(b.wordsAdded)),
    wordsLearned: Math.max(num(a.wordsLearned), num(b.wordsLearned)),
    examTaken: mergeExamTaken(a.examTaken, b.examTaken),
  }
}

function mergeSkill(a?: SkillRecord, b?: SkillRecord): SkillRecord {
  const histMap = new Map<string, { date: string; score: number }>()
  for (const h of [...(a?.history ?? []), ...(b?.history ?? [])]) if (h) histMap.set(h.date + ':' + h.score, h)
  const history = Array.from(histMap.values()).sort((p, q) => p.date.localeCompare(q.date)).slice(-50)
  return { best: Math.max(num(a?.best), num(b?.best)), attempts: Math.max(num(a?.attempts), num(b?.attempts)), history }
}

function unionRecordNums(a: Record<string, number[]> = {}, b: Record<string, number[]> = {}): Record<string, number[]> {
  const out: Record<string, number[]> = {}
  for (const k of uniqStrs(Object.keys(a ?? {}), Object.keys(b ?? {}))) out[k] = uniqNums(a?.[k] ?? [], b?.[k] ?? [])
  return out
}

function mergeNestedAnswers(a: Record<string, Record<number, number>> = {}, b: Record<string, Record<number, number>> = {}, bNewer: boolean): Record<string, Record<number, number>> {
  const out: Record<string, Record<number, number>> = {}
  for (const k of uniqStrs(Object.keys(a ?? {}), Object.keys(b ?? {}))) {
    const first = bNewer ? (a?.[k] ?? {}) : (b?.[k] ?? {})
    const second = bNewer ? (b?.[k] ?? {}) : (a?.[k] ?? {})
    out[k] = { ...first, ...second }
  }
  return out
}

export function mergeStates(a: State, b: State): State {
  const bNewer = num(b._savedAt) >= num(a._savedAt)
  const newer = bNewer ? b : a
  const older = bNewer ? a : b

  const dailyHistory: Record<string, DayRecord> = {}
  for (const k of uniqStrs(Object.keys(a.dailyHistory ?? {}), Object.keys(b.dailyHistory ?? {}))) {
    dailyHistory[k] = mergeDay(a.dailyHistory?.[k], b.dailyHistory?.[k])
  }

  const skill = { ...newer.skill } as State['skill']
  ;(['reading', 'listening', 'writing', 'speaking'] as SkillKey[]).forEach(k => { skill[k] = mergeSkill(a.skill?.[k], b.skill?.[k]) })

  const examWriting: State['examWriting'] = {}
  for (const k of uniqStrs(Object.keys(a.examWriting ?? {}), Object.keys(b.examWriting ?? {}))) {
    const x = a.examWriting?.[k], y = b.examWriting?.[k]
    if (x && y) {
      const base = (num(y.at) > num(x.at) || num(y.score) > num(x.score)) ? y : x
      const other = base === y ? x : y
      examWriting[k] = ((other.text?.length ?? 0) > (base.text?.length ?? 0)) ? { ...base, text: other.text } : base
    } else if (x) examWriting[k] = x
    else if (y) examWriting[k] = y
  }

  const examSpeaking: State['examSpeaking'] = {}
  for (const k of uniqStrs(Object.keys(a.examSpeaking ?? {}), Object.keys(b.examSpeaking ?? {}))) {
    const x = a.examSpeaking?.[k], y = b.examSpeaking?.[k]
    if (x && y) examSpeaking[k] = { score: Math.max(num(x.score), num(y.score)), at: Math.max(num(x.at), num(y.at)) }
    else if (x) examSpeaking[k] = x
    else if (y) examSpeaking[k] = y
  }

  let streak = a.streak ?? { count: 0, last: '' }
  const aLast = a.streak?.last ?? '', bLast = b.streak?.last ?? ''
  if (bLast > aLast) streak = b.streak
  else if (bLast === aLast) streak = { last: aLast, count: Math.max(num(a.streak?.count), num(b.streak?.count)) }

  return {
    name: newer.name || older.name,
    examDate: newer.examDate || older.examDate,
    planDay: num(newer.planDay, num(older.planDay, 1)),
    planStart: newer.planStart || older.planStart,
    theme: newer.theme,
    prefs: newer.prefs,
    onboarded: !!(a.onboarded || b.onboarded),
    done: { ...older.done, ...newer.done },
    studySec: Math.max(num(a.studySec), num(b.studySec)),
    vocab: mergeWordArray<VocabWord>(a.vocab, b.vocab),
    examWords: mergeWordArray<ExamWord>(a.examWords, b.examWords),
    streak,
    skill,
    examWriting,
    examSpeaking,
    examReading: mergeNestedAnswers(a.examReading, b.examReading, bNewer),
    examListening: mergeNestedAnswers(a.examListening, b.examListening, bNewer),
    dailyHistory,
    bookUnits: unionRecordNums(a.bookUnits, b.bookUnits),
    customDur: { ...older.customDur, ...newer.customDur },
    unlockedBadges: uniqStrs(a.unlockedBadges, b.unlockedBadges),
    grammarProgress: unionRecordNums(a.grammarProgress, b.grammarProgress),
    _v: 6,
    _savedAt: Math.max(num(a._savedAt), num(b._savedAt)),
  }
}
