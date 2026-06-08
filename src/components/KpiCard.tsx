import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface Props {
  cls: string   // k1..k6
  icon: string
  label: string
  value: string | number
  delta: string
  deltaClass: 'up' | 'down' | 'flat'
}

export function KpiCard({ cls, icon, label, value, delta, deltaClass }: Props) {
  const valRef = useRef<HTMLDivElement>(null)

  // Animate number on mount / value change
  useEffect(() => {
    const el = valRef.current
    if (!el) return
    const num = parseFloat(String(value))
    if (isNaN(num) || String(value).includes('/')) return // skip non-numeric or fractions
    let start: number | null = null
    const duration = 600
    const from = 0
    const step = (ts: number) => {
      if (start === null) start = ts
      const p = Math.min((ts - start) / duration, 1)
      el.textContent = String(Math.round(from + (num - from) * p))
      if (p < 1) requestAnimationFrame(step)
      else el.textContent = String(value)
    }
    requestAnimationFrame(step)
  }, [value])

  const deltaColor = deltaClass === 'up' ? 'var(--green)' : deltaClass === 'down' ? 'var(--red)' : 'var(--muted)'
  const deltaIcon = deltaClass === 'up' ? '↑ ' : deltaClass === 'down' ? '↓ ' : ''

  const icBg: Record<string, string> = {
    k1: 'var(--blue-l)', k2: 'var(--green-l)', k3: 'var(--orange-l)',
    k4: 'var(--purple-l)', k5: 'var(--amber-l)', k6: 'var(--teal-l)',
  }
  const icColor: Record<string, string> = {
    k1: 'var(--blue)', k2: 'var(--green)', k3: 'var(--orange)',
    k4: 'var(--purple)', k5: 'var(--amber)', k6: 'var(--teal)',
  }

  return (
    <motion.div
      className="relative overflow-hidden rounded-card p-[14px_16px]"
      style={{
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(16px) saturate(1.3)',
        WebkitBackdropFilter: 'blur(16px) saturate(1.3)',
        border: '1px solid var(--glass-border)',
        boxShadow: 'var(--elev-1), inset 0 1px 0 var(--glass-hi)',
      }}
      whileHover={{ translateY: -4, boxShadow: 'var(--elev-3)' }}
      transition={{ duration: 0.2 }}
    >
      {/* Icon */}
      <div
        className="absolute top-[14px] start-[14px] w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[.95rem]"
        style={{ background: icBg[cls] ?? 'var(--surface3)', color: icColor[cls] ?? 'var(--text)', boxShadow: 'var(--elev-1), inset 0 1px 0 rgba(255,255,255,.45)' }}
        aria-hidden="true"
      >
        {icon}
      </div>
      <div className="text-[.74rem] text-[var(--muted)] uppercase tracking-[.5px] mb-1 pe-10">{label}</div>
      <div ref={valRef} className="text-[1.65rem] font-bold leading-[1.1] text-[var(--text)] pe-10" style={{ fontFamily: 'var(--font-display,"Plus Jakarta Sans",serif)' }}>
        {value}
      </div>
      <div className="text-[.78rem] mt-1 font-medium" style={{ color: deltaColor }}>
        {deltaIcon}{delta}
      </div>
    </motion.div>
  )
}
