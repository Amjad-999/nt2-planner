import { useEffect, useRef, useState } from 'react'
import { Tilt } from './MotionFx'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface Props {
  cls: string   // k1..k6
  icon: React.ReactNode
  label: string
  value: string | number
  delta: string
  deltaClass: 'up' | 'down' | 'flat'
  editable?: boolean
  editKind?: 'number' | 'date'
  editRaw?: string
  min?: number
  max?: number
  onSave?: (val: string) => void
  onEditClick?: () => void
}

export function KpiCard({ cls, icon, label, value, delta, deltaClass, editable, editKind = 'number', editRaw, min, max, onSave, onEditClick }: Props) {
  const valRef = useRef<HTMLDivElement>(null)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const reduced = useReducedMotion()

  useEffect(() => {
    if (editing || reduced) return
    const el = valRef.current
    if (!el) return
    const num = parseFloat(String(value))
    if (isNaN(num) || String(value).includes('/')) return
    let start: number | null = null
    const duration = 600
    const step = (ts: number) => {
      if (start === null) start = ts
      const p = Math.min((ts - start) / duration, 1)
      el.textContent = String(Math.round(num * p))
      if (p < 1) requestAnimationFrame(step)
      else el.textContent = String(value)
    }
    requestAnimationFrame(step)
  }, [value, editing, reduced])

  const deltaColor = deltaClass === 'up' ? 'var(--green)' : deltaClass === 'down' ? 'var(--red)' : 'var(--muted)'
  const deltaIcon  = deltaClass === 'up' ? '↑ ' : deltaClass === 'down' ? '↓ ' : ''

  const icBg: Record<string, string> = {
    k1: 'var(--blue-l)', k2: 'var(--green-l)', k3: 'var(--orange-l)',
    k4: 'var(--purple-l)', k5: 'var(--amber-l)', k6: 'var(--teal-l)',
  }
  const icColor: Record<string, string> = {
    k1: 'var(--blue)', k2: 'var(--green)', k3: 'var(--orange)',
    k4: 'var(--purple)', k5: 'var(--amber)', k6: 'var(--teal)',
  }

  const startEdit = () => {
    if (onEditClick) { onEditClick(); return }
    setDraft(editRaw ?? String(value))
    setEditing(true)
  }
  const commit = () => { onSave?.(draft); setEditing(false) }
  const cancel = () => setEditing(false)

  return (
    <Tilt
      disabled={editing}
      className="relative overflow-hidden rounded-card p-[14px_16px] glow-card"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--elev-1), inset 0 1px 0 var(--glass-hi)',
      }}
    >
      {!editing && (
        <div
          className="absolute top-[14px] end-[14px] w-[34px] h-[34px] rounded-lg flex items-center justify-center card-icon"
          style={{
            background: icBg[cls] ?? 'var(--surface3)',
            color: icColor[cls] ?? 'var(--text)',
            boxShadow: 'var(--elev-1), inset 0 1px 0 rgba(255,255,255,.45)',
          }}
          aria-hidden="true"
        >
          {icon}
        </div>
      )}

      <div className="text-[.74rem] text-[var(--muted)] uppercase tracking-[.5px] mb-1 pe-10">{label}</div>

      {editing ? (
        <input
          autoFocus
          type={editKind}
          defaultValue={draft}
          min={min}
          max={max}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commit(); else if (e.key === 'Escape') cancel() }}
          onBlur={commit}
          aria-label={`قيمة ${label}`}
          className="w-full text-[1.4rem] font-bold leading-[1.1] text-[var(--text)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--orange)', borderRadius: 10, padding: '6px 10px', fontFamily: 'inherit', outline: 'none' }}
        />
      ) : (
        <div
          ref={valRef}
          className="text-[1.65rem] font-bold leading-[1.1] text-[var(--text)] pe-10 card-value"
          style={{ fontFamily: 'var(--font-display,"Plus Jakarta Sans",serif)' }}
        >
          {value}
        </div>
      )}

      <div className="text-[.78rem] mt-1 font-medium" style={{ color: deltaColor }}>
        {deltaIcon}{delta}
      </div>

      {editable && !editing && (
        <button
          type="button"
          onClick={startEdit}
          aria-label={`تعديل ${label}`}
          className="mt-2.5 inline-flex items-center gap-1 cursor-pointer text-[.72rem] font-semibold rounded-lg px-2.5 py-1"
          style={{ background: 'var(--btn-bg)', border: '1px solid var(--btn-border)', color: 'var(--orange)', boxShadow: 'var(--elev-1)' }}
        >
          ✎ تعديل
        </button>
      )}
      {editing && (
        <div className="mt-2 text-[.7rem]" style={{ color: 'var(--muted)' }}>اضغط Enter للحفظ · Esc للإلغاء</div>
      )}
    </Tilt>
  )
}
