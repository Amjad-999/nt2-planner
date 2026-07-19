/**
 * useCountUp — عدّاد الأرقام (P3 المجموعة 5)
 * يتحقق أن العدّ يبدأ من الصفر، يتقدم عبر rAF، ويستقر على الهدف
 * خلال المدة المحددة (ثانيتان افتراضيًا).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCountUp } from '@/hooks/useCountUp'

// rAF مضبوط يدويًا: نتحكم بالوقت إطارًا بإطار
let now = 0
let rafQueue: FrameRequestCallback[] = []

beforeEach(() => {
  now = 0
  rafQueue = []
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    rafQueue.push(cb)
    return rafQueue.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
})

afterEach(() => vi.unstubAllGlobals())

function tick(ms: number) {
  now += ms
  const q = rafQueue
  rafQueue = []
  act(() => { q.forEach((cb) => cb(now)) })
}

describe('useCountUp', () => {
  it('يبدأ من 0 ويصل إلى الهدف بعد المدة كاملة', () => {
    const { result } = renderHook(() => useCountUp(80, 2000))
    expect(result.current).toBe(0)

    tick(16)            // الإطار الأول يثبّت نقطة البداية
    tick(500)           // ~ربع المدة
    const quarter = result.current
    expect(quarter).toBeGreaterThan(0)
    expect(quarter).toBeLessThan(80)

    tick(1000)          // ~ثلاثة أرباع المدة
    const late = result.current
    expect(late).toBeGreaterThan(quarter)

    tick(600)           // تجاوز المدة → القيمة النهائية بالضبط
    expect(result.current).toBe(80)
  })

  it('منحنى تباطؤ: النصف الأول يقطع أكثر من نصف المسافة', () => {
    const { result } = renderHook(() => useCountUp(100, 2000))
    tick(16)
    tick(1000)
    expect(result.current).toBeGreaterThan(50)
  })

  it('تغيير الهدف لاحقًا يكمل من القيمة الحالية لا من الصفر', () => {
    const { result, rerender } = renderHook(({ t }) => useCountUp(t, 2000), { initialProps: { t: 50 } })
    tick(16)
    tick(3000)
    expect(result.current).toBe(50)

    rerender({ t: 90 })
    tick(16)
    tick(200)
    // بعد لحظة من الهدف الجديد يجب أن نكون فوق الهدف القديم وتحت الجديد
    expect(result.current).toBeGreaterThan(50)
    expect(result.current).toBeLessThan(90)
    tick(3000)
    expect(result.current).toBe(90)
  })
})
