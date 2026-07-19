import { useRef, type ReactNode } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/* نسخة خفيفة بلا framer-motion — هذا المكوّن يعيش في مسار الإقلاع (TopBar)
   وكان وجوده هناك يسحب framer كاملة (~130KB مصغّرة) إلى الحزمة الرئيسية.
   الانجذاب عبر transform مباشرة + transition CSS يعطي نفس الإحساس النابضي. */
export function Magnetic({ children, strength = 0.25, maxShift = 5, className }: {
  children: ReactNode
  strength?: number
  maxShift?: number
  className?: string
}) {
  const reduced = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const dx = (e.clientX - (r.left + r.width / 2)) * strength
    const dy = (e.clientY - (r.top + r.height / 2)) * strength
    const x = Math.max(-maxShift, Math.min(maxShift, dx))
    const y = Math.max(-maxShift, Math.min(maxShift, dy))
    el.style.transform = `translate(${x}px, ${y}px)`
  }
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = 'translate(0, 0)'
  }

  if (reduced) return <div className={className}>{children}</div>
  return (
    <div
      ref={ref}
      className={className}
      style={{ transition: 'transform .18s cubic-bezier(.34,1.3,.64,1)', willChange: 'transform' }}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
    >
      {children}
    </div>
  )
}
