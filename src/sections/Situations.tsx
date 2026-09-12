import { useState } from 'react'
import { SITUATIONS } from '@/data/situations'
import { SituationDialogue } from '@/components/practice/SituationDialogue'

/**
 * مواقف من الحياة اليومية — practical conversations for life in the
 * Netherlands: the supermarket, the municipality, the GP, a job interview,
 * the neighbours, the train, school and work.
 */
export default function Situations() {
  const [openId, setOpenId] = useState<string | null>(null)
  const open = SITUATIONS.find((s) => s.id === openId)

  if (open) {
    return (
      <div className="page page--narrow">
        <SituationDialogue key={open.id} situation={open} onExit={() => setOpenId(null)} />
      </div>
    )
  }

  return (
    <div className="page">
      <h2 className="section-title" style={{ marginBottom: 'var(--sp-1)' }}>مواقف من الحياة اليومية</h2>
      <p style={{ margin: '0 0 var(--sp-4)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)', maxWidth: '62ch' }}>
        جمل حقيقية ستحتاجها في هولندا. اقرأ ما يقوله الشخص الآخر أو استمع إليه، واختر الردّ المناسب، ثم قله بصوتك.
      </p>
      <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 'var(--sp-3)', gridTemplateColumns: 'repeat(auto-fill, minmax(min(260px, 100%), 1fr))' }}>
        {SITUATIONS.map((s) => (
          <li key={s.id} style={{ display: 'flex' }}>
            <button
              type="button"
              onClick={() => setOpenId(s.id)}
              className="card"
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 'var(--sp-1)',
                width: '100%', textAlign: 'start', cursor: 'pointer', font: 'inherit', color: 'var(--text)',
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', gap: 'var(--sp-2)' }}>
                <span aria-hidden="true" style={{ fontSize: 'var(--glyph-sm)' }}>{s.icon}</span>
                <span className="chip chip--info" dir="ltr">{s.level}</span>
              </span>
              <span style={{ fontSize: 'var(--text-base)', fontWeight: 'var(--fw-heading)' }}>{s.titleAr}</span>
              <span dir="ltr" lang="nl" style={{ color: 'var(--text2)', fontSize: 'var(--text-sm)', fontFamily: 'var(--font-latin)' }}>{s.titleNl}</span>
              <span style={{ color: 'var(--text2)', fontSize: 'var(--text-xs)', marginTop: 'var(--sp-1)' }}>{s.turns.length} جمل · {s.phrases.length} عبارات للحفظ</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
