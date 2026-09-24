import type { ObsState, Difficulty } from './types'
import { ISSUE_TITLES_AR } from './checks'
import { evidenceOf } from './evidence'
import { CAPS } from './state'

/* ── Recurring difficulties → a few actionable observations ────────────────
   An observation is only made from repeated, recorded events (≥ 2), and each
   one names the activity that practises it. No percentages, no predictions. */

export function noteDifficulty(o: ObsState, key: string, example: string, now: number): ObsState {
  const cur: Difficulty = o.difficulties[key] ?? { key, count: 0, lastAt: 0, examples: [] }
  const examples = example ? [...cur.examples.filter((e) => e !== example), example].slice(-CAPS.examples) : cur.examples
  return { ...o, difficulties: { ...o.difficulties, [key]: { key, count: cur.count + 1, lastAt: now, examples } }, updatedAt: now }
}

export type ObservationAction =
  | { kind: 'drill'; rule: 'v2' | 'verb-final' }
  | { kind: 'roleplay'; scenarioId: string }
  | { kind: 'recall' }
  | { kind: 'use-words' }
  | { kind: 'lesson' }

export interface Observation {
  id: string
  titleAr: string
  evidenceAr: string
  actionAr: string
  action: ObservationAction
}

const ACTIONS: Record<string, { actionAr: string; action: ObservationAction }> = {
  'v2-inversion': { actionAr: 'تمرين مركّز: الفعل بعد كلمة الزمن', action: { kind: 'drill', rule: 'v2' } },
  'verb-final': { actionAr: 'تمرين مركّز: الفعل في آخر الجملة', action: { kind: 'drill', rule: 'verb-final' } },
  'formal-u': { actionAr: 'حوار: الاتصال بالبلدية (مخاطبة رسمية)', action: { kind: 'roleplay', scenarioId: 'rp-gemeente' } },
  politeness: { actionAr: 'حوار: طلب المساعدة في متجر', action: { kind: 'roleplay', scenarioId: 'rp-winkel' } },
  goal: { actionAr: 'حوار: تغيير موعد بالهاتف', action: { kind: 'roleplay', scenarioId: 'rp-afspraak' } },
  recall: { actionAr: 'تذكّر الكلمات الآن', action: { kind: 'recall' } },
  paraphrase: { actionAr: 'جلسة قراءة جديدة مع مساعدة إعادة الصياغة', action: { kind: 'lesson' } },
  keyword: { actionAr: 'جلسة قراءة جديدة مع تمييز الكلمات المفتاحية', action: { kind: 'lesson' } },
  detail: { actionAr: 'جلسة قراءة جديدة', action: { kind: 'lesson' } },
}

export function observations(o: ObsState, max = 3): Observation[] {
  const out: Observation[] = []
  const recurring = Object.values(o.difficulties)
    .filter((d) => d.count >= 2 && ACTIONS[d.key])
    .sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
  for (const d of recurring) {
    const a = ACTIONS[d.key]
    out.push({
      id: 'd:' + d.key,
      titleAr: ISSUE_TITLES_AR[d.key] ?? d.key,
      evidenceAr: `تكرّر ${d.count} مرات في تمارينك المسجّلة.`,
      actionAr: a.actionAr,
      action: a.action,
    })
  }
  // Saved but never produced: a gap the learner can close right away.
  const unused = Object.values(o.expressions).filter((e) => e.savedAt && evidenceOf(e, o.settings.activeRule).independent === 0)
  if (unused.length >= 2) {
    out.push({
      id: 'unused',
      titleAr: 'تعابير محفوظة لم تُستخدم بعد',
      evidenceAr: `لديك ${unused.length} تعابير محفوظة بلا جملة واحدة من كتابتك.`,
      actionAr: 'اكتب جملة بها الآن',
      action: { kind: 'use-words' },
    })
  }
  return out.slice(0, max)
}
