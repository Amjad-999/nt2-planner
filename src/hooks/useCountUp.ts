import { useEffect, useRef, useState } from 'react'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * يعدّ من 0 إلى القيمة المستهدفة عبر requestAnimationFrame بمنحنى تباطؤ
 * (easeOutCubic). عند تغيّر الهدف لاحقًا يكمل العدّ من القيمة المعروضة بدل
 * القفز إلى الصفر. مع prefers-reduced-motion تُعرض القيمة النهائية فورًا.
 * ضَع الاستدعاء في مكوّن صغير حتى لا يُعاد رسم شجرة كبيرة كل إطار.
 */
export function useCountUp(target: number, duration = 2000): number {
  const reduced = useReducedMotion()
  const [value, setValue] = useState(() => (reduced ? target : 0))
  const fromRef = useRef(reduced ? target : 0)

  useEffect(() => {
    if (reduced) { fromRef.current = target; return }
    const from = fromRef.current
    if (from === target) return
    let raf = 0
    let start: number | null = null
    const step = (ts: number) => {
      if (start === null) start = ts
      const p = Math.min((ts - start) / duration, 1)
      const eased = 1 - Math.pow(1 - p, 3)
      setValue(from + (target - from) * eased)
      if (p < 1) raf = requestAnimationFrame(step)
      else { fromRef.current = target; setValue(target) }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration, reduced])

  // مع تقليل الحركة لا حاجة لأي حالة — القيمة النهائية مباشرة
  return reduced ? target : value
}
