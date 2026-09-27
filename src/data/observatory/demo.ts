import type { SessionRecord, RoleplaySummary } from '@/features/observatory/types'

/* ── Demonstration history ──────────────────────────────────────────────────
   Sample records to show what "My Learning" looks like after a few weeks.
   Displayed ONLY when the learner turns on «عرض بيانات تجريبية», always
   under a "مثال — ليس تقدّمك" label, and never written into the store, never
   synced, never counted anywhere. Dates are relative to "now" at render. */

const DAY = 86_400_000

export function demoHistory(now: number): { sessions: SessionRecord[]; roleplays: RoleplaySummary[] } {
  const at = (d: number) => now - d * DAY
  const key = (d: number) => {
    const x = new Date(at(d))
    return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`
  }
  const s = (d: number, itemId: string, est: number, actual: number, firstTry: number, buildsRight: number, saved: string[], retell: SessionRecord['retell']): SessionRecord => ({
    id: `demo-${d}`, itemId, dayKey: key(d), finishedAt: at(d), estMin: est, actualMin: actual, questions: 3, firstTry, builds: 2,
    buildsRight, saved, retell, recalled: 1, recallTotal: 2,
  })
  return {
    sessions: [
      s(1, 'obs-afspraak', 24, 27.5, 2, 1, ['x-afspraak-verzetten'], 'recorded'),
      s(3, 'obs-apotheek', 25, 31, 1, 2, ['x-medicijnen-ophalen', 'x-innemen'], 'typed'),
      s(6, 'obs-werk', 24, 22, 3, 2, ['x-hulp-vragen'], 'both'),
    ],
    roleplays: [{ id: 'demo-rp', scenarioId: 'rp-afspraak', finishedAt: at(2), turns: 4, issues: ['v2-inversion'] }],
  }
}
