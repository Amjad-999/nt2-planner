import { useState } from 'react'
import { useObs } from '@/hooks/useObs'
import { uid, CAPS } from '@/features/observatory/state'
import { findItem } from '@/data/observatory/items'
import { shortDate } from '@/features/observatory/format'
import { Button } from '../ui'
import { INotePencil, ITrash, IArrowCounterClockwise, ICheck } from '../icons'

/* Saved notes: add, edit in place, delete with undo. Deletion is a tombstone
   (so another device does not bring the note back on sync). */

export function NotesPanel() {
  const [o, update] = useObs()
  const [draft, setDraft] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editText, setEditText] = useState('')
  const [undo, setUndo] = useState<string | null>(null)
  const notes = o.notes.filter((n) => !n.deleted).sort((a, b) => b.updatedAt - a.updatedAt)

  const setNote = (id: string, patch: { text?: string; deleted?: boolean }) =>
    update((x) => ({ ...x, notes: x.notes.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)), updatedAt: Date.now() }))

  const add = () => {
    const text = draft.trim()
    if (!text) return
    update((x) => {
      const now = Date.now()
      return { ...x, notes: [...x.notes, { id: uid('n', now), text, ref: '', createdAt: now, updatedAt: now, deleted: false }].slice(-CAPS.notes), updatedAt: now }
    })
    setDraft('')
  }

  return (
    <div className="o-stack" style={{ gap: 0 }}>
      <label className="o-field">
        <span className="o-label">ملاحظة جديدة</span>
        <textarea className="o-textarea" rows={2} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="قاعدة، كلمة، سؤال لمعلّمك…" />
      </label>
      <div style={{ marginTop: 8 }}><Button size="sm" variant="secondary" icon={INotePencil} onClick={add} disabled={!draft.trim()}>احفظ</Button></div>
      {undo && (
        <div className="o-notice o-notice--info" role="status" style={{ marginTop: 12 }}>
          <span className="o-grow">حُذفت الملاحظة.</span>
          <Button size="sm" variant="secondary" icon={IArrowCounterClockwise} onClick={() => { setNote(undo, { deleted: false }); setUndo(null) }}>تراجع</Button>
        </div>
      )}
      {notes.length === 0 ? <p className="o-small" style={{ marginTop: 12 }}>لا ملاحظات بعد. يمكنك أيضًا الكتابة من «لوحة السياق» داخل أي درس.</p> : (
        <ul className="o-list" style={{ marginTop: 12 }}>
          {notes.map((n) => (
            <li key={n.id} className="o-card">
              <span className="o-small">{shortDate(n.updatedAt)}{n.ref && findItem(n.ref) ? ` · ${findItem(n.ref)!.topicAr}` : ''}</span>
              {editing === n.id ? (
                <>
                  <label className="o-field"><span className="o-sr">عدّل الملاحظة</span>
                    <textarea className="o-textarea" rows={3} value={editText} onChange={(e) => setEditText(e.target.value)} />
                  </label>
                  <div className="o-row">
                    <Button size="sm" variant="secondary" icon={ICheck} onClick={() => { setNote(n.id, { text: editText.trim() || n.text }); setEditing(null) }}>احفظ التعديل</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button>
                  </div>
                </>
              ) : (
                <>
                  <p style={{ whiteSpace: 'pre-wrap', lineHeight: 1.8 }}>{n.text}</p>
                  <div className="o-row" style={{ gap: 4 }}>
                    <Button size="sm" variant="ghost" icon={INotePencil} onClick={() => { setEditing(n.id); setEditText(n.text) }}>عدّل</Button>
                    <Button size="sm" variant="ghost" icon={ITrash} onClick={() => { setNote(n.id, { deleted: true }); setUndo(n.id) }}>احذف</Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
