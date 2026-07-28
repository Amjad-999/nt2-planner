import { useEffect, useState, type ReactNode } from 'react'

/* غلاف موحّد لكل نتيجة تأتي من الشبكة داخل لوحة كاتيا.
   يوجد لأن الحالات الثلاث (انتظار / لا اتصال / فشل المصدر) تتكرّر في كل
   مصدر، وتركها لكل عرضٍ على حدة يعني نسيان إحداها حتمًا — وأسوأها الفشل
   الصامت الذي يترك اللوحة فارغة بلا تفسير.

   يُحمَّل مرّة واحدة عند التركيب. لإعادة الاستعلام يُمرَّر مفتاح مختلف من
   الأب (key={query}) فيُعاد تركيبه نظيفًا — نفس اصطلاح MascotBubble في هذا
   المستودع، وهو ما يبقي setState خارج جسم الـ effect (قاعدة
   react-hooks/set-state-in-effect). */

type Phase = 'loading' | 'ok' | 'empty' | 'offline'

interface Props<T> {
  /** يُستدعى مرّة عند التركيب. يعيد null/[] عند تعذّر النتيجة. */
  load: () => Promise<T | null>
  children: (data: T) => ReactNode
  /** نصّ يوضّح ما الذي تعذّر — يظهر مع زرّ إعادة المحاولة. */
  emptyText: string
}

function isEmpty(v: unknown): boolean {
  return v === null || v === undefined || (Array.isArray(v) && v.length === 0)
}

function offlineNow(): boolean {
  return typeof navigator !== 'undefined' && navigator.onLine === false
}

export function LiveResult<T>({ load, children, emptyText }: Props<T>) {
  // الحالة الأولى تُحسب عند التركيب لا داخل effect
  const [phase, setPhase] = useState<Phase>(() => (offlineNow() ? 'offline' : 'loading'))
  const [data, setData] = useState<T | null>(null)
  // زيادته تُعيد المحاولة دون إعادة تركيب من الأب
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (offlineNow()) return
    let alive = true
    // setState هنا داخل رد نداء الوعد لا في جسم الـ effect
    load().then((res) => {
      if (!alive) return
      if (isEmpty(res)) { setPhase('empty'); return }
      setData(res)
      setPhase('ok')
    })
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount + explicit retry only; a new query remounts via key
  }, [attempt])

  if (phase === 'loading') {
    return <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--muted)' }}>لحظة، أسأل العالم… 🐱</p>
  }

  if (phase === 'offline') {
    return (
      <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--text2)', lineHeight: 1.6 }}>
        لا يوجد اتصال الآن. كل ما هو محفوظ في التطبيق يعمل كالمعتاد — هذا القسم وحده يحتاج الإنترنت.
      </p>
    )
  }

  if (phase === 'empty' || data === null) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-start' }}>
        <p style={{ margin: 0, fontSize: '.84rem', color: 'var(--text2)', lineHeight: 1.6 }}>{emptyText}</p>
        <button
          onClick={() => { setPhase(offlineNow() ? 'offline' : 'loading'); setAttempt((n) => n + 1) }}
          style={{
            background: 'var(--btn-bg)', border: '1px solid var(--glass-border)', borderRadius: 8,
            padding: '4px 10px', cursor: 'pointer', color: 'var(--text)', fontSize: '.76rem', fontFamily: 'inherit',
          }}
        >
          أعِد المحاولة
        </button>
      </div>
    )
  }

  return <>{children(data)}</>
}
