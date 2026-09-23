import { useEffect, useRef } from 'react'
import type { RoleplayScenario, RoleplayRun } from '@/features/observatory/types'
import { reviewIssues } from '@/features/observatory/roleplay'
import { ISSUE_TITLES_AR } from '@/features/observatory/checks'
import { expressionSeed } from '@/data/observatory/items'
import { SpeakButton } from '../lesson/shared'
import { Button, Chip, Meta } from '../ui'
import { IArrowCounterClockwise, ICheckCircle, IArrowLeft } from '../icons'
import { RecordingPlayer } from '../RecordingPlayer'

/* After the exchange: for every turn, the learner's original, a more natural
   version, and ONE short explanation. Only what a rule actually detected is
   named as an issue; otherwise the model is offered as an alternative, not
   as a correction. */

export function RoleplayReview({ sc, run, onRestart, onBack }: { sc: RoleplayScenario; run: RoleplayRun; onRestart: () => void; onBack: () => void }) {
  const issues = reviewIssues(sc, run)
  const title = useRef<HTMLHeadingElement>(null)
  useEffect(() => { title.current?.focus({ preventScroll: true }) }, [])
  const total = issues.reduce((n, l) => n + l.length, 0)
  return (
    <div className="o-rp">
      <header className="o-night o-rp__head">
        <Meta>{`TERUGBLIK · ${sc.titleNl.toUpperCase()}`}</Meta>
        <h1 className="o-h2" tabIndex={-1} ref={title} style={{ outline: 'none' }}>مراجعة الحوار: {sc.titleAr}</h1>
        <p className="o-lede">{total ? `لاحظنا ${total} نقطة لغوية في ${issues.filter((l) => l.length).length} من ردودك — مرتّبة أدناه بجانب نسخة طبيعية.` : 'لم تلتقط القواعد البسيطة أي مشكلة. قارن مع ذلك جملك بالنسخ الطبيعية أدناه.'}</p>
        <p className="o-small">تُفحص فقط: المخاطبة الرسمية، ترتيب الفعل، صيغة الطلب، وتغطية المطلوب. ليس تقييمًا شاملًا للغة.</p>
      </header>

      <ol className="o-list" style={{ marginTop: 16 }}>
        {sc.turns.map((spec, k) => {
          const t = run.turns[k]
          const list = issues[k]
          const main = list[0]
          return (
            <li key={k} className="o-card o-rp__review">
              <Meta>{`BEURT ${k + 1}`}</Meta>
              <p className="o-small">{spec.goalAr}</p>
              <div className="o-rp__cmp">
                <div>
                  <span className="o-small">جملتك</span>
                  <p className="o-nl" lang="nl">{t?.text || (t?.recordingId ? '(ردّ صوتي — استمع وقارن)' : '—')}</p>
                  {t?.recordingId && <RecordingPlayer id={t.recordingId} />}
                </div>
                <div>
                  <span className="o-small">نسخة أكثر طبيعية</span>
                  <p className="o-nl" lang="nl"><b>{spec.modelNl}</b></p>
                  <SpeakButton text={spec.modelNl} />
                </div>
              </div>
              <div className="o-row" style={{ gap: 6 }}>
                {list.map((iss) => <Chip key={iss.key} tone="warn">{ISSUE_TITLES_AR[iss.key]}</Chip>)}
                {!list.length && t?.text && <Chip tone="mint" icon={ICheckCircle}>لا ملاحظة قاعدية</Chip>}
              </div>
              <p>{main ? main.explainAr : spec.tipAr}</p>
            </li>
          )
        })}
      </ol>

      {sc.expressionIds.length > 0 && (
        <p className="o-small" style={{ marginTop: 12 }}>
          تعابير هذا الموقف: {sc.expressionIds.map((id) => expressionSeed(id)?.seed.nl).filter(Boolean).join(' · ')} — ما استخدمته بجملك يُضاف إلى «كلماتي» كاستخدام مستقل.
        </p>
      )}

      <div className="o-actions">
        <Button variant="primary" icon={IArrowCounterClockwise} onClick={onRestart}>أعد الحوار</Button>
        <Button variant="secondary" icon={IArrowLeft} flipIcon onClick={onBack}>كل المواقف</Button>
      </div>
    </div>
  )
}
