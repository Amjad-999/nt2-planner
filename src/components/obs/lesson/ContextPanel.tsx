import { useState } from 'react'
import type { LessonItem } from '@/features/observatory/types'
import { useObs } from '@/hooks/useObs'
import { uid, CAPS } from '@/features/observatory/state'
import { Passage } from './shared'
import { Button } from '../ui'
import { INotePencil } from '../icons'

/* Supporting context for the lesson: the glossary (simple Dutch first,
   Arabic when assistance is on), the full text after the first step, and a
   notes field saved into My Learning. Side panel ≥1200px, sheet below. */

export function ContextPanel({ item, showText }: { item: LessonItem; showText: boolean }) {
  const [o, update] = useObs()
  const [draft, setDraft] = useState('')
  const [savedMsg, setSavedMsg] = useState('')
  const notes = o.notes.filter((n) => !n.deleted && n.ref === item.id)
  const ar = o.settings.assistLang === 'ar'

  const addNote = () => {
    const text = draft.trim()
    if (!text) return
    const now = Date.now()
    update((x) => ({ ...x, notes: [...x.notes, { id: uid('n', now), text, ref: item.id, createdAt: now, updatedAt: now, deleted: false }].slice(-CAPS.notes), updatedAt: now }))
    setDraft('')
    setSavedMsg('حُفظت الملاحظة في «تعلّمي».')
  }

  return (
    <div className="o-context">
      <h3>مفردات النص</h3>
      <ul className="o-gloss">
        {item.glossary.map((g) => (
          <li key={g.nl}>
            <span className="o-nl" lang="nl">{g.nl}</span>
            <span className="o-small o-nl" lang="nl">{g.simpleNl}</span>
            {ar && <span className="o-small">{g.ar}</span>}
          </li>
        ))}
      </ul>

      {showText && (
        <details style={{ marginTop: 12 }}>
          <summary className="o-link" style={{ minHeight: 44, display: 'flex', alignItems: 'center' }}>النص كاملًا</summary>
          <Passage item={item} />
        </details>
      )}

      <h3>ملاحظاتي على هذا الموضوع</h3>
      {notes.length > 0 && (
        <ul className="o-list" style={{ marginBottom: 8 }}>
          {notes.map((n) => <li key={n.id} className="o-card o-small" style={{ color: 'var(--o-ink)' }}>{n.text}</li>)}
        </ul>
      )}
      <label className="o-field">
        <span className="o-sr">ملاحظة جديدة</span>
        <textarea className="o-textarea" rows={3} value={draft} onChange={(e) => { setDraft(e.target.value); setSavedMsg('') }} placeholder="مثلًا: «ophalen» ينفصل: ik haal … op" />
      </label>
      <div className="o-row" style={{ marginTop: 8 }}>
        <Button size="sm" variant="secondary" icon={INotePencil} onClick={addNote} disabled={!draft.trim()}>احفظ الملاحظة</Button>
        <span className="o-small" role="status">{savedMsg}</span>
      </div>
    </div>
  )
}
