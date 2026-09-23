import { norm, words } from './evaluate'
import type { RoleplayTurnSpec } from './types'

/* ── Rule-based language checks for free learner text ─────────────────────
   Deliberately few and conservative: a false alarm teaches the wrong thing,
   so each rule fires only on a pattern it can see with certainty. Results
   are collected during a conversation and shown AFTER it — never as
   interruptions. Keys double as "recurring difficulty" ids. */

export type IssueKey = 'formal-u' | 'v2-inversion' | 'verb-final' | 'politeness' | 'goal'

export interface Issue {
  key: IssueKey
  /** The learner's words that triggered it (for highlighting). */
  fragment: string
  /** One short explanation in Arabic. */
  explainAr: string
}

export const ISSUE_TITLES_AR: Record<string, string> = {
  'formal-u': 'المخاطبة الرسمية (u بدل je)',
  'v2-inversion': 'ترتيب الفعل بعد كلمة الزمن',
  'verb-final': 'الفعل في آخر الجملة بعد omdat/als/of',
  politeness: 'صيغة الطلب المهذّبة',
  goal: 'تغطية المطلوب في الدور',
  keyword: 'البحث عن الكلمة المفتاحية في النص',
  paraphrase: 'التعرّف على إعادة الصياغة',
  detail: 'التفاصيل الدقيقة في النص',
  recall: 'تذكّر الكلمات بعد مدة',
}

const INFORMAL = ['je', 'jij', 'jou', 'jouw', 'jullie']
const TIME_STARTERS = ['morgen', 'vandaag', 'gisteren', 'straks', 'nu', 'dan', 'daarna', 'vanavond', 'vanmiddag', 'vanochtend', 'soms', 'eerst', 'volgende', 'op', 'om', 'in']
const SUBJECTS = ['ik', 'we', 'wij', 'u', 'hij', 'zij', 'ze', 'het']
const SUBORDINATORS = ['omdat', 'als', 'of', 'dat', 'wanneer', 'toen', 'terwijl', 'waar']
const FINITE = ['ben', 'bent', 'is', 'zijn', 'heb', 'hebt', 'heeft', 'hebben', 'wil', 'wilt', 'willen', 'kan', 'kunt', 'kunnen',
  'moet', 'moeten', 'mag', 'mogen', 'zal', 'zult', 'zullen', 'ga', 'gaat', 'gaan', 'kom', 'komt', 'komen', 'werk', 'werkt']

/** Split into sentences, keeping the original text for fragments. */
function sentences(text: string): string[] {
  return String(text).split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean)
}

export function checkFormal(text: string): Issue | null {
  const hit = words(text).find((w) => INFORMAL.includes(w))
  return hit ? {
    key: 'formal-u', fragment: hit,
    explainAr: `مع شخص لا تعرفه أو في موقف رسمي استخدم «u/uw» بدل «${hit}».`,
  } : null
}

/**
 * "Morgen ik kan niet" → after a fronted time/place phrase the finite verb
 * comes BEFORE the subject. Fires only when the sentence starts with a time
 * word (optionally a 2–3 word phrase such as "volgende week", "op vrijdag")
 * directly followed by a subject pronoun.
 */
export function checkInversion(text: string): Issue | null {
  for (const s of sentences(text)) {
    const w = words(s)
    if (w.length < 3 || !TIME_STARTERS.includes(w[0])) continue
    // phrase length: 1 word, or 2 for "volgende week"/"op vrijdag"/"om tien"
    const lead = ['volgende', 'op', 'om', 'in'].includes(w[0]) ? (w[0] === 'om' && w[2] === 'uur' ? 3 : 2) : 1
    if (SUBJECTS.includes(w[lead]) && w[lead + 1] && FINITE.includes(w[lead + 1])) {
      return {
        key: 'v2-inversion',
        fragment: w.slice(0, lead + 2).join(' '),
        explainAr: 'حين تبدأ الجملة بكلمة زمن يأتي الفعل قبل الفاعل: «Morgen kan ik…» لا «Morgen ik kan…».',
      }
    }
  }
  return null
}

/**
 * "omdat ik wil mijn afspraak verzetten" → in a subordinate clause the finite
 * verb goes to the end. Fires only for subordinator + subject + finite verb
 * followed by two or more further words in the same clause.
 */
export function checkVerbFinal(text: string): Issue | null {
  for (const s of sentences(text)) {
    const clause = norm(s).split(/\s*,\s*| en | maar /)
    for (const c of clause) {
      const w = c.split(' ').filter(Boolean)
      const i = w.findIndex((x) => SUBORDINATORS.includes(x))
      if (i < 0) continue
      const subj = w[i + 1], verb = w[i + 2]
      if (subj && SUBJECTS.includes(subj) && verb && FINITE.includes(verb) && w.length - (i + 3) >= 2) {
        return {
          key: 'verb-final',
          fragment: w.slice(i, i + 3).join(' '),
          explainAr: `بعد «${w[i]}» يذهب الفعل «${verb}» إلى آخر الجملة.`,
        }
      }
    }
  }
  return null
}

/** Requests in a formal setting: "ik wil …" without graag/zou/kunt u/mag ik. */
export function checkPoliteness(text: string): Issue | null {
  const t = ' ' + words(text).join(' ') + ' '
  if (!t.includes(' ik wil ')) return null
  if (/ graag | zou | zouden | kunt u | mag ik | alstublieft | alsjeblieft /.test(t)) return null
  return {
    key: 'politeness', fragment: 'ik wil',
    explainAr: 'الطلب المباشر «ik wil» يبدو حادًّا قليلًا؛ أضف «graag»: «Ik wil graag…» أو «Ik zou graag… willen».',
  }
}

/** Did the reply touch the turn's goal at all? (keyword presence only) */
export function checkGoal(text: string, turn: RoleplayTurnSpec): Issue | null {
  const ws = words(text)
  const t = ' ' + ws.join(' ') + ' '
  const hit = turn.expect.some((set) => set.every((stem) => {
    const s = norm(stem)
    return s.includes(' ') ? t.includes(' ' + s) : ws.some((w) => w.startsWith(s))
  }))
  return hit ? null : { key: 'goal', fragment: '', explainAr: `المطلوب في هذا الدور: ${turn.goalAr}` }
}

/** All issues for one learner turn, most important first. */
export function checkTurn(text: string, turn: RoleplayTurnSpec, formal: boolean): Issue[] {
  const out: Issue[] = []
  const add = (i: Issue | null) => { if (i) out.push(i) }
  if (!words(text).length) return out
  add(checkGoal(text, turn))
  if (formal) add(checkFormal(text))
  add(checkInversion(text))
  add(checkVerbFinal(text))
  if (formal && turn.kind === 'request') add(checkPoliteness(text))
  return out
}
