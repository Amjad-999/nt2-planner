import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { EXAM_READING, EXAM_LISTENING, EXAM_WRITING, EXAM_SPEAKING } from '@/data/examContent'
import { PASS_THRESHOLD, LEARNED_BOX } from '@/data/phases'
import { streamElementsURL } from '@/features/tts/speakDutch'
import { FlashCard } from '@/components/FlashCard'
import { WordCard } from '@/components/WordCard'
import { SpeakAndCheck } from '@/components/SpeakAndCheck'
import { WaveAudio } from '@/components/WaveAudio'
import { wordCount } from '@/lib/utils'
import type { AppStore } from '@/store/useAppStore'

type ExamView = 'reading' | 'listening' | 'writing' | 'speaking' | 'words'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default function Exam(_: {}) {
  const [view, setView] = useState<ExamView>('reading')
  const s = useAppStore()

  const SEG: { id: ExamView; label: string }[] = [
    { id:'reading',   label:'📖 القراءة (Lezen)' },
    { id:'listening', label:'🎧 الاستماع (Luisteren)' },
    { id:'writing',   label:'✍️ الكتابة (Schrijven)' },
    { id:'speaking',  label:'🗣️ التحدّث (Spreken)' },
    { id:'words',     label:'🆕 كلمات الامتحانات' },
  ]

  return (
    <div style={{ padding:'24px 28px 60px', maxWidth:1100, margin:'0 auto' }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:700, color:'var(--text)', margin:'0 0 12px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ color:'var(--orange)' }}>📝</span> محاكاة امتحان NT2 — مستوى B1 حقيقي
      </h2>
      <div style={{ background:'var(--orange-l)', border:'1px solid var(--glass-border)', borderInlineStart:'3px solid var(--orange)', borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:16, fontSize:'.9rem', color:'var(--text2)', lineHeight:1.65 }}>
        <strong style={{ color:'var(--text)' }}>مُعايَر على امتحانات DUO الرسمية.</strong> المحتوى أصليّ لكنّه مكتوب لتطابق المستوى B1 الفعلي.
      </div>
      <div style={{ display:'flex', gap:4, background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:14, padding:4, marginBottom:16, overflowX:'auto', scrollbarWidth:'none' }} role="tablist">
        {SEG.map((sg) => (
          <button key={sg.id} role="tab" aria-selected={view===sg.id} onClick={() => setView(sg.id)}
            style={{ flex:1, minWidth:'max-content', background:view===sg.id?'var(--glass-bg-strong)':'transparent', color:view===sg.id?'var(--orange)':'var(--muted)', fontWeight:view===sg.id?600:500, border:'none', padding:'9px 14px', borderRadius:10, fontSize:'.85rem', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'.15s' }}>
            {sg.label}
          </button>
        ))}
      </div>
      {view==='reading'   && <ReadingView   s={s} />}
      {view==='listening' && <ListeningView s={s} />}
      {view==='writing'   && <WritingView   s={s} />}
      {view==='speaking'  && <SpeakingView  s={s} />}
      {view==='words'     && <WordsView     s={s} />}
    </div>
  )
}

function PassBar({ pct }: { pct: number }) {
  const pass = pct >= PASS_THRESHOLD
  return (
    <div style={{ padding:16, borderRadius:'var(--r)', background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', margin:'14px 0', textAlign:'center', boxShadow:'var(--elev-1)' }}>
      <div style={{ fontFamily:'var(--font-display)', fontSize:'2.4rem', fontWeight:700, color:pass?'var(--green)':'var(--orange)', lineHeight:1.1 }}>{pct}٪</div>
      <div style={{ fontSize:'.88rem', color:'var(--text2)', marginTop:4 }}>{pass?'✅ فوق عتبة النجاح (65٪)':'❌ تحت العتبة — استمرّ!'}</div>
      <div style={{ height:8, background:'var(--surface3)', borderRadius:4, margin:'14px 0 4px', overflow:'hidden', position:'relative' }}>
        <div style={{ height:'100%', background:pass?'var(--green)':'var(--orange)', width:`${pct}%`, transition:'width .6s ease' }} />
        <div style={{ position:'absolute', top:-3, bottom:-3, width:2, background:'var(--green)', insetInlineStart:`${PASS_THRESHOLD}%` }}>
          <span style={{ position:'absolute', top:-18, insetInlineStart:'50%', transform:'translateX(-50%)', fontSize:'.65rem', color:'var(--green)', fontWeight:600, whiteSpace:'nowrap' }}>العتبة</span>
        </div>
      </div>
    </div>
  )
}

type S = AppStore

function ReadingView({ s }: { s: S }) {
  return (
    <div>
      <InfoBox color="blue">📖 <strong>Lezen — أسلوب DUO:</strong> ٣ نصوص أصلية معايرة على B1.</InfoBox>
      {EXAM_READING.map((t) => {
        const ans = s.examReading[t.id] ?? {}
        const answered = Object.keys(ans).length
        const correct = t.questions.filter((q, qi) => ans[qi] === q.correct).length
        const pct = answered === t.questions.length ? Math.round((correct/t.questions.length)*100) : -1
        return (
          <Card key={t.id}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>📄 {t.title} <span style={{ fontSize:'.78rem', color:'var(--muted)', fontWeight:400 }}>— {t.ar}</span></h3>
            <Passage title={t.title} text={t.text} />
            {t.questions.map((q, qi) => {
              const sel = ans[qi]
              return (
                <div key={qi} style={{ margin:'14px 0', padding:14, background:'var(--glass-bg-strong)', border:'1px solid var(--glass-border)', borderRadius:14, boxShadow:'var(--elev-1)' }}>
                  <div style={{ fontWeight:500, color:'var(--text)', marginBottom:10, fontSize:'.93rem', lineHeight:1.55 }}>
                    {qi+1}. {q.q}<span style={{ display:'block', fontSize:'.85rem', color:'var(--muted)', marginTop:4 }}>{q.ar}</span>
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {q.opts.map((o, oi) => {
                      let bg='var(--glass-bg-strong)', bc='var(--border)'
                      if (sel!==undefined){if(oi===q.correct){bg='var(--green-l)';bc='var(--green)'}else if(oi===sel){bg='var(--red-l)';bc='var(--red)'}}
                      return (
                        <label key={oi} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'9px 12px', border:`1px solid ${bc}`, borderRadius:12, background:bg, cursor:'pointer', fontSize:'.88rem', color:'var(--text)', transition:'.15s' }}>
                          <input type="radio" name={`rq_${t.id}_${qi}`} checked={sel===oi} onChange={() => s.answerReading(t.id,qi,oi)} style={{ marginTop:3, accentColor:'var(--orange)' }} />
                          <span>{String.fromCharCode(65+oi)}. {o}</span>
                        </label>
                      )
                    })}
                  </div>
                  {sel!==undefined && <div style={{ marginTop:8, padding:'10px 12px', borderRadius:8, background:'var(--blue-l)', fontSize:'.84rem', color:'var(--text2)' }}>{sel===q.correct?'✅ صحيح — ':'❌ خطأ — '}{q.why}</div>}
                </div>
              )
            })}
            {pct>=0&&(<><PassBar pct={pct}/><GhostBtn onClick={()=>s.resetReading(t.id)}>🔄 إعادة هذا النصّ</GhostBtn></>)}
            {pct<0&&<div style={{ fontSize:'.82rem', color:'var(--muted)', marginTop:8 }}>أجبت {answered}/{t.questions.length} — أكمل لرؤية نتيجتك.</div>}
          </Card>
        )
      })}
    </div>
  )
}

function ListeningView({ s }: { s: S }) {
  return (
    <div>
      <InfoBox color="blue">🎧 <strong>Luisteren — أسلوب DUO:</strong> ٢ حوارات/نشرات أصلية.</InfoBox>
      {EXAM_LISTENING.map((it) => {
        const ans = s.examListening[it.id] ?? {}
        const answered = Object.keys(ans).length
        const correct = it.questions.filter((q,qi) => ans[qi]===q.correct).length
        const pct = answered===it.questions.length ? Math.round((correct/it.questions.length)*100) : -1
        return (
          <Card key={it.id}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>🎙️ {it.title} <span style={{ fontSize:'.78rem', color:'var(--muted)', fontWeight:400 }}>— {it.ar}</span></h3>
            <WaveAudio src={streamElementsURL(it.transcript)} title={it.title} />
            <details><summary style={{ cursor:'pointer', color:'var(--text2)', fontSize:'.86rem', margin:'8px 0' }}>📜 إظهار/إخفاء النصّ</summary>
              <Passage title="" text={it.transcript} pre /></details>
            {it.questions.map((q,qi) => {
              const sel = ans[qi]
              return (
                <div key={qi} style={{ margin:'14px 0', padding:14, background:'var(--glass-bg-strong)', border:'1px solid var(--glass-border)', borderRadius:14, boxShadow:'var(--elev-1)' }}>
                  <div style={{ fontWeight:500, color:'var(--text)', marginBottom:10 }}>{qi+1}. {q.q}<span style={{ display:'block', fontSize:'.85rem', color:'var(--muted)', marginTop:4 }}>{q.ar}</span></div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {q.opts.map((o,oi) => {
                      let bg='var(--glass-bg-strong)',bc='var(--border)'
                      if(sel!==undefined){if(oi===q.correct){bg='var(--green-l)';bc='var(--green)'}else if(oi===sel){bg='var(--red-l)';bc='var(--red)'}}
                      return (
                        <label key={oi} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'9px 12px', border:`1px solid ${bc}`, borderRadius:12, background:bg, cursor:'pointer', fontSize:'.88rem', color:'var(--text)', transition:'.15s' }}>
                          <input type="radio" name={`lq_${it.id}_${qi}`} checked={sel===oi} onChange={() => s.answerListening(it.id,qi,oi)} style={{ marginTop:3, accentColor:'var(--orange)' }} />
                          <span>{String.fromCharCode(65+oi)}. {o}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
            {pct>=0&&(<><PassBar pct={pct}/><GhostBtn onClick={()=>s.resetListening(it.id)}>🔄 إعادة هذه القطعة</GhostBtn></>)}
          </Card>
        )
      })}
    </div>
  )
}

function WritingView({ s }: { s: S }) {
  return (
    <div>
      <InfoBox color="blue">✍️ <strong>Schrijven — أسلوب DUO:</strong> ٤ مهام كتابة معايرة على B1.</InfoBox>
      {EXAM_WRITING.map((w) => {
        const cur = s.examWriting[w.id] ?? { text:'', score:0 }
        const wc = wordCount(cur.text ?? '')
        const inRange = wc>=w.minWords && wc<=w.maxWords
        const scoreIt = () => {
          const text = cur.text ?? ''; if (!text.trim()) return
          const sents = text.split(/[.!?؟]/).filter((x)=>x.trim().length>0).length
          const uniq = new Set((text.toLowerCase().match(/[a-zà-üœ]+/gi)??[])).size
          const avgSL = sents ? Math.round(wc/sents) : 0
          const lexD = wc ? Math.round((uniq/wc)*100) : 0
          let score = 0
          if(wc>=w.minWords&&wc<=w.maxWords)score+=40;else if(wc>=w.minWords*.85&&wc<=w.maxWords*1.15)score+=25;else score+=10
          if(avgSL>=8&&avgSL<=18)score+=20;else if(avgSL>=6&&avgSL<=22)score+=12;else score+=5
          if(lexD>=55)score+=20;else if(lexD>=40)score+=14;else if(lexD>=25)score+=8
          const hG=/\b(beste|geachte|hallo|hoi|hey)\b/i.test(text)
          const hC=/\b(met vriendelijke groet|mvg|hartelijke groet|alvast bedankt|vriendelijke groeten|groet(en)?)\b/i.test(text)
          if(hG&&hC)score+=20;else if(hG||hC)score+=10
          score=Math.max(0,Math.min(100,Math.round(score)))
          const fb=[`عدد الكلمات: ${wc} (المستهدف ${w.minWords}–${w.maxWords})`,`عدد الجمل: ${sents} • متوسّط طول الجملة: ${avgSL} كلمة`,`تنوّع المفردات: ${lexD}٪`]
          if(!hG)fb.push('💡 ابدأ بتحيّة (Beste / Geachte)')
          if(!hC)fb.push('💡 اختم بصيغة وداع (Met vriendelijke groet)')
          if(wc<w.minWords)fb.push('💡 النصّ قصير — أضف تفاصيل')
          if(avgSL>22)fb.push('💡 جملك طويلة — قسّمها')
          s.scoreWriting(w.id, score, fb.join(' • '))
        }
        return (
          <Card key={w.id}>
            <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.1rem', fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>📝 {w.titleNl} <span style={{ fontSize:'.78rem', color:'var(--muted)', fontWeight:400 }}>— {w.ar}</span></h3>
            <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'18px 20px', margin:'12px 0 10px', boxShadow:'var(--elev-1)' }}>
              <p><strong>Opdracht:</strong> {w.briefNl}</p>
              <p style={{ color:'var(--text2)', fontSize:'.88rem', marginTop:6 }}><strong>المهمّة بالعربية:</strong> {w.briefAr}</p>
              <p style={{ fontSize:'.85rem', color:'var(--muted)', marginTop:4 }}>عدد الكلمات المستهدف: <strong>{w.minWords}–{w.maxWords}</strong></p>
            </div>
            <textarea value={cur.text??''} onChange={(e)=>{ s.saveWriting(w.id,e.target.value); clearTimeout((window as unknown as Record<string,number>)._wSave); (window as unknown as Record<string,ReturnType<typeof setTimeout>>)._wSave=setTimeout(()=>s.save(),600) }} rows={8} placeholder="اكتب إجابتك بالهولندية هنا..." dir="ltr" lang="nl"
              style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', backdropFilter:'blur(6px)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)', resize:'vertical', minHeight:80, lineHeight:1.5 }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, flexWrap:'wrap', gap:8 }}>
              <div style={{ fontSize:'.84rem', color:inRange?'var(--green)':'var(--muted)' }}><strong>{wc}</strong> كلمة / {w.minWords}–{w.maxWords}</div>
              <div style={{ display:'flex', gap:6 }}>
                <GhostBtn onClick={scoreIt}>📊 احسب التقييم</GhostBtn>
                <GhostBtn onClick={()=>s.resetWriting(w.id)}>🔄 مسح</GhostBtn>
              </div>
            </div>
            {cur.score>0&&(<>{cur.feedback&&<div style={{ marginTop:10, padding:'10px 12px', borderRadius:8, background:'var(--blue-l)', fontSize:'.84rem', color:'var(--text2)' }}>{cur.feedback}</div>}<PassBar pct={cur.score}/></>)}
          </Card>
        )
      })}
    </div>
  )
}

function SpeakingView({ s }: { s: S }) {
  const d1 = EXAM_SPEAKING.filter((x)=>x.deel===1)
  const d2 = EXAM_SPEAKING.filter((x)=>x.deel===2)
  return (
    <div>
      <InfoBox color="blue">🗣️ <strong>Spreken — أسلوب DUO:</strong> الجزء ١: إجابات قصيرة (٢٠ ث)، الجزء ٢: موسّعة (٣٠ ث). استمع للنموذج، ثمّ قيّم نفسك.</InfoBox>
      {[{n:'Deel 1 — ردود قصيرة (٢٠ ث)',arr:d1},{n:'Deel 2 — ردود موسّعة (٣٠ ث)',arr:d2}].map((grp)=>(
        <div key={grp.n}>
          <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'18px 0 10px' }}>{grp.n}</h3>
          {grp.arr.map((sp)=>{
            const saved = s.examSpeaking[sp.id]??{score:0,at:0}
            return (
              <Card key={sp.id}>
                <div style={{ fontWeight:600, color:'var(--text)', marginBottom:6 }}>🎤 {sp.ar}</div>
                <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'18px 20px', marginBottom:10, boxShadow:'var(--elev-1)' }}>
                  <p><strong>Situatie:</strong> {sp.situatieNl}</p><p style={{ fontSize:'.85rem', color:'var(--text2)', marginTop:4 }}>{sp.situatieAr}</p>
                  <p style={{ marginTop:8 }}><strong>Taak:</strong> {sp.taakNl}</p><p style={{ fontSize:'.85rem', color:'var(--text2)', marginTop:4 }}>{sp.taakAr}</p>
                </div>
                <WaveAudio src={streamElementsURL(sp.voorbeeldNl)} title="الجواب النموذجي" />
                <details style={{ marginTop:8 }}><summary style={{ cursor:'pointer', color:'var(--text2)', fontSize:'.86rem' }}>📜 إظهار النموذج</summary>
                  <div style={{ marginTop:6, padding:10, background:'var(--surface2)', borderRadius:6, fontSize:'.9rem', color:'var(--text)', lineHeight:1.6 }}>{sp.voorbeeldNl}</div>
                </details>
                <SpeakAndCheck targetNl={sp.voorbeeldNl} label="كرّر الجواب النموذجي" />
                <div style={{ marginTop:10 }}>
                  <label style={{ display:'block', fontSize:'.85rem', fontWeight:500, color:'var(--text2)', marginBottom:6 }}>قيّم نفسك (٠–١٠٠):</label>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <input type="range" min={0} max={100} value={saved.score} onChange={(e)=>s.setSpeakingScore(sp.id,parseInt(e.target.value))} style={{ flex:1, minWidth:160, accentColor:'var(--orange)' }} />
                    <span style={{ fontWeight:700, color:'var(--orange)', minWidth:32 }}>{saved.score}</span>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      ))}
    </div>
  )
}

function WordsView({ s }: { s: S }) {
  const [search, setSearch] = useState('')
  const [reviewing, setReviewing] = useState(false)
  const { examWords, removeExamWord, gradeFlash, addExamWord } = s
  const dueExam = examWords.filter((w)=>(w.due??0)<=Date.now()&&(w.box??0)<LEARNED_BOX)
  const filtered = examWords.filter((w)=>{ if(!search)return true; const q=search.toLowerCase(); return w.nl.toLowerCase().includes(q)||w.ar.includes(search) })
  const openAdd = () => { const nl=prompt('الكلمة الهولندية:'); if(!nl)return; const ar=prompt('المعنى بالعربية:'); if(!ar)return; const ex=prompt('جملة مثال (اختياري):')?? ''; const lvl=(prompt('المستوى (B1):')?? 'B1').toUpperCase(); addExamWord(nl,ar,ex,lvl) }
  return (
    <div>
      <InfoBox color="blue">🆕 <strong>كلمات الامتحانات الجديدة</strong> — كل كلمة جديدة تصادفها، أضِفها هنا.</InfoBox>
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
        <input type="text" value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="🔍 ابحث..." style={{ flex:1, minWidth:200, padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)' }} />
        <PrimaryBtn onClick={openAdd}>➕ إضافة كلمة</PrimaryBtn>
        {dueExam.length>0 && <GhostBtn onClick={()=>setReviewing(true)}>🎴 مراجعة ({dueExam.length})</GhostBtn>}
      </div>
      {reviewing ? <FlashCard queue={dueExam} onGrade={(id,q)=>gradeFlash(id,q,true)} onDone={()=>setReviewing(false)} />
        : filtered.length===0 ? <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'14px 18px', fontSize:'.9rem', color:'var(--text2)' }}>🆕 لا توجد كلمات بعد.</div>
        : filtered.map((w) => <WordCard key={w.id} word={w} onDelete={removeExamWord} learnedBox={LEARNED_BOX} />)}
    </div>
  )
}

/* ── Shared helpers ── */
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:18, boxShadow:'var(--elev-1)', marginBottom:16 }}>{children}</div>
}
function InfoBox({ children, color }: { children: React.ReactNode; color: string }) {
  const c = `var(--${color})`; const bg = `var(--${color}-l)`
  return <div style={{ background:bg, border:'1px solid var(--glass-border)', borderInlineStart:`3px solid ${c}`, borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:16, fontSize:'.9rem', color:'var(--text2)' }}>{children}</div>
}
function Passage({ title, text, pre }: { title: string; text: string; pre?: boolean }) {
  return (
    <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'18px 20px', margin:'12px 0 16px', fontSize:'.95rem', lineHeight:1.75, color:'var(--text)', boxShadow:'var(--elev-1)', whiteSpace: pre ? 'pre-wrap' : undefined }}>
      {title && <h4 style={{ fontFamily:'var(--font-display)', fontSize:'1.2rem', fontWeight:700, color:'var(--text)', marginBottom:6 }}>{title}</h4>}
      {pre ? text : text.split('\n\n').map((p,i)=><p key={i} style={{ margin:'8px 0' }}>{p}</p>)}
      <div style={{ fontSize:'.74rem', color:'var(--muted)', marginTop:10, fontStyle:'italic' }}>مُعايَر على أسلوب DUO openbaar examen (المحتوى أصلي)</div>
    </div>
  )
}
function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: ()=>void }) {
  return <button onClick={onClick} style={{ background:'transparent', border:'1px solid var(--border2)', borderRadius:10, padding:'7px 12px', cursor:'pointer', fontSize:'.8rem', color:'var(--text2)', fontFamily:'inherit' }}>{children}</button>
}
function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick: ()=>void }) {
  return <button onClick={onClick} style={{ background:'var(--grad-primary)', color:'#fff', border:'none', borderRadius:10, padding:'7px 12px', cursor:'pointer', fontSize:'.8rem', fontWeight:600, fontFamily:'inherit' }}>{children}</button>
}

