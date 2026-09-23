import type { SessionRecord, RoleplaySummary, Attempt } from '@/features/observatory/types'
import { findItem } from '@/data/observatory/items'
import { findRoleplay } from '@/data/observatory/roleplays'
import { ISSUE_TITLES_AR } from '@/features/observatory/checks'
import { mins, shortDate, arWeekday } from '@/features/observatory/format'
import { todayKey } from '@/lib/utils'
import { RecordingPlayer } from '../RecordingPlayer'
import { Chip, Meta } from '../ui'
import { IChatsCircle, IBookmarkSimple, IMicrophone } from '../icons'

/* A readable history of ACTUAL work: finished sessions (planned vs measured
   minutes side by side), finished role-plays with what was noticed, and saved
   recordings the learner can replay. Newest first. */

type Entry =
  | { kind: 'session'; at: number; s: SessionRecord }
  | { kind: 'roleplay'; at: number; r: RoleplaySummary }
  | { kind: 'recording'; at: number; a: Attempt }

export function HistoryList({ sessions, roleplays, attempts = [], demo, limit = 20 }: {
  sessions: SessionRecord[]; roleplays: RoleplaySummary[]; attempts?: Attempt[]; demo?: boolean; limit?: number
}) {
  const entries: Entry[] = [
    ...sessions.map((s) => ({ kind: 'session' as const, at: s.finishedAt, s })),
    ...roleplays.map((r) => ({ kind: 'roleplay' as const, at: r.finishedAt, r })),
    ...attempts.filter((a) => a.recordingId).map((a) => ({ kind: 'recording' as const, at: a.at, a })),
  ].sort((x, y) => y.at - x.at).slice(0, limit)

  if (!entries.length) return <p className="o-small">لا عمل مسجّل بعد. كل جلسة وحوار وتسجيل تنهيه يظهر هنا بتاريخه.</p>

  return (
    <ol className="o-timeline">
      {entries.map((e) => (
        <li key={`${e.kind}-${e.kind === 'session' ? e.s.id : e.kind === 'roleplay' ? e.r.id : e.a.id}`} className="o-timeline__item">
          <Meta>{`${shortDate(e.at)} · ${arWeekday(todayKey(new Date(e.at)))}`}</Meta>
          {e.kind === 'session' && (
            <div className="o-card">
              <strong>جلسة: {findItem(e.s.itemId)?.topicAr ?? 'محتوى غير متاح'}{demo && ' (مثال)'}</strong>
              <span className="o-small">
                {e.s.firstTry}/{e.s.questions} أسئلة من المحاولة الأولى · {e.s.buildsRight}/{e.s.builds} جمل · تذكّر {e.s.recalled}/{e.s.recallTotal} ·
                {' '}{e.s.retell === 'skipped' ? 'بلا إعادة سرد' : e.s.retell === 'typed' ? 'إعادة سرد مكتوبة' : e.s.retell === 'recorded' ? 'إعادة سرد مسجّلة' : 'إعادة سرد مسجّلة ومكتوبة'}
              </span>
              <span className="o-row" style={{ gap: 6 }}>
                <Chip>مخطط ≈ {Math.round(e.s.estMin)} د</Chip>
                <Chip tone="cobalt">فعلي {mins(e.s.actualMin)} د</Chip>
                {e.s.saved.length > 0 && <Chip tone="mint" icon={IBookmarkSimple}>{e.s.saved.length} تعابير محفوظة</Chip>}
              </span>
            </div>
          )}
          {e.kind === 'roleplay' && (
            <div className="o-card">
              <strong className="o-row" style={{ gap: 6 }}><IChatsCircle size={18} />حوار: {findRoleplay(e.r.scenarioId)?.titleAr ?? e.r.scenarioId}{demo && ' (مثال)'}</strong>
              <span className="o-small">{e.r.turns} ردود · {e.r.issues.length ? `لوحظ: ${e.r.issues.map((k) => ISSUE_TITLES_AR[k] ?? k).join('، ')}` : 'لا ملاحظة قاعدية'}</span>
            </div>
          )}
          {e.kind === 'recording' && (
            <div className="o-card">
              <strong className="o-row" style={{ gap: 6 }}><IMicrophone size={18} />تسجيل: {e.a.kind === 'retell' ? `إعادة سرد — ${findItem(e.a.refId)?.topicAr ?? ''}` : `حوار — ${findRoleplay(e.a.refId)?.titleAr ?? ''}`}</strong>
              {e.a.text && <span className="o-nl o-small" lang="nl">{e.a.text.slice(0, 160)}{e.a.text.length > 160 ? '…' : ''}</span>}
              <div><RecordingPlayer id={e.a.recordingId} label="استمع للتسجيل" /></div>
            </div>
          )}
        </li>
      ))}
    </ol>
  )
}
