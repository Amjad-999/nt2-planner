/* ── Backup validation ─────────────────────────────────────────────────────
   An import replaces the learner's data, so it must prove it IS learner data
   before anything is touched. The old path ran any parsed JSON through
   applyState(), which turns `{}` (or someone's unrelated JSON file) into a
   fresh default state — silently wiping real progress. This check runs
   first; the store only applies a payload that passes it. */

export type BackupProblem = 'empty' | 'json' | 'shape' | 'types' | 'too-large'

export interface BackupSummary {
  savedAt: number
  vocab: number
  examWords: number
  sessions: number
  expressions: number
  notes: number
  days: number
}

export type BackupCheck =
  | { ok: true; state: Record<string, unknown>; summary: BackupSummary }
  | { ok: false; problem: BackupProblem }

export const BACKUP_PROBLEM_AR: Record<BackupProblem, string> = {
  empty: 'الملف فارغ.',
  json: 'هذا ليس ملف JSON صالحًا.',
  shape: 'الملف لا يبدو نسخة احتياطية من هذا التطبيق.',
  types: 'بعض الحقول في الملف تالفة (أنواع بيانات غير متوقعة).',
  'too-large': 'الملف أكبر من المتوقع لنسخة احتياطية.',
}

/** Fields that exist in every real NT2 Planner save, with their JSON types. */
const KNOWN: Record<string, 'array' | 'object' | 'string' | 'number' | 'boolean'> = {
  vocab: 'array', examWords: 'array', dailyHistory: 'object', skill: 'object', prefs: 'object',
  done: 'object', streak: 'object', observatory: 'object', studyProgram: 'object',
  name: 'string', examDate: 'string', planStart: 'string', theme: 'string',
  studySec: 'number', planDay: 'number', _v: 'number', _savedAt: 'number', onboarded: 'boolean',
}

const typeOf = (v: unknown) => (Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v)

export function validateBackup(raw: string, maxBytes = 25 * 1024 * 1024): BackupCheck {
  if (!raw || !raw.trim()) return { ok: false, problem: 'empty' }
  if (raw.length > maxBytes) return { ok: false, problem: 'too-large' }
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { return { ok: false, problem: 'json' } }
  const root = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed as Record<string, unknown> : null
  if (!root) return { ok: false, problem: 'shape' }
  const state = root.state && typeof root.state === 'object' && !Array.isArray(root.state) ? root.state as Record<string, unknown> : root

  const present = Object.keys(KNOWN).filter((k) => k in state)
  // A real save carries nearly all of these; three (including one of the
  // data collections) is a deliberately low bar that still rejects arbitrary
  // JSON and empty objects.
  if (present.length < 3 || !('vocab' in state || 'dailyHistory' in state || 'observatory' in state)) {
    return { ok: false, problem: 'shape' }
  }
  const wrong = present.filter((k) => typeOf(state[k]) !== KNOWN[k] && state[k] !== null)
  if (wrong.length) return { ok: false, problem: 'types' }

  const obs = (state.observatory ?? {}) as Record<string, unknown>
  const len = (v: unknown) => (Array.isArray(v) ? v.length : 0)
  const keys = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? Object.keys(v).length : 0)
  return {
    ok: true,
    state,
    summary: {
      savedAt: typeof state._savedAt === 'number' ? state._savedAt : 0,
      vocab: len(state.vocab),
      examWords: len(state.examWords),
      sessions: len(obs.history),
      expressions: keys(obs.expressions),
      notes: Array.isArray(obs.notes) ? obs.notes.filter((n) => n && typeof n === 'object' && !(n as { deleted?: boolean }).deleted).length : 0,
      days: keys(state.dailyHistory),
    },
  }
}
