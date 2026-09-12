import { useState } from 'react'
import { Tilt } from './MotionFx'
import { useCountUp } from '@/hooks/useCountUp'

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

/**
 * الرقم وحده يعدّ — في مكوّن صغير عمدًا.
 *
 * KpiCard used to hand-roll this loop, and got three things wrong that the
 * shared hook already handles:
 *   1. no cancelAnimationFrame, so every value change left the previous
 *      2-second loop running and writing to the same node — two loops racing
 *      over one textContent, and one still running after unmount;
 *   2. it restarted from 0 on every change, so typing in the minutes field
 *      made the number stampede up from zero on each keystroke;
 *   3. 2000ms meant the card showed a wrong number for most of the time the
 *      user was looking at it. 900ms keeps the flourish and hands the real
 *      figure over quickly — these are the numbers the app exists to report.
 * useCountUp resumes from the displayed value and is covered by
 * src/tests/unit/count-up.test.ts. It re-renders on each frame, which is why
 * this wrapper is one <span> and not the whole card.
 */
function CountingValue({ target }: { target: number }) {
  const n = useCountUp(target, 900)
  return <>{Math.round(n)}</>
}

export function KpiCard({ cls, icon, label, value, delta, deltaClass, editable, editKind = 'number', editRaw, min, max, onSave, onEditClick }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  /* Only a bare integer counts. The other KPIs are composites — "12/184",
     "65%", "3 يوم" — and animating those would mean animating text. */
  const raw = String(value)
  const countable = !editing && /^\d+$/.test(raw)

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
      /* عمود مرن: البطاقات تتساوى في الارتفاع مع صفّ الشبكة، فلو بقي
         التخطيط كتليًّا تكدّس المحتوى أعلى البطاقة وتُرك فراغ ميت أسفلها،
         وجلس زرّ «تعديل» عند ارتفاع مختلف في كل بطاقة بحسب طول نصّها.
         mt-auto يثبّت الإجراء في القاع فتتحاذى الأزرار عبر الصفّ. */
      className="relative overflow-hidden rounded-card p-[14px_16px] glow-card w-full flex flex-col"
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

      <div className="text-[var(--text-2xs)] text-[var(--muted)] uppercase tracking-[.5px] mb-1 pe-10">{label}</div>

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
          className="w-full text-[var(--text-xl)] font-bold leading-[1.1] text-[var(--text)]"
          style={{ background: 'var(--surface)', border: '1px solid var(--orange)', borderRadius: 'var(--r-sm)', padding: '6px 10px', fontFamily: 'inherit', outline: 'none' }}
        />
      ) : (
        <div
          className="text-[var(--text-2xl)] font-bold leading-[1.1] text-[var(--text)] pe-10 card-value"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {countable ? <CountingValue target={Number(raw)} /> : value}
        </div>
      )}

      <div className="text-[var(--text-xs)] mt-1 font-medium" style={{ color: deltaColor }}>
        {deltaIcon}{delta}
      </div>

      {editable && !editing && (
        <button
          type="button"
          onClick={startEdit}
          aria-label={`تعديل ${label}`}
          className="mt-auto pt-2.5 self-start inline-flex items-center gap-1 cursor-pointer text-[var(--text-2xs)] font-semibold rounded-lg px-2.5 py-1"
          style={{ background: 'var(--btn-bg)', border: '1px solid var(--btn-border)', color: 'var(--orange-text)', boxShadow: 'var(--elev-1)' }}
        >
          ✎ تعديل
        </button>
      )}
      {editing && (
        <div className="mt-auto pt-2 text-[var(--text-2xs)]" style={{ color: 'var(--muted)' }}>اضغط Enter للحفظ · Esc للإلغاء</div>
      )}
    </Tilt>
  )
}
