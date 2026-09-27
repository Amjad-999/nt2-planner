import { useEffect, useRef } from 'react'
import { useAppStore, sumLastNDays, sumPrevNDays } from '@/store/useAppStore'
import { PASS_THRESHOLD, SKILL_AR } from '@/data/phases'
import { dayKeyOffset, hexA } from '@/lib/utils'
import { InsightCard } from '@/components/InsightCard'
import { useCountUp } from '@/hooks/useCountUp'
import { Callout } from '@/components/ui/Callout'
import { ProgressOverview } from '@/components/ProgressOverview'
import { StudyKpis } from '@/components/progress/StudyKpis'
import { SmartInsights } from '@/components/progress/SmartInsights'
import { AchievementsPanel } from '@/components/AchievementsPanel'
import { weeklyChange } from '@/features/progress/insights'

/* Chart.js generics make Chart<'bar'> unassignable to Chart[] — all the
   leak fix needs is destroy(), so track instances by that shape alone */
type DestroyableChart = { destroy(): void }

function destroyCharts(charts: DestroyableChart[]) {
  charts.forEach((ch) => { try { ch.destroy() } catch { /* already destroyed */ } })
  charts.length = 0
}

/* حلقة مهارة: العدّاد وامتلاء الحلقة يقودهما useCountUp نفسه (ثانيتان) —
   مكوّن معزول حتى تبقى إعادة الرسم كل إطار محصورة فيه لا في الصفحة كلها */
function SkillRing({ label, icon, v, att }: {
  label: string; icon: string; v: number; att: number
}) {
  const n = useCountUp(att > 0 ? v : 0, 600)
  const C = 2 * Math.PI * 42
  const offset = C - (C * n) / 100
  // P5: اللون حسب القيمة — أحمر < 50، كهرماني 50–75، أخضر > 75
  const col = att === 0 ? 'var(--border)' : v >= PASS_THRESHOLD ? 'var(--green)' : 'var(--amber)'
  return (
    <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:16, textAlign:'center', boxShadow:'var(--elev-1), inset 0 1px 0 var(--glass-hi)' }}>
      <svg viewBox="0 0 100 100" style={{ width:96, height:96, display:'block', margin:'0 auto 8px' }} role="img" aria-label={att ? `${label}: أفضل نتيجة مسجّلة ${v}%` : `${label}: لا توجد محاولات بعد`}>
        <circle cx="50" cy="50" r="42" fill="none" stroke="var(--surface3)" strokeWidth="8"/>
        <circle cx="50" cy="50" r="42" fill="none" stroke={col} strokeWidth="8" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 50 50)"/>
        <text x="50" y="56" textAnchor="middle" style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-xl)', fontWeight:'var(--fw-cta)', fill:'var(--text)' }}>{att ? `${Math.round(n)}%` : '—'}</text>
      </svg>
      <div style={{ fontSize:'var(--text-sm)', color:'var(--text2)', fontWeight:'var(--fw-heading)' }}>
        {icon} {label}
      </div>
      <div style={{ fontSize:'var(--text-sm)', color:'var(--text2)', marginTop:'var(--sp-1)' }}>
        {att ? `${att} محاولة · ${v >= PASS_THRESHOLD ? '✓ بلغت هدف التدريب' : '◐ تحتاج إلى تدريب'}` : 'لم تُجرّب هذه المهارة بعد'}
      </div>
    </div>
  )
}

export default function Stats() {
  const skill        = useAppStore((s) => s.skill)
  const streak       = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const theme        = useAppStore((s) => s.theme)
  // Live Chart instances — each holds a canvas ref + ResizeObserver, so they
  // must be destroyed on unmount or every visit to this tab leaks all six
  const chartsRef    = useRef<DestroyableChart[]>([])

  const weekM  = sumLastNDays(dailyHistory, 'mins',       7)
  const lastWM = sumPrevNDays(dailyHistory, 'mins',       7, 7)
  const weekT  = sumLastNDays(dailyHistory, 'tasks',      7)
  const lastWT = sumPrevNDays(dailyHistory, 'tasks',      7, 7)
  const weekW  = sumLastNDays(dailyHistory, 'wordsAdded', 7)
  const lastWW = sumPrevNDays(dailyHistory, 'wordsAdded', 7, 7)

  const weekInsights: { kind:'good'|'warn'; icon:string; title:string; desc:string }[] = [
    { kind: weekM>=lastWM?'good':'warn', icon:'⏱️', title:'دقائق الدراسة', desc:`${weekM} د في آخر 7 أيام مقابل ${lastWM} د في الأيام السبعة السابقة (${weeklyChange(weekM,lastWM)})` },
    { kind: weekT>=lastWT?'good':'warn', icon:'✅', title:'المهام المنجزة', desc:`${weekT} مهمّة في آخر 7 أيام مقابل ${lastWT} سابقًا (${weeklyChange(weekT,lastWT)})` },
    { kind: weekW>=lastWW?'good':'warn', icon:'📚', title:'كلمات جديدة مُضافة', desc:`${weekW} كلمة في آخر 7 أيام مقابل ${lastWW} سابقًا (${weeklyChange(weekW,lastWW)})` },
  ]

  // Chart rendering — re-runs on theme change
  useEffect(() => {
    let cancelled = false
    // Stable array identity — captured once so the cleanup below sees the
    // same list the render pass pushed into (and eslint's ref rule is happy)
    const charts = chartsRef.current

    const render = async () => {
      const { Chart, registerables } = await import('chart.js')
      if (cancelled) return
      Chart.register(...registerables)

      const cs = getComputedStyle(document.documentElement)
      const color = (v: string) => cs.getPropertyValue(v).trim()
      const c = {
        txt:    color('--text2'),
        grid:   color('--border'),
        orange: color('--orange'),
        blue:   color('--blue'),
        green:  color('--green'),
        purple: color('--purple'),
        amber:  color('--amber'),
        tooltipBg: color('--surface'),
        tooltipText: color('--text'),
      }
      Chart.defaults.color = c.txt
      Chart.defaults.borderColor = c.grid
      Chart.defaults.font.family = cs.getPropertyValue('--font-body').trim() || 'sans-serif'

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
      const wordsD = days14.map((_, i) => {
        const h = dailyHistory[dayKeyOffset(-(13 - i))] ?? {}
        return h.wordsAdded ?? 0
      })

      // P5: ظهور تدريجي من اليسار (تأخير متدرج لكل نقطة) + ارتداد نقاط hover.
      // تُعطَّل الحركة بالكامل مع prefers-reduced-motion.
      const reducedAnim = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      const staggerIn = reducedAnim ? (false as const) : {
        delay: (ctx: { type: string; mode: string; dataIndex?: number }) =>
          ctx.type === 'data' && ctx.mode === 'default' ? (ctx.dataIndex ?? 0) * 55 : 0,
      }
      const bouncePoints = reducedAnim ? {} : { radius: { duration: 420, easing: 'easeOutBounce' as const } }
      const base = (extra: Record<string, unknown>) => ({
        responsive: true, maintainAspectRatio: false,
        animation: staggerIn,
        animations: bouncePoints,
        scales: { x: { grid:{display:false}, ticks:{color:c.txt+'aa'} }, y: { grid:{color:c.grid}, ticks:{color:c.txt+'aa'}, ...extra } },
        plugins: { legend:{display:false}, tooltip:{backgroundColor:c.txt,titleColor:'#fff',bodyColor:'#fff'} },
      })

      // مخطط الدقائق: مساحي (Area) بتدرج برتقالي يذوب نحو الأسفل
      const cs1 = document.getElementById('chStudy') as HTMLCanvasElement|null
      if (cs1) {
        const g1 = cs1.getContext('2d')!.createLinearGradient(0, 0, 0, cs1.height || 220)
        g1.addColorStop(0, hexA(c.orange, .5)); g1.addColorStop(1, hexA(c.orange, 0))
        track(new Chart(cs1, { type:'line', data:{ labels:days14, datasets:[{ label:'دقائق', data:studyD, borderColor:c.orange, borderWidth:2.2, backgroundColor:g1, fill:true, tension:.35, pointRadius:3, pointHoverRadius:7, pointBackgroundColor:c.orange }]}, options:base({beginAtZero:true,precision:0}) }))
      }

      const ct = document.getElementById('chTasks') as HTMLCanvasElement|null
      if (ct) track(new Chart(ct, { type:'bar', data:{ labels:days14, datasets:[{ label:'مهام', data:taskD, backgroundColor:hexA(c.green,.8), borderRadius:6 }]}, options:base({beginAtZero:true,precision:0}) }))

      const cw = document.getElementById('chWords') as HTMLCanvasElement|null
      if (cw) track(new Chart(cw, { type:'line', data:{ labels:days14, datasets:[{ label:'كلمات', data:wordsD, borderColor:c.purple, backgroundColor:hexA(c.purple,.2), tension:.35, fill:true, pointRadius:3, pointHoverRadius:7 }]}, options:base({beginAtZero:true,precision:0}) }))

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

    }

    render().catch(console.error)
    return () => {
      cancelled = true
      // Unmount / theme switch: release the canvases and their ResizeObservers
      destroyCharts(charts)
    }
  }, [theme, dailyHistory, skill])

  const streakCount = streak.count
  const avgAttempts = skill.reading.attempts + skill.listening.attempts + skill.writing.attempts + skill.speaking.attempts
  const act56Data = Array.from({length:56}, (_,i) => dailyHistory[dayKeyOffset(-(55-i))]?.mins ?? 0)
  const peakVal = Math.max(0, ...act56Data)
  const peakIdx = act56Data.lastIndexOf(peakVal)
  const peakDay = peakVal > 0 ? dayKeyOffset(-(55 - peakIdx)).slice(5) : null
  const act56Sum = act56Data.reduce((a, b) => a + b, 0)

  return (
    <div className="page">
      <h2 className="section-title">
        تقدّمك في التعلّم
      </h2>
      <p style={{ color: 'var(--text2)', marginBottom: 'var(--sp-4)', lineHeight: 'var(--lh-arabic)' }}>راجع ما تعلّمته، ثم اختر خطوة صغيرة تواصل بها. النتائج هنا تصف تدريبك المسجّل؛ ولا تحدّد مستواك اللغوي رسميًا.</p>
      <ProgressOverview />

      {/* P6: حالة فارغة ودّية عندما لا توجد بيانات بعد */}
      {Object.keys(dailyHistory).length === 0 && avgAttempts === 0 && (
        <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'var(--sp-8) 24px', marginBottom:'var(--sp-4)', textAlign:'center', boxShadow:'var(--elev-1)' }}>
          <div style={{ fontSize:'var(--glyph-lg)', marginBottom:'var(--sp-2)' }} aria-hidden="true">📊</div>
          <div style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-cta)', color:'var(--text)', marginBottom:'var(--sp-2)' }}>ابدأ سجلّ نشاطك</div>
          <div style={{ fontSize:'var(--text-sm)', color:'var(--muted)', marginBottom:'var(--sp-3)', lineHeight:'var(--lh-arabic)' }}>
            أكمل أول مهمة دراسة أو سجّل دقائق اليوم وستمتلئ هذه اللوحة برسومك الحقيقية.
          </div>
          <button onClick={() => useAppStore.getState().setActiveTab('dashboard')} className="btn-glass"
            style={{ borderRadius:'var(--r-sm)', padding:'10px 22px', fontWeight:'var(--fw-cta)', color:'var(--text)', cursor:'pointer', fontSize:'var(--text-sm)', fontFamily:'inherit' }}>
            فتح خطة اليوم
          </button>
        </div>
      )}

      <h3 style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'0 0 var(--sp-3)' }}>مؤشّرات الدراسة</h3>
      <StudyKpis />

      {/* Progress rings */}
      <h3 style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'0 0 var(--sp-2)' }}>أفضل نتيجة مسجّلة لكل مهارة</h3>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)', marginBottom: 'var(--sp-3)' }}>هدف التدريب داخل التطبيق {PASS_THRESHOLD}%. هذه النتائج لا تعني اجتياز الامتحان الرسمي.</p>
      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(150px, 100%),1fr))', gap:'var(--sp-3)', marginBottom:'var(--sp-4)' }}>
        {(['reading','listening','writing','speaking'] as const).map((k, i) => (
          <SkillRing key={k} label={SKILL_AR[k]} icon={['📖','🎧','✍️','🗣️'][i]}
            v={skill[k].best} att={skill[k].attempts} />
        ))}
      </div>

      <h3 style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'0 0 var(--sp-3)' }}>رؤى ذكية</h3>
      <SmartInsights />

      {/* Charts 2×2 */}
      <h3 style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'18px 0 10px' }}>📊 الاتّجاهات الأسبوعية</h3>
      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(300px, 100%),1fr))', gap:'var(--sp-3)', marginBottom:'var(--sp-4)' }}>
        {[
          { id:'chStudy',  title:'دقائق الدراسة اليومية (آخر 14 يوم)' },
          { id:'chTasks',  title:'المهام المنجزة يوميًا' },
          { id:'chWords',  title:'الكلمات المُضافة يوميًا' },
          { id:'chSkills', title:'المهارات مقابل هدف التدريب' },
        ].map(({ id, title }) => (
          <div key={id} style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:16, boxShadow:'var(--elev-1), inset 0 1px 0 var(--glass-hi)' }}>
            <div style={{ fontSize:'var(--text-base)', fontWeight:'var(--fw-heading)', color:'var(--text)', marginBottom:'var(--sp-3)' }}>{title}</div>
            <div style={{ position:'relative', height:230 }}><canvas id={id} role="img" aria-label={title} aria-describedby="stats-data-note" /></div>
          </div>
        ))}
      </div>

      {/* Streak + sparkline */}
      <h3 style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'18px 0 10px', display:'flex', alignItems:'center', gap:'var(--sp-2)' }}>
        <span aria-hidden="true" style={{ fontSize:'1em', display:'inline-block' }}>
          {streakCount>=1?'🔥':'🕯️'}
        </span>
        الاستمرارية
        <span style={{ display:'inline-flex', alignItems:'center', borderRadius:'var(--r-pill)', padding:'2px 10px', fontSize:'var(--text-xs)', fontWeight:'var(--fw-heading)', background:streakCount===0?'var(--surface3)':'var(--orange-l)', color:streakCount===0?'var(--muted)':'var(--orange-text)' }} aria-label="عدد أيام السلسلة">
          {streakCount} يوم متتالٍ
        </span>
      </h3>
      <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:16, boxShadow:'var(--elev-1)', marginBottom:'var(--sp-4)' }}>
        <div style={{ fontSize:'var(--text-xs)', color:'var(--muted)', marginBottom:'var(--sp-3)' }}>آخر 56 يوم — مجموع {act56Sum} دقيقة</div>
        <div style={{ position:'relative', height:260 }}><canvas id="chActivity" role="img" aria-label={`نشاط آخر 56 يومًا: ${act56Sum} دقيقة، وأعلى يوم ${peakVal} دقيقة`} /></div>
        <div style={{ marginTop:'var(--sp-3)', fontSize:'var(--text-xs)', color:'var(--muted)', display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:'var(--sp-2)' }}>
          {peakDay ? <span>🌊 ذروتك: <strong style={{ color:'var(--text2)' }}>{peakVal} د</strong> ({peakDay})</span>
            : <span>ابدأ جلستك الأولى لترى موجة نشاطك تكبر هنا</span>}
        </div>
      </div>

      {/* Exam trend */}
      <h3 style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'18px 0 10px' }}>📈 تقدّم نتائج الامتحان</h3>
      <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:16, boxShadow:'var(--elev-1)', marginBottom:'var(--sp-4)' }}>
        <div style={{ fontSize:'var(--text-sm)', color:'var(--text2)', marginBottom:'var(--sp-3)' }}>المحاولات المسجّلة حسب التاريخ. قارن نتائجك داخل المهارة نفسها لتختار ما ستراجعه.</div>
        {avgAttempts > 0 ? <div style={{ position:'relative', height:300 }}><canvas id="chExamTrend" role="img" aria-label="نتائج محاولات التدريب حسب التاريخ" aria-describedby="stats-data-note" /></div> : <Callout tone="info" icon="○">ستظهر النتائج بعد تسجيل أول محاولة تدريب.</Callout>}
      </div>

      {/* Week insights */}
      <h3 style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'18px 0 10px' }}>💡 رؤى مقارنة (هذا الأسبوع مقابل الأسبوع الماضي)</h3>
      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(min(240px, 100%),1fr))', gap:'var(--sp-3)' }}>
        {weekInsights.map((ins, i) => <InsightCard key={i} kind={ins.kind} icon={ins.icon} title={ins.title} desc={ins.desc} />)}
      </div>

      <h3 style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'var(--sp-6) 0 var(--sp-3)' }}>إنجازاتي</h3>
      <AchievementsPanel />
    </div>
  )
}
