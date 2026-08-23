import { useCallback, useSyncExternalStore } from 'react'

/**
 * ساعة حيّة: تُعيد `Date.now()` وتُحدَّث كل `intervalMs`.
 *
 * لماذا لا نستخدم عدّادًا تنازليًا؟ لأن `setInterval` غير دقيق ويتوقّف
 * تمامًا في التبويبات الخلفية وعند تعليق الجهاز. هذا الخطّاف لا يحسب
 * الوقت — هو فقط يُجبر إعادة الرسم، والوقت المتبقّي يُشتقّ دائمًا من
 * ساعة النظام. النتيجة: أيّ فجوة (خلفية، سكون، إعادة تحميل) تُصحَّح
 * تلقائيًا في أول إعادة رسم.
 *
 * مبنيّ على `useSyncExternalStore` لأن الوقت مصدر خارجي بطبعه، لا حالة
 * React. هذا يتجنّب `setState` داخل التأثيرات ويجعل كل المكوّنات على نفس
 * الإيقاع تتشارك مؤقّتًا واحدًا بدل أن يُنشئ كلٌّ منها مؤقّته.
 */

interface Clock {
  value: number
  listeners: Set<() => void>
  timer: ReturnType<typeof setInterval> | null
  detach: (() => void) | null
}

const clocks = new Map<number, Clock>()

function getClock(intervalMs: number): Clock {
  let c = clocks.get(intervalMs)
  if (!c) {
    c = { value: Date.now(), listeners: new Set(), timer: null, detach: null }
    clocks.set(intervalMs, c)
  }
  return c
}

function tick(c: Clock) {
  c.value = Date.now()
  for (const l of c.listeners) l()
}

function subscribe(intervalMs: number, onChange: () => void): () => void {
  const c = getClock(intervalMs)
  c.listeners.add(onChange)

  if (c.timer === null) {
    // قيمة طازجة فور الاشتراك — React يُعيد قراءة اللقطة بعد subscribe.
    c.value = Date.now()
    c.timer = setInterval(() => tick(c), intervalMs)

    // العودة من الخلفية: صحّح فورًا بدل انتظار النبضة التالية.
    const onWake = () => { if (document.visibilityState === 'visible') tick(c) }
    document.addEventListener('visibilitychange', onWake)
    window.addEventListener('focus', onWake)
    window.addEventListener('pageshow', onWake)
    c.detach = () => {
      document.removeEventListener('visibilitychange', onWake)
      window.removeEventListener('focus', onWake)
      window.removeEventListener('pageshow', onWake)
    }
  }

  return () => {
    c.listeners.delete(onChange)
    if (c.listeners.size === 0 && c.timer !== null) {
      clearInterval(c.timer)
      c.timer = null
      c.detach?.()
      c.detach = null
    }
  }
}

/** اشتراك خامل: لا مؤقّت، لا إعادة رسم. */
const noopSubscribe = () => () => {}

export function useTicker(intervalMs = 1000, active = true): number {
  const sub = useCallback(
    (onChange: () => void) => (active ? subscribe(intervalMs, onChange) : noopSubscribe()),
    [intervalMs, active],
  )
  const snapshot = useCallback(() => getClock(intervalMs).value, [intervalMs])
  return useSyncExternalStore(sub, snapshot, snapshot)
}
