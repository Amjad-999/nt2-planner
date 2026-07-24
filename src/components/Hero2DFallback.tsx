import { useState, useEffect, useRef } from 'react'
import { useAppStore, getDaysLeft, getPlanTotal, getCurrentDay } from '@/store/useAppStore'
import { useCountdown } from '@/hooks/useCountdown'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { todayKey } from '@/lib/utils'

// FIX 2 — proofreading pass:
//   • 'يومٌ مبارك'   → 'يوم مبارك'   (drop tanwin: cleaner in digital text)
//   • 'لنرَ'          → 'لنرى'          (standard spelling)
const GREETINGS = [
  'أهلًا بك في NT2 Planner',
  'يوم مبارك — هيا نواصل التقدّم',
  'مرحبًا من جديد — رحلتك إلى B1 مستمرّة',
  'goedendag — مخطّط NT2 جاهز لك',
  'هيا بنا — كل يوم خطوة نحو الامتحان',
  'سلام — لنرى أين وصلت اليوم',
]

export function Hero2DFallback() {
  const name        = useAppStore((s) => s.name)
  const examDate    = useAppStore((s) => s.examDate)
  const planDay     = useAppStore((s) => s.planDay)
  const streak      = useAppStore((s) => s.streak)
  const planStart   = useAppStore((s) => s.planStart)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const reduced     = useReducedMotion()

  const cardRef   = useRef<HTMLDivElement>(null)
  const embersRef = useRef<HTMLDivElement>(null)
  const blob1Ref  = useRef<HTMLDivElement>(null)
  const blob2Ref  = useRef<HTMLDivElement>(null)
  const burstRef  = useRef<HTMLDivElement>(null)

  // FIX 2 — stable greeting: picked ONCE per mount (or when name changes).
  // Previously Math.random() ran on every render, causing rapid flicker
  // as the countdown ticker re-rendered the dashboard each second.
  const [greeting] = useState<string>(() => {
    const g = [...GREETINGS]
    // Personalise the first two variants if we already know the name
    const n = useAppStore.getState().name
    if (n) {
      g[0] = `أهلًا بك يا ${n}`
      g[2] = `مرحبًا ${n} — رحلتك إلى B1 مستمرّة`
    }
    return g[Math.floor(Math.random() * g.length)]
  })

  const { days } = useCountdown(examDate)
  const daysLeft  = getDaysLeft(examDate)
  const planTotal = getPlanTotal({ planStart, examDate })
  const planDayNow = getCurrentDay({ planStart, planDay }, planTotal)
  const todayMins = dailyHistory[todayKey()]?.mins ?? 0

  useEffect(() => {
    if (reduced) return
    const rnd = (a: number, b: number) => a + Math.random() * (b - a)

    if (blob1Ref.current) {
      const el = blob1Ref.current
      const palette = [[18,38],[12,32],[320,18],[38,60],[0,18]]
      const pair = palette[Math.floor(Math.random() * palette.length)]
      el.style.setProperty('--blob-h1', String(pair[0]))
      el.style.setProperty('--blob-h2', String(pair[1]))
      el.style.setProperty('--blob-angle', rnd(0, 360).toFixed(0) + 'deg')
      el.style.setProperty('--blob-x', rnd(-15, 5).toFixed(0) + '%')
      el.style.setProperty('--blob-y', rnd(15, 45).toFixed(0) + '%')
      el.style.setProperty('--blob-size', (rnd(300, 440) | 0) + 'px')
      el.style.setProperty('--blob-dx', (rnd(-26, 26) | 0) + 'px')
      el.style.setProperty('--blob-dy', (rnd(-14, 14) | 0) + 'px')
      el.style.setProperty('--blob-dur', rnd(22, 34).toFixed(0) + 's')
    }

    if (blob2Ref.current) {
      const el = blob2Ref.current
      const pal2 = [[34,14],[44,20],[10,30],[28,8]]
      const p2 = pal2[Math.floor(Math.random() * pal2.length)]
      el.style.setProperty('--b2-h1', String(p2[0]))
      el.style.setProperty('--b2-h2', String(p2[1]))
      el.style.setProperty('--b2-angle', rnd(120, 300).toFixed(0) + 'deg')
      el.style.setProperty('--b2-x', rnd(-14, 8).toFixed(0) + '%')
      el.style.setProperty('--b2-y', rnd(28, 55).toFixed(0) + '%')
      el.style.setProperty('--b2-size', (rnd(260, 360) | 0) + 'px')
      el.style.setProperty('--b2-dx', (rnd(-24, 24) | 0) + 'px')
      el.style.setProperty('--b2-dy', (rnd(-16, 16) | 0) + 'px')
      el.style.setProperty('--b2-dur', rnd(26, 40).toFixed(0) + 's')
    }

    if (embersRef.current && !embersRef.current.childElementCount) {
      const n = 3 + (Math.random() * 3 | 0)
      const warmHues = [18, 28, 38, 12, 44]
      for (let k = 0; k < n; k++) {
        const e = document.createElement('span')
        e.className = 'ember'
        e.style.left = rnd(8, 92).toFixed(1) + '%'
        e.style.setProperty('--eh', String(warmHues[Math.random() * warmHues.length | 0]))
        e.style.setProperty('--es', (rnd(4, 9) | 0) + 'px')
        e.style.setProperty('--erise', (rnd(90, 180) | 0) + 'px')
        e.style.setProperty('--edx', (rnd(-18, 18) | 0) + 'px')
        e.style.setProperty('--ed', rnd(7, 12).toFixed(1) + 's')
        e.style.setProperty('--edl', rnd(0, 6).toFixed(1) + 's')
        embersRef.current.appendChild(e)
      }
    }

    if (burstRef.current) {
      const burst = burstRef.current
      if (!burst.querySelector('i')) burst.appendChild(document.createElement('i'))
      requestAnimationFrame(() => {
        setTimeout(() => burst.classList.add('fire'), 240)
        setTimeout(() => burst.classList.remove('fire'), 1700)
      })
    }
  }, [reduced])

  void days   // live countdown kept in sync via topbar pill
  void name   // read by the stable greeting above, not needed here

  return (
    <div
      ref={cardRef}
      className="rounded-[calc(var(--r)+4px)] p-6 px-7 mb-5 relative overflow-hidden"
      style={{
        background: 'var(--grad-hero)',
        border: '1px solid rgba(255,244,235,.12)',
        boxShadow: 'var(--elev-3), inset 0 1px 0 rgba(255,244,235,.12)',
        isolation: 'isolate',
      }}
    >
      {/* Decorative layers (aria-hidden — purely visual) */}
      <div ref={blob1Ref} className="hero-blob" aria-hidden="true"
        style={{ position:'absolute', top:'var(--blob-y,30%)', right:'var(--blob-x,-10%)', width:'var(--blob-size,360px)', height:'var(--blob-size,360px)', borderRadius:'50%', background:'conic-gradient(from var(--blob-angle,90deg), var(--blob-cool1), var(--blob-cool2), var(--blob-cool1))', filter:'blur(56px)', opacity:.55, zIndex:0, animation: reduced ? 'none' : 'blob-drift var(--blob-dur,28s) ease-in-out infinite', pointerEvents:'none', willChange:'transform' }} />
      <div ref={blob2Ref} className="hero-blob b2" aria-hidden="true"
        style={{ position:'absolute', top:'var(--b2-y,42%)', left:'var(--b2-x,-8%)', right:'auto', width:'var(--b2-size,300px)', height:'var(--b2-size,300px)', borderRadius:'50%', background:'conic-gradient(from var(--b2-angle,210deg), var(--blob-cool3), transparent 58%, var(--blob-cool2))', filter:'blur(60px)', opacity:.42, zIndex:0, animation: reduced ? 'none' : 'blob-drift2 var(--b2-dur,32s) ease-in-out infinite', pointerEvents:'none', willChange:'transform' }} />
      <div aria-hidden="true"
        style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none', opacity:.05, mixBlendMode:'overlay', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")` }} />
      <div ref={embersRef} aria-hidden="true"
        style={{ position:'absolute', inset:0, zIndex:0, pointerEvents:'none', overflow:'hidden' }} />
      <div ref={burstRef} className="hero-burst" aria-hidden="true"
        style={{ position:'absolute', top:18, right:24, width:80, height:80, zIndex:2, pointerEvents:'none' }} />

      {/* Content */}
      <div style={{ position:'relative', zIndex:1 }}>
        <h1 style={{ fontFamily:'var(--font-display)', fontSize:'1.8rem', fontWeight:'var(--fw-heading)', color:'#FBF3EA', marginBottom:6, letterSpacing:'-.4px', position:'relative', display:'inline-block' }}>
          {greeting}
          <span aria-hidden="true" style={{ position:'absolute', insetInlineEnd:0, bottom:-6, width:'clamp(48px,40%,120px)', height:3, borderRadius:3, background:'linear-gradient(270deg,var(--hero-accent),transparent)', opacity:.9 }} />
        </h1>
        <div style={{ fontSize:'.9rem', color:'rgba(217,201,184,.82)', lineHeight:1.5, marginTop:6 }}>
          منصة متكاملة للوصول إلى مستوى B1 الفعلي المطلوب في امتحان NT2 — خطة تكيّفية، تحليلات يومية وأسبوعية، محاكاة امتحان رسمية، وذكاء اصطناعي مدمج.
        </div>
        <div style={{ display:'flex', gap:16, marginTop:14, flexWrap:'wrap' }}>
          {[
            { icon:'📅', label:'المتبقّي:', value: daysLeft == null ? '—' : String(daysLeft), unit:'يومًا' },
            { icon:'📍', label:'اليوم:', value: String(planDayNow), unit:`/ ${planTotal}` },
            { icon:'⏱️', label:'درست اليوم:', value: String(todayMins), unit:'دقيقة' },
            { icon:'🔥', label:'مواظبة:', value: String(streak.count), unit:'يوم' },
          ].map((ck) => (
            <div key={ck.label} style={{ background:'rgba(255,244,235,.12)', border:'1px solid rgba(255,244,235,.16)', backdropFilter:'blur(6px)', borderRadius:10, padding:'8px 14px', color:'#EBDCC9', display:'flex', alignItems:'center', gap:8, fontSize:'.85rem' }}>
              {ck.icon} <span>{ck.label}</span>
              <b style={{ color:'var(--hero-accent)', fontSize:'1.05rem', fontWeight:700 }}>{ck.value}</b>
              <span>{ck.unit}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
