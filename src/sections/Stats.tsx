import { useEffect, useRef } from 'react'
import { useAppStore, totalLearnedWords, sumLastNDays, sumPrevNDays } from '@/store/useAppStore'
import { PASS_THRESHOLD, SKILL_AR } from '@/data/phases'
import { dayKeyOffset, hexA } from '@/lib/utils'
import { InsightCard } from '@/components/InsightCard'

/* Chart.js generics make Chart<'bar'> unassignable to Chart[] — all the
   leak fix needs is destroy(), so track instances by that shape alone */
type DestroyableChart = { destroy(): void }

function destroyCharts(charts: DestroyableChart[]) {
  charts.forEach((ch) => { try { ch.destroy() } catch { /* already destroyed */ } })
  charts.length = 0
}

export default function Stats() {
  const skill        = useAppStore((s) => s.skill)
  const vocab        = useAppStore((s) => s.vocab)
  const streak       = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const theme        = useAppStore((s) => s.theme)
  const mountKey     = useRef(0)
  // Live Chart instances — each holds a canvas ref + ResizeObserver, so they
  // must be destroyed on unmount or every visit to this tab leaks all six
  const chartsRef    = useRef<DestroyableChart[]>([])

  const weekM  = sumLastNDays(dailyHistory, 'mins',       7)
  const lastWM = sumPrevNDays(dailyHistory, 'mins',       7, 7)
  const weekT  = sumLastNDays(dailyHistory, 'tasks',      7)
  const lastWT = sumPrevNDays(dailyHistory, 'tasks',      7, 7)
  const weekW  = sumLastNDays(dailyHistory, 'wordsAdded', 7)
  const lastWW = sumPrevNDays(dailyHistory, 'wordsAdded', 7, 7)
  const totW   = totalLearnedWords(vocab)

  const pctChg = (now: number, prev: number) =>
    prev ? Math.round(((now - prev) / prev) * 100) : (now > 0 ? 100 : 0)

  const weekInsights: { kind:'good'|'warn'; icon:string; title:string; desc:string }[] = [
    { kind: weekM>=lastWM?'good':'warn', icon:'⏱️', title:'دقائق الدراسة', desc:`${weekM} د هذا الأسبوع مقابل ${lastWM} د سابقًا (${pctChg(weekM,lastWM)>=0?'+':''}${pctChg(weekM,lastWM)}%)` },
    { kind: weekT>=lastWT?'good':'warn', icon:'✅', title:'المهام المنجزة', desc:`${weekT} مهمّة هذا الأسبوع مقابل ${lastWT} سابقًا (${pctChg(weekT,lastWT)>=0?'+':''}${pctChg(weekT,lastWT)}%)` },
    { kind: weekW>=lastWW?'good':'warn', icon:'📚', title:'كلمات جديدة مُضافة', desc:`${weekW} كلمة هذا الأسبوع مقابل ${lastWW} سابقًا (${pctChg(weekW,lastWW)>=0?'+':''}${pctChg(weekW,lastWW)}%)` },
  ]

  // Chart rendering — re-runs on theme change
  useEffect(() => {
    mountKey.current += 1
    const key = mountKey.current
    let cancelled = false
    // Stable array identity — captured once so the cleanup below sees the
    // same list the render pass pushed into (and eslint's ref rule is happy)
    const charts = chartsRef.current

    const render = async () => {
      const { Chart, registerables } = await import('chart.js')
      if (cancelled) return
      Chart.register(...registerables)

      const cs = getComputedStyle(document.documentElement)
      const color = (v: string, fb: string) => cs.getPropertyValue(v).trim() || fb
      const c = {
        txt:    color('--text2',   '#444A66'),
        grid:   color('--border',  '#E4DECE'),
        orange: color('--orange',  '#F58F20'),
        blue:   color('--blue',    '#2F77E0'),
        green:  color('--green',   '#467434'),
        purple: color('--purple',  '#8B5CF6'),
        amber:  color('--amber',   '#D98A2B'),
      }
      Chart.defaults.color = c.txt
      Chart.defaults.borderColor = c.grid
      Chart.defaults.font.family = "'Cairo','Readex Pro',sans-serif"

      // Destroy every chart this component created before building the new
      // set — Chart.getChart(byId) can't find charts whose canvas was
      // replaced by a remount, which is exactly how the old lookup leaked
      destroyCharts(charts)
      const track = (ch: DestroyableChart) => { charts.push(ch) }

      // 14-day data
      const days14: string[] = [], studyD: number[] = [], taskD: number[] = []
      for (let i = 13; i >= 0; i--) {
        const k = dayKeyOffset(-i); const h = dailyHistory[k] ?? {}
        days14.push(k.slice(5)); studyD.push(h.mins ?? 0); taskD.push(h.tasks ?? 0)
      }
      let cumW = Math.max(0, totW.learned - 14)
      const wordsD = days14.map((_, i) => {
        const h = dailyHistory[dayKeyOffset(-(13 - i))] ?? {}
        cumW += (h.wordsAdded ?? 0)
        return Math.min(totW.learned, Math.max(0, cumW))
      })

      const base = (extra: Record<string, unknown>) => ({
        responsive: true, maintainAspectRatio: false,
        scales: { x: { grid:{display:false}, ticks:{color:c.txt+'aa'} }, y: { grid:{color:c.grid}, ticks:{color:c.txt+'aa'}, ...extra } },
        plugins: { legend:{display:false}, tooltip:{backgroundColor:c.txt,titleColor:'#fff',bodyColor:'#fff'} },
      })

      const cs1 = document.getElementById('chStudy') as HTMLCanvasElement|null
      if (cs1) track(new Chart(cs1, { type:'bar', data:{ labels:days14, datasets:[{ label:'دقائق', data:studyD, backgroundColor:hexA(c.orange,.8), borderRadius:6 }]}, options:base({beginAtZero:true,precision:0}) }))

      const ct = document.getElementById('chTasks') as HTMLCanvasElement|null
      if (ct) track(new Chart(ct, { type:'bar', data:{ labels:days14, datasets:[{ label:'مهام', data:taskD, backgroundColor:hexA(c.green,.8), borderRadius:6 }]}, options:base({beginAtZero:true,precision:0}) }))

      const cw = document.getElementById('chWords') as HTMLCanvasElement|null
      if (cw) track(new Chart(cw, { type:'line', data:{ labels:days14, datasets:[{ label:'كلمات', data:wordsD, borderColor:c.purple, backgroundColor:hexA(c.purple,.2), tension:.35, fill:true, pointRadius:3 }]}, options:base({beginAtZero:true,precision:0}) }))

      // Skills horizontal bar
      const passPlugin = {
        id:'passLine',
        afterDatasetsDraw(chart: import('chart.js').Chart) {
          const x = chart.scales.x, area = chart.chartArea; if(!x||!area) return
          const px = x.getPixelForValue(PASS_THRESHOLD)
          const g = chart.ctx; g.save()
          g.strokeStyle=c.green; g.lineWidth=2; g.setLineDash([6,4])
          g.beginPath(); g.moveTo(px,area.top); g.lineTo(px,area.bottom); g.stroke()
          g.setLineDash([]); g.fillStyle=c.green; g.font="600 11px 'Cairo',sans-serif"
          g.textAlign='center'; g.textBaseline='bottom'; g.fillText('عتبة 65%',px,area.top-3); g.restore()
        }
      }
      const skL = [SKILL_AR.reading,SKILL_AR.listening,SKILL_AR.writing,SKILL_AR.speaking]
      const skS = [skill.reading.best,skill.listening.best,skill.writing.best,skill.speaking.best]
      const csk = document.getElementById('chSkills') as HTMLCanvasElement|null
      if (csk) track(new Chart(csk, {
        type:'bar',
        data:{ labels:skL, datasets:[{ label:'أفضل نتيجة', data:skS, backgroundColor:skS.map((v)=>hexA(v>=PASS_THRESHOLD?c.green:c.orange,.8)), borderColor:skS.map((v)=>v>=PASS_THRESHOLD?c.green:c.orange), borderWidth:1, borderRadius:6, borderSkipped:false }]},
        options:{ indexAxis:'y', responsive:true, maintainAspectRatio:false, layout:{padding:{top:16}}, scales:{ x:{min:0,max:100,grid:{color:c.grid},ticks:{color:c.txt,stepSize:25,callback:(v)=>v+'%'}}, y:{grid:{display:false},ticks:{color:c.txt,font:{size:13}}} }, plugins:{ legend:{display:false}, tooltip:{backgroundColor:c.txt,titleColor:'#fff',bodyColor:'#fff',callbacks:{label:(ctx)=>(ctx.parsed.x??0)+'%'+((ctx.parsed.x??0)>=PASS_THRESHOLD?' ✓ فوق العتبة':' — تحت العتبة')}} } },
        plugins:[passPlugin]
      }))

      // 56-day sparkline
      const act56: string[] = [], actD: number[] = []
      for (let i = 55; i >= 0; i--) { const k = dayKeyOffset(-i); act56.push(k.slice(5)); actD.push(dailyHistory[k]?.mins??0) }
      const ca = document.getElementById('chActivity') as HTMLCanvasElement|null
      if (ca) {
        const actCtx = ca.getContext('2d')!
        const grad = actCtx.createLinearGradient(0,0,0,ca.height||260)
        grad.addColorStop(0, hexA(c.orange,.55)); grad.addColorStop(1, hexA(c.orange,0))
        track(new Chart(ca, { type:'line', data:{ labels:act56, datasets:[{ data:actD, borderColor:c.orange, borderWidth:2.2, backgroundColor:grad, fill:true, tension:.38, pointRadius:0, pointHoverRadius:5 }]}, options:{ responsive:true, maintainAspectRatio:false, interaction:{mode:'index',intersect:false}, scales:{ x:{grid:{display:false},ticks:{color:c.txt+'aa',maxRotation:0,autoSkip:true,maxTicksLimit:8}}, y:{grid:{color:c.grid},ticks:{color:c.txt+'aa'},beginAtZero:true} }, plugins:{ legend:{display:false}, tooltip:{backgroundColor:'#1C1812',titleColor:'#fff',bodyColor:'#fff',borderColor:c.orange,borderWidth:1,displayColors:false,callbacks:{label:(ctx)=>ctx.parsed.y+' دقيقة'}} } } }))
      }

      // Exam trend
      const sk = ['reading','listening','writing','speaking'] as const
      const cols = [c.blue,c.green,c.amber,c.purple]
      const ce = document.getElementById('chExamTrend') as HTMLCanvasElement|null
      if (ce) track(new Chart(ce, { type:'line', data:{ datasets: sk.map((k,i)=>({ label:SKILL_AR[k], data:(skill[k].history??[]).map((h)=>({x:h.date,y:h.score})), borderColor:cols[i], backgroundColor:hexA(cols[i],.1), tension:.3, pointRadius:4, fill:false })) }, options:{ responsive:true, maintainAspectRatio:false, scales:{ x:{type:'category',ticks:{color:c.txt+'aa'}}, y:{min:0,max:100,grid:{color:c.grid},ticks:{color:c.txt+'aa',callback:(v)=>v+'%'}} }, plugins:{ legend:{position:'bottom',labels:{color:c.txt}}, tooltip:{callbacks:{label:(ctx)=>ctx.dataset.label+': '+ctx.parsed.y+'%'}} } } }))

      void key
    }

    render().catch(console.error)
    return () => {
      cancelled = true
      // Unmount / theme switch: release the canvases and their ResizeObservers
      destroyCharts(charts)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme])

  const streakCount = streak.count
  const act56Data = Array.from({length:56}, (_,i) => dailyHistory[dayKeyOffset(-(55-i))]?.mins ?? 0)
  const peakVal = Math.max(0, ...act56Data)
  const peakIdx = act56Data.lastIndexOf(peakVal)
  const peakDay = peakVal > 0 ? dayKeyOffset(-(55 - peakIdx)).slice(5) : null
  const act56Sum = act56Data.reduce((a, b) => a + b, 0)
  const flameClass = streakCount>=30?'blaze':streakCount>=7?'hot':streakCount>=1?'alive':''

  return (
    <div style={{ padding:'24px 28px 60px', maxWidth:1100, margin:'0 auto' }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:700, color:'var(--text)', margin:'0 0 12px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ color:'var(--orange)' }}>📈</span> لوحة التحليلات الاستراتيجية
      </h2>
      <div style={{ background:'var(--purple-l)', border:'1px solid var(--glass-border)', borderInlineStart:'3px solid var(--purple)', borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:18, fontSize:'.9rem', color:'var(--text2)', lineHeight:1.65 }}>
        <strong style={{ color:'var(--text)' }}>تتبّع يومي وأسبوعي شامل:</strong> كلّ الرسوم البيانية تستخدم بياناتك الحقيقية من سجلّ التطبيق.
      </div>

      {/* Progress rings */}
      <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'0 0 10px' }}>🎯 مؤشّرات الأداء الرئيسية</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:14, marginBottom:18 }}>
        {(['reading','listening','writing','speaking'] as const).map((k, i) => {
          const v = skill[k].best; const att = skill[k].attempts
          const colors = ['var(--c1)','var(--c4)','var(--c2)','var(--c5)']
          const col = colors[i]
          const C = 2*Math.PI*42; const offset = C-(C*v/100)
          return (
            <div key={k} style={{ background:'var(--glass-bg)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:16, textAlign:'center', boxShadow:'var(--elev-1), inset 0 1px 0 var(--glass-hi)' }}>
              <svg viewBox="0 0 100 100" style={{ width:96, height:96, display:'block', margin:'0 auto 8px' }} role="img" aria-label={`${SKILL_AR[k]}: ${v}%`}>
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface3)" strokeWidth="8"/>
                <circle cx="50" cy="50" r="42" fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 50 50)"/>
                <text x="50" y="56" textAnchor="middle" style={{ fontFamily:'var(--font-display)', fontSize:'1.4rem', fontWeight:700, fill:'var(--text)' }}>{v}%</text>
              </svg>
              <div style={{ fontSize:'.85rem', color:'var(--text2)', fontWeight:600 }}>
                {['📖','🎧','✍️','🗣️'][i]} {SKILL_AR[k]}
              </div>
              <div style={{ fontSize:'.74rem', color:'var(--muted)', marginTop:2 }}>
                {att} محاولة • {v>=PASS_THRESHOLD?'✓ ناجح':'لم تصل العتبة'}
              </div>
            </div>
          )
        })}
      </div>

      {/* Charts 2×2 */}
      <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'18px 0 10px' }}>📊 الاتّجاهات الأسبوعية</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:14, marginBottom:18 }}>
        {[
          { id:'chStudy',  title:'دقائق الدراسة اليومية (آخر 14 يوم)' },
          { id:'chTasks',  title:'المهام المنجزة يوميًا' },
          { id:'chWords',  title:'الكلمات المُكتسبة (تراكمي)' },
          { id:'chSkills', title:'المهارات مقابل عتبة النجاح' },
        ].map(({ id, title }) => (
          <div key={id} style={{ background:'var(--glass-bg)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:16, boxShadow:'var(--elev-1), inset 0 1px 0 var(--glass-hi)' }}>
            <div style={{ fontSize:'.95rem', fontWeight:600, color:'var(--text)', marginBottom:12 }}>{title}</div>
            <div style={{ position:'relative', height:230 }}><canvas id={id} /></div>
          </div>
        ))}
      </div>

      {/* Streak + sparkline */}
      <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'18px 0 10px', display:'flex', alignItems:'center', gap:8 }}>
        <span aria-hidden="true" style={{ fontSize:'1em', display:'inline-block', animation:flameClass?'flame-flicker 2.6s ease-in-out infinite':'none' }}>
          {streakCount>=1?'🔥':'🕯️'}
        </span>
        موجة النشاط
        <span style={{ display:'inline-flex', alignItems:'center', borderRadius:999, padding:'2px 10px', fontSize:'.78rem', fontWeight:600, background:streakCount===0?'var(--surface3)':'var(--orange-l)', color:streakCount===0?'var(--muted)':'var(--orange)' }} aria-label="عدد أيام السلسلة">
          {streakCount} يوم متتالٍ
        </span>
      </h3>
      <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:16, boxShadow:'var(--elev-1)', marginBottom:18 }}>
        <div style={{ fontSize:'.78rem', color:'var(--muted)', marginBottom:12 }}>آخر 56 يوم — مجموع {act56Sum} دقيقة</div>
        <div style={{ position:'relative', height:260 }}><canvas id="chActivity" /></div>
        <div style={{ marginTop:10, fontSize:'.78rem', color:'var(--muted)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
          {peakDay ? <span>🌊 ذروتك: <strong style={{ color:'var(--text2)' }}>{peakVal} د</strong> ({peakDay})</span>
            : <span>ابدأ جلستك الأولى لترى موجة نشاطك تكبر هنا</span>}
        </div>
      </div>

      {/* Exam trend */}
      <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'18px 0 10px' }}>📈 تقدّم نتائج الامتحان</h3>
      <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(14px)', WebkitBackdropFilter:'blur(14px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:16, boxShadow:'var(--elev-1)', marginBottom:18 }}>
        <div style={{ fontSize:'.78rem', color:'var(--muted)', marginBottom:12 }}>آخر محاولات لكلّ مهارة — الخطّ الأخضر هو عتبة النجاح في NT2 (65%)</div>
        <div style={{ position:'relative', height:300 }}><canvas id="chExamTrend" /></div>
      </div>

      {/* Week insights */}
      <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'18px 0 10px' }}>💡 رؤى مقارنة (هذا الأسبوع مقابل الأسبوع الماضي)</h3>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12 }}>
        {weekInsights.map((ins, i) => <InsightCard key={i} kind={ins.kind} icon={ins.icon} title={ins.title} desc={ins.desc} />)}
      </div>
    </div>
  )
}
