import { useAppStore, totalLearnedWords, avgBestScore, weakestSkill, sumLastNDays, sumPrevNDays, generateTodayPlan, planHealth } from '@/store/useAppStore'
import { AchievementsPanel } from '@/components/AchievementsPanel'
import { PASS_THRESHOLD, SKILL_AR, LEARNED_BOX } from '@/data/phases'
import { HeroSection } from '@/components/HeroSection'
import { ExamCountdown } from '@/components/countdown/ExamCountdown'
import { PlanHealth } from '@/components/PlanHealth'
import { ExamCountdowns } from '@/components/ExamCountdowns'
import { KpiCard } from '@/components/KpiCard'
import { InsightCard } from '@/components/InsightCard'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { todayKey, dayKeyOffset } from '@/lib/utils'
import { useNow } from '@/hooks/useNow'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { Reveal, Magnetic } from '@/components/MotionFx'

interface Props { onOpenStudyTime?: () => void }

export default function Dashboard({ onOpenStudyTime }: Props) {
  const examDate = useAppStore((s) => s.examDate)
  const planDay  = useAppStore((s) => s.planDay)
  const planStart = useAppStore((s) => s.planStart)
  const done     = useAppStore((s) => s.done)
  const vocab    = useAppStore((s) => s.vocab)
  const skill    = useAppStore((s) => s.skill)
  const streak   = useAppStore((s) => s.streak)
  const dailyHistory = useAppStore((s) => s.dailyHistory)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const setDayMinutes = useAppStore((s) => s.setDayMinutes)
  const [weekEdit, setWeekEdit] = useState(false)
  const now = useNow()
  const reduced = useReducedMotion()

  // FIX 3: read user-configured study capacity
  const minutesPerTask  = useAppStore((s) => s.prefs.minutesPerTask)
  const studyDayMinutes = useAppStore((s) => s.prefs.studyDayMinutes)

  const todayM   = dailyHistory[todayKey()]?.mins ?? 0
  const weekM    = sumLastNDays(dailyHistory, 'mins', 7)
  const lastWM   = sumPrevNDays(dailyHistory, 'mins', 7, 7)
  const dWeek    = lastWM ? Math.round(((weekM - lastWM) / lastWM) * 100) : (weekM > 0 ? 100 : 0)
  const totW     = totalLearnedWords(vocab)
  const wkSk     = weakestSkill(skill)
  const bestNT2  = avgBestScore(skill)
  const gen      = generateTodayPlan({ planDay, done, vocab, skill, planStart, examDate })
  const ph       = planHealth({ examDate, planDay, done, planStart }, { minutesPerTask, studyDayMinutes })

  type KpiItem = {
    cls: string; icon: string; label: string; value: string | number; delta: string; dCls: 'up'|'down'|'flat'
    editable?: boolean; editKind?: 'number'|'date'; editRaw?: string; min?: number; max?: number
    onSave?: (v: string) => void; onEditClick?: () => void
  }
  const kpis: KpiItem[] = [
    { cls:'k2', icon:'⏱️', label:'دقائق اليوم', value: todayM, delta: todayM>=studyDayMinutes?'هدف اليوم محقّق':`تحتاج ${Math.max(0,studyDayMinutes-todayM)} د`, dCls: (todayM>=studyDayMinutes?'up':'flat'),
      editable:true, editKind:'number', editRaw:String(todayM), min:0, max:600,
      onSave:(v)=>{ setDayMinutes(todayKey(), parseInt(v)||0) } },
    { cls:'k3', icon:'📊', label:'دقائق الأسبوع', value: weekM, delta: `${dWeek>=0?'+':''}${dWeek}% مقابل الأسبوع الماضي`, dCls: (dWeek>0?'up':dWeek<0?'down':'flat'),
      editable:true, onEditClick:()=> setWeekEdit((o)=>!o) },
    { cls:'k4', icon:'📚', label:'كلمات متقنة', value: `${totW.learned}/${totW.all}`, delta: totW.learned?`${Math.round((totW.learned/Math.max(1,totW.all))*100)}% نسبة الإتقان`:'ابدأ المراجعة', dCls: 'flat' },
    { cls:'k5', icon:'🎯', label:'معدّل امتحاناتك', value: `${bestNT2}%`, delta: bestNT2>=PASS_THRESHOLD?'✓ فوق عتبة النجاح':`تبعد ${PASS_THRESHOLD-bestNT2}% عن النجاح`, dCls: (bestNT2>=PASS_THRESHOLD?'up':'down') },
    { cls:'k6', icon:'🔥', label:'مواظبة', value: `${streak.count} يوم`, delta: `${SKILL_AR[wkSk]??wkSk} هي الأضعف`, dCls: 'flat' },
  ]

  const due = vocab.filter((w)=>(w.due??0)<=now&&(w.box??0)<LEARNED_BOX).length
  const wkBest = skill[wkSk]?.best ?? 0
  const remDays = Math.max(0, ph.left ?? 0)
  const projected = Math.min(95, bestNT2 + Math.round(remDays * 0.4))

  const insights: { kind:'good'|'warn'|'bad'|''; icon:string; title:string; desc:string }[] = []
  if (ph.status==='ok') insights.push({ kind:'good', icon:'🎯', title:'أنت على المسار الصحيح', desc:`إيقاعك ممتاز. حافظ على ~${ph.needMins} دقيقة/يوم.` })
  else if (ph.status==='tight') insights.push({ kind:'warn', icon:'⚠️', title:'الكثافة مشدودة', desc:`ارفع الإيقاع إلى ~${ph.needMins} د/يوم وأنجز المهام المتأخّرة أوّلًا.` })
  else insights.push({ kind:'bad', icon:'🚨', title:'حالة حرجة — أعد توزيع المهام', desc:`تحتاج ~${ph.needMins} دقيقة/يوم. اضغط «ولّد خطة اليوم» لإسقاط الأقل أولوية.` })
  insights.push({ kind:'', icon:'🧭', title:`مهارتك الأضعف: ${SKILL_AR[wkSk]}`, desc:`أعلى نتيجة لديك في ${SKILL_AR[wkSk]} هي ${wkBest}%. خصّص جلسة 30 دقيقة لها اليوم.` })
  if (weekM>lastWM&&lastWM>0) insights.push({ kind:'good', icon:'📈', title:'هذا الأسبوع أفضل', desc:`درست ${weekM-lastWM} دقيقة أكثر من الأسبوع الماضي.` })
  else if (lastWM>0&&weekM<lastWM) insights.push({ kind:'warn', icon:'📉', title:'تباطؤ ملحوظ', desc:`انخفضت دقائق هذا الأسبوع بـ ${lastWM-weekM} د. جلسة قصيرة اليوم تكفي.` })
  if (due>0) insights.push({ kind:'warn', icon:'⏰', title:`${due} كلمة وصلت موعد المراجعة`, desc:'مراجعتها الآن تحفظها في الذاكرة طويلة الأمد.' })
  else insights.push({ kind:'good', icon:'✅', title:'لا توجد كلمات مستحقّة الآن', desc:'استثمر هذا الوقت في إضافة كلمات جديدة من خانة AI.' })
  if (remDays>0) insights.push({ kind:projected>=PASS_THRESHOLD?'good':'warn', icon:'🔮', title:'توقّع جاهزيتك يوم الامتحان', desc:`بمعدّلك الحالي (${bestNT2}%) وبواقع ${remDays} يوم، أنت في طريقك إلى ~${projected}%. ${projected>=PASS_THRESHOLD?'مرشّح للنجاح إن حافظت على الإيقاع.':'تحتاج رفع الكثافة لتجاوز عتبة 65%.'}` })

  const SH = { fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'24px 0 12px', display:'flex', alignItems:'center', gap:10 } as const

  return (
    <div style={{ padding:'24px 28px 60px', maxWidth:1100, margin:'0 auto' }}>
      <HeroSection />
      <ExamCountdown />
      <PlanHealth />

      <ExamCountdowns />

      <Reveal><h2 style={SH}><span style={{ color:'var(--orange)' }}>🎯</span> مؤشّرات اليوم</h2></Reveal>
      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(165px,1fr))', gap:12, marginBottom:18 }}>
        {kpis.map((k, i) => (
          <motion.div
            key={k.cls}
            initial={reduced ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: i * 0.06, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <KpiCard cls={k.cls} icon={k.icon} label={k.label} value={k.value} delta={k.delta} deltaClass={k.dCls} editable={k.editable} editKind={k.editKind} editRaw={k.editRaw} min={k.min} max={k.max} onSave={k.onSave} onEditClick={k.onEditClick} />
          </motion.div>
        ))}
      </div>

      {weekEdit && (
        <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'14px 16px', marginBottom:18, boxShadow:'var(--elev-1)' }}>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:'.88rem', fontWeight:600, color:'var(--text)' }}>✏️ عدّل دقائق آخر 7 أيام</div>
            <button onClick={()=>setWeekEdit(false)} style={{ background:'transparent', border:'none', color:'var(--muted)', cursor:'pointer', fontSize:'1rem' }} aria-label="إغلاق">✕</button>
          </div>
          <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
            {Array.from({ length: 7 }, (_, i) => {
              const key = dayKeyOffset(-i)
              const mins = dailyHistory[key]?.mins ?? 0
              const lbl = i===0 ? 'اليوم' : i===1 ? 'أمس' : `قبل ${i} يوم`
              return (
                <label key={key} style={{ display:'flex', flexDirection:'column', gap:4, fontSize:'.72rem', color:'var(--muted)' }}>
                  <span>{lbl}</span>
                  <input type="number" min={0} max={600} defaultValue={mins}
                    onChange={(e)=> setDayMinutes(key, parseInt(e.target.value)||0)}
                    aria-label={`دقائق ${lbl}`}
                    style={{ width:64, padding:'6px 8px', border:'1px solid var(--border2)', borderRadius:8, background:'var(--surface)', color:'var(--text)', fontFamily:'inherit', fontSize:'.85rem' }} />
                </label>
              )
            })}
          </div>
        </div>
      )}

      <Reveal><h2 style={SH}><span style={{ color:'var(--orange)' }}>💡</span> رؤى ذكية</h2></Reveal>
      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))', gap:12, marginBottom:18 }}>
        {insights.map((ins, i) => (
          <Reveal key={i} delay={Math.min(i * 0.05, 0.3)}>
            <InsightCard kind={ins.kind} icon={ins.icon} title={ins.title} desc={ins.desc} />
          </Reveal>
        ))}
      </div>

      <Reveal><h2 style={SH}><span style={{ color:'var(--orange)' }}>⚡</span> إجراءات سريعة</h2></Reveal>
      <div className="stagger" style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:12 }}>
        {[
          { label:'📝 ابدأ محاكاة الامتحان', action:()=>setActiveTab('exam'), primary:true },
          { label:'📚 راجع المفردات المستحقّة', action:()=>setActiveTab('vocab') },
          { label:`✨ ولّد خطة اليوم (${gen.tasks.length} مهام)`, action:()=>setActiveTab('plan') },
          { label:'⏱️ أضف وقت الدراسة', action:()=>onOpenStudyTime?.() },
        ].map((b) => (
          <Magnetic key={b.label} strength={0.15} maxShift={4}>
            <button onClick={b.action}
              className="btn-shine w-full py-2.5 px-4 rounded-xl cursor-pointer font-[inherit] text-[.9rem] border transition-all hover:-translate-y-0.5"
              style={{ background:'var(--btn-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', color: b.primary ? 'var(--text)' : 'var(--text2)', fontWeight: b.primary ? 700 : 600, borderColor:'var(--btn-border)', boxShadow: b.primary ? 'var(--elev-1), inset 0 1px 0 var(--glass-hi)' : 'var(--elev-1)' }}
            >{b.label}</button>
          </Magnetic>
        ))}
      </div>

      <Reveal><h2 style={SH}><span style={{ color:'var(--orange)' }}>🏅</span> إنجازاتي</h2></Reveal>
      <AchievementsPanel />
    </div>
  )
}
