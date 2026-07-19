import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { EXAM_READING, EXAM_LISTENING, EXAM_WRITING, EXAM_SPEAKING } from '@/data/examContent'
import { PASS_THRESHOLD, LEARNED_BOX } from '@/data/phases'
import { useSpeech } from '@/features/tts/useSpeech'
import { FlashCard } from '@/components/FlashCard'
import { WordCard } from '@/components/WordCard'
import { SpeakAndCheck } from '@/components/SpeakAndCheck'
import { useFuzzySearch, getMatchIndices } from '@/hooks/useFuzzySearch'
import { useNow } from '@/hooks/useNow'
import { wordCount } from '@/lib/utils'
import type { AppStore } from '@/store/useAppStore'
import type { ExamWord } from '@/store/types'
import type { IFuseOptions } from 'fuse.js'

const EXAM_FUSE_OPTIONS: IFuseOptions<ExamWord> = {
  keys: [
    { name: 'nl', weight: 0.5 },
    { name: 'ar', weight: 0.35 },
    { name: 'ex', weight: 0.15 },
  ],
  threshold: 0.4,
  includeMatches: true,
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,
}

type ExamView = 'reading' | 'listening' | 'writing' | 'speaking' | 'words'

export default function Exam() {
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
      <h2 style={{ fontFamily:'var(--font-ar)', fontSize:'var(--text-xl)', fontWeight:700, color:'var(--text)', margin:'0 0 12px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ color:'var(--orange)' }}>📝</span> محاكاة امتحان NT2 — مستوى B1 حقيقي
      </h2>
      <div style={{ background:'var(--orange-l)', border:'1px solid var(--glass-border)', borderInlineStart:'3px solid var(--orange)', borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:16, fontSize:'var(--text-sm)', color:'var(--text2)', lineHeight:1.65 }}>
        <strong style={{ color:'var(--text)' }}>مُعايَر على امتحانات DUO الرسمية.</strong> المحتوى أصليّ لكنّه مكتوب لتطابق المستوى B1 الفعلي.
      </div>
      <div style={{ display:'flex', gap:4, background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:14, padding:4, marginBottom:16, overflowX:'auto', scrollbarWidth:'none' }} role="tablist">
        {SEG.map((sg) => (
          <button key={sg.id} role="tab" aria-selected={view===sg.id} onClick={() => setView(sg.id)}
            style={{ flex:1, minWidth:'max-content', background:view===sg.id?'var(--glass-bg-strong)':'transparent', color:view===sg.id?'var(--orange)':'var(--muted)', fontWeight:view===sg.id?600:500, border:'none', padding:'9px 14px', borderRadius:10, fontSize:'var(--text-sm)', cursor:'pointer', fontFamily:'inherit', whiteSpace:'nowrap', transition:'.15s' }}>
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
      <div style={{ fontFamily:'var(--font-latin)', fontSize:'var(--text-2xl)', fontWeight:600, color:pass?'var(--green)':'var(--orange)', lineHeight:1.1, fontFeatureSettings:"'tnum'" }}>{pct}%</div>
      <div style={{ fontSize:'var(--text-sm)', color:'var(--text2)', marginTop:4 }}>{pass?'✅ فوق عتبة النجاح (65%)':'❌ تحت العتبة — استمرّ!'}</div>
      <div style={{ height:8, background:'var(--surface3)', borderRadius:4, margin:'14px 0 4px', overflow:'hidden', position:'relative' }}>
        <div className="progress-wave" style={{ height:'100%', backgroundColor:pass?'var(--green)':'var(--orange)', width:`${pct}%`, transition:'width .8s ease' }} />
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
      <InfoBox color="blue">📖 <strong>Lezen — أسلوب DUO:</strong> 3 نصوص أصلية معايرة على B1.</InfoBox>
      {EXAM_READING.map((t) => {
        const ans = s.examReading[t.id] ?? {}
        const answered = Object.keys(ans).length
        const correct = t.questions.filter((q, qi) => ans[qi] === q.correct).length
        const pct = answered === t.questions.length ? Math.round((correct/t.questions.length)*100) : -1
        return (
          <Card key={t.id}>
            {/* Dutch title → LTR */}
            <h3 dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontSize:'1.1rem', fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>
              📄 {t.title}
            </h3>
            <Passage title={t.title} text={t.text} />
            {t.questions.map((q, qi) => {
              const sel = ans[qi]
              return (
                <div key={qi} style={{ margin:'14px 0', padding:14, background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:14, boxShadow:'var(--elev-1)' }}>
                  {/* Dutch question → LTR, no Arabic translation */}
                  <div dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontWeight:500, color:'var(--text)', marginBottom:10, fontSize:'.93rem', lineHeight:1.55 }}>
                    {qi+1}. {q.q}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {q.opts.map((o, oi) => {
                      let bg='var(--btn-bg)', bc='var(--border)'
                      if (sel!==undefined){if(oi===q.correct){bg='var(--green-l)';bc='var(--green)'}else if(oi===sel){bg='var(--red-l)';bc='var(--red)'}}
                      return (
                        <label key={oi} dir="ltr" lang="nl" style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'9px 12px', border:`1px solid ${bc}`, borderRadius:12, background:bg, cursor:'pointer', fontFamily:'var(--font-latin)', fontSize:'.88rem', color:'var(--text)', transition:'.15s' }}>
                          <input type="radio" name={`rq_${t.id}_${qi}`} checked={sel===oi} onChange={() => s.answerReading(t.id,qi,oi,t.questions)} style={{ marginTop:3, accentColor:'var(--orange)', flexShrink:0 }} />
                          <span>{String.fromCharCode(65+oi)}. {o}</span>
                        </label>
                      )
                    })}
                  </div>
                  {/* Arabic explanation feedback — stays RTL, Arabic UI */}
                  {sel!==undefined && <div style={{ marginTop:8, padding:'10px 12px', borderRadius:8, background:'var(--blue-l)', fontSize:'var(--text-sm)', color:'var(--text2)' }}>{sel===q.correct?'✅ صحيح — ':'❌ خطأ — '}{q.why}</div>}
                </div>
              )
            })}
            {pct>=0&&(<><PassBar pct={pct}/><GhostBtn onClick={()=>s.resetReading(t.id)}>🔄 إعادة هذا النصّ</GhostBtn></>)}
            {pct<0&&<div style={{ fontSize:'var(--text-sm)', color:'var(--muted)', marginTop:8 }}>أجبت {answered}/{t.questions.length} — أكمل لرؤية نتيجتك.</div>}
          </Card>
        )
      })}
    </div>
  )
}

function ListeningView({ s }: { s: S }) {
  return (
    <div>
      <InfoBox color="blue">🎧 <strong>Luisteren — أسلوب DUO:</strong> 2 حوارات/نشرات أصلية.</InfoBox>
      {EXAM_LISTENING.map((it) => {
        const ans = s.examListening[it.id] ?? {}
        const answered = Object.keys(ans).length
        const correct = it.questions.filter((q,qi) => ans[qi]===q.correct).length
        const pct = answered===it.questions.length ? Math.round((correct/it.questions.length)*100) : -1
        return (
          <Card key={it.id}>
            <h3 dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontSize:'1.1rem', fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>
              🎙️ {it.title}
            </h3>
            <TtsPlayer text={it.transcript} />
            <details>
              <summary style={{ cursor:'pointer', color:'var(--text2)', fontSize:'var(--text-sm)', margin:'8px 0' }}>📜 إظهار/إخفاء النصّ</summary>
              <Passage title="" text={it.transcript} pre />
            </details>
            {it.questions.map((q,qi) => {
              const sel = ans[qi]
              return (
                <div key={qi} style={{ margin:'14px 0', padding:14, background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:14, boxShadow:'var(--elev-1)' }}>
                  <div dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontWeight:500, color:'var(--text)', marginBottom:10, fontSize:'.93rem', lineHeight:1.55 }}>
                    {qi+1}. {q.q}
                  </div>
                  <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {q.opts.map((o,oi) => {
                      let bg='var(--btn-bg)',bc='var(--border)'
                      if(sel!==undefined){if(oi===q.correct){bg='var(--green-l)';bc='var(--green)'}else if(oi===sel){bg='var(--red-l)';bc='var(--red)'}}
                      return (
                        <label key={oi} dir="ltr" lang="nl" style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'9px 12px', border:`1px solid ${bc}`, borderRadius:12, background:bg, cursor:'pointer', fontFamily:'var(--font-latin)', fontSize:'.88rem', color:'var(--text)', transition:'.15s' }}>
                          <input type="radio" name={`lq_${it.id}_${qi}`} checked={sel===oi} onChange={() => s.answerListening(it.id,qi,oi,it.questions)} style={{ marginTop:3, accentColor:'var(--orange)', flexShrink:0 }} />
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
      <InfoBox color="blue">✍️ <strong>Schrijven — أسلوب DUO:</strong> 4 مهام كتابة معايرة على B1.</InfoBox>
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
          const fb=[`عدد الكلمات: ${wc} (المستهدف ${w.minWords}–${w.maxWords})`,`عدد الجمل: ${sents} • متوسّط طول الجملة: ${avgSL} كلمة`,`تنوّع المفردات: ${lexD}%`]
          if(!hG)fb.push('💡 ابدأ بتحيّة (Beste / Geachte)')
          if(!hC)fb.push('💡 اختم بصيغة وداع (Met vriendelijke groet)')
          if(wc<w.minWords)fb.push('💡 النصّ قصير — أضف تفاصيل')
          if(avgSL>22)fb.push('💡 جملك طويلة — قسّمها')
          s.scoreWriting(w.id, score, fb.join(' • '))
        }
        return (
          <Card key={w.id}>
            {/* Dutch task title → LTR */}
            <h3 dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontSize:'1.1rem', fontWeight:700, color:'var(--text)', margin:'0 0 6px' }}>
              📝 {w.titleNl}
            </h3>
            <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'18px 20px', margin:'12px 0 10px', boxShadow:'var(--elev-1)' }}>
              {/* Dutch brief → LTR */}
              <p dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', lineHeight:1.6 }}><strong>Opdracht:</strong> {w.briefNl}</p>
              {/* Arabic UI guidance — stays RTL */}
              <p style={{ fontSize:'var(--text-sm)', color:'var(--muted)', marginTop:6 }}>عدد الكلمات المستهدف: <strong>{w.minWords}–{w.maxWords}</strong></p>
            </div>
            <textarea value={cur.text??''} onChange={(e)=>{ s.saveWriting(w.id,e.target.value); clearTimeout((window as unknown as Record<string,number>)._wSave); (window as unknown as Record<string,ReturnType<typeof setTimeout>>)._wSave=setTimeout(()=>s.save(),600) }} rows={8} placeholder="اكتب إجابتك بالهولندية هنا..." dir="ltr" lang="nl"
              style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', backdropFilter:'blur(6px)', fontFamily:'var(--font-latin)', fontSize:'var(--text-base)', color:'var(--text)', resize:'vertical', minHeight:80, lineHeight:1.5 }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8, flexWrap:'wrap', gap:8 }}>
              <div style={{ fontSize:'var(--text-sm)', color:inRange?'var(--green)':'var(--muted)' }}><strong>{wc}</strong> كلمة / {w.minWords}–{w.maxWords}</div>
              <div style={{ display:'flex', gap:6 }}>
                <GhostBtn onClick={scoreIt}>📊 احسب التقييم</GhostBtn>
                <GhostBtn onClick={()=>s.resetWriting(w.id)}>🔄 مسح</GhostBtn>
              </div>
            </div>
            {cur.score>0&&(<>{cur.feedback&&<div style={{ marginTop:10, padding:'10px 12px', borderRadius:8, background:'var(--blue-l)', fontSize:'var(--text-sm)', color:'var(--text2)' }}>{cur.feedback}</div>}<PassBar pct={cur.score}/></>)}
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
      <InfoBox color="blue">🗣️ <strong>Spreken — أسلوب DUO:</strong> الجزء 1: إجابات قصيرة (20 ث)، الجزء 2: موسّعة (30 ث). استمع للنموذج، ثمّ قيّم نفسك.</InfoBox>
      {[
        {n:'Deel 1 — Korte reactie (20 sec.)', arr:d1},
        {n:'Deel 2 — Uitgebreide reactie (30 sec.)', arr:d2},
      ].map((grp)=>(
        <div key={grp.n}>
          <h3 dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'18px 0 10px' }}>{grp.n}</h3>
          {grp.arr.map((sp, idx)=>{
            const saved = s.examSpeaking[sp.id]??{score:0,at:0}
            return (
              <Card key={sp.id}>
                {/* Dutch task label — no Arabic title */}
                <div dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontWeight:600, color:'var(--text)', marginBottom:6 }}>
                  🎤 Spreektaak {idx + 1}
                </div>
                {/* Dutch situation + task → LTR, no Arabic translations */}
                <div dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'18px 20px', marginBottom:10, boxShadow:'var(--elev-1)', lineHeight:1.65 }}>
                  <p><strong>Situatie:</strong> {sp.situatieNl}</p>
                  <p style={{ marginTop:8 }}><strong>Taak:</strong> {sp.taakNl}</p>
                </div>
                <TtsPlayer text={sp.voorbeeldNl} label="🔊 استمع للجواب النموذجي" />
                <details style={{ marginTop:8 }}>
                  <summary style={{ cursor:'pointer', color:'var(--text2)', fontSize:'var(--text-sm)' }}>📜 إظهار النموذج</summary>
                  <div dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', marginTop:6, padding:10, background:'var(--surface2)', borderRadius:6, fontSize:'var(--text-base)', color:'var(--text)', lineHeight:1.6 }}>{sp.voorbeeldNl}</div>
                </details>
                <SpeakAndCheck targetNl={sp.voorbeeldNl} label="كرّر الجواب النموذجي" />
                <div style={{ marginTop:10 }}>
                  <label style={{ display:'block', fontSize:'var(--text-sm)', fontWeight:500, color:'var(--text2)', marginBottom:6 }}>قيّم نفسك (0–100):</label>
                  <div style={{ display:'flex', gap:6, alignItems:'center' }}>
                    <input type="range" min={0} max={100} value={saved.score} onChange={(e)=>s.setSpeakingScore(sp.id,parseInt(e.target.value))} style={{ flex:1, minWidth:160, accentColor:'var(--orange)' }} />
                    <span style={{ fontFamily:'var(--font-latin)', fontWeight:700, color:'var(--orange)', minWidth:32 }}>{saved.score}</span>
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
  const now = useNow()
  const dueExam = examWords.filter((w)=>(w.due??0)<=now&&(w.box??0)<LEARNED_BOX)

  const fuseResults = useFuzzySearch(examWords, EXAM_FUSE_OPTIONS, search)
  const filtered = fuseResults ? fuseResults.map(r => r.item) : examWords
  const resultMap = new Map(fuseResults?.map(r => [r.item.id, r]) ?? [])

  const openAdd = () => { const nl=prompt('الكلمة الهولندية:'); if(!nl)return; const ar=prompt('المعنى بالعربية:'); if(!ar)return; const ex=prompt('جملة مثال (اختياري):')?? ''; const lvl=(prompt('المستوى (B1):')?? 'B1').toUpperCase(); addExamWord(nl,ar,ex,lvl) }
  return (
    <div>
      <InfoBox color="blue">🆕 <strong>كلمات الامتحانات الجديدة</strong> — كل كلمة جديدة تصادفها، أضِفها هنا.</InfoBox>
      <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <input
            type="text"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="🔍 ابحث بشكل مرن..."
            aria-label="بحث مرن في كلمات الامتحان"
            style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'var(--text-base)', color:'var(--text)', boxSizing:'border-box' }}
          />
          {search && (
            <button onClick={()=>setSearch('')} aria-label="مسح البحث"
              style={{ position:'absolute', insetInlineEnd:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:'1rem' }}>✕</button>
          )}
        </div>
        <PrimaryBtn onClick={openAdd}>➕ إضافة كلمة</PrimaryBtn>
        {dueExam.length>0 && <GhostBtn onClick={()=>setReviewing(true)}>🎴 مراجعة ({dueExam.length})</GhostBtn>}
      </div>
      {search.trim() && (
        <div style={{ fontSize:'var(--text-sm)', color:'var(--muted)', marginBottom:8 }} aria-live="polite" aria-atomic="true">
          {filtered.length > 0 ? `${filtered.length} نتيجة` : 'لا توجد نتائج'}
        </div>
      )}
      {reviewing
        ? <FlashCard queue={dueExam} onGrade={(id,q)=>gradeFlash(id,q,true)} onDone={()=>setReviewing(false)} />
        : filtered.length===0
          ? <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'14px 18px', fontSize:'var(--text-base)', color:'var(--text2)' }}>
              {examWords.length===0 ? '🆕 لا توجد كلمات بعد.' : '🔍 لا توجد نتائج تطابق بحثك.'}
            </div>
          : filtered.map((w) => {
              const r = resultMap.get(w.id)
              return (
                <WordCard key={w.id} word={w} onDelete={removeExamWord} learnedBox={LEARNED_BOX}
                  hlNl={r ? getMatchIndices(r, 'nl') : undefined}
                  hlAr={r ? getMatchIndices(r, 'ar') : undefined}
                  hlEx={r ? getMatchIndices(r, 'ex') : undefined}
                />
              )
            })
      }
    </div>
  )
}

/* ── Shared helpers ── */
function Card({ children }: { children: React.ReactNode }) {
  return <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:18, boxShadow:'var(--elev-1)', marginBottom:16 }}>{children}</div>
}

/* Chunked Dutch TTS play/stop button — long transcripts exceed the ~200-char
   per-request limit of Google TTS, so playback goes through speakDutch */
function TtsPlayer({ text, label = '🔊 استمع للنصّ' }: { text: string; label?: string }) {
  const { speaking, speak, stop } = useSpeech()
  return (
    <button
      onClick={() => (speaking ? stop() : speak(text))}
      aria-label={speaking ? 'أوقف الاستماع' : 'استمع للنصّ الهولندي'}
      style={{
        display:'inline-flex', alignItems:'center', gap:8, padding:'9px 16px', margin:'4px 0',
        borderRadius:12, border:'1px solid var(--btn-border)', cursor:'pointer',
        backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
        background: speaking ? 'var(--orange-l)' : 'var(--btn-bg)',
        color: speaking ? 'var(--orange)' : 'var(--text2)',
        fontFamily:'inherit', fontSize:'.88rem', fontWeight:600, boxShadow:'var(--elev-1)',
      }}
    >
      {speaking ? '⏹ إيقاف' : label}
    </button>
  )
}
function InfoBox({ children, color }: { children: React.ReactNode; color: string }) {
  const c = `var(--${color})`; const bg = `var(--${color}-l)`
  return <div style={{ background:bg, border:'1px solid var(--glass-border)', borderInlineStart:`3px solid ${c}`, borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:16, fontSize:'var(--text-sm)', color:'var(--text2)' }}>{children}</div>
}

/* Dutch passage block: always LTR, Inter, 17px/1.7 */
function Passage({ title, text, pre }: { title: string; text: string; pre?: boolean }) {
  return (
    <div
      dir="ltr"
      lang="nl"
      style={{
        background:'var(--glass-bg)',
        backdropFilter:'blur(10px)',
        WebkitBackdropFilter:'blur(10px)',
        border:'1px solid var(--glass-border)',
        borderRadius:'var(--r)',
        padding:'18px 20px',
        margin:'12px 0 16px',
        fontFamily:'var(--font-latin)',
        fontSize:'var(--text-md)',
        lineHeight:1.7,
        color:'var(--text)',
        textAlign:'start',
        boxShadow:'var(--elev-1)',
        whiteSpace: pre ? 'pre-wrap' : undefined,
      }}
    >
      {title && (
        <h4 style={{ fontFamily:'var(--font-latin)', fontSize:'1.2rem', fontWeight:700, color:'var(--text)', marginBottom:6 }}>
          {title}
        </h4>
      )}
      {pre ? text : text.split('\n\n').map((p,i)=><p key={i} style={{ margin:'8px 0' }}>{p}</p>)}
    </div>
  )
}
function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: ()=>void }) {
  return <button onClick={onClick} className="btn-glass" style={{ borderRadius:10, padding:'7px 12px', cursor:'pointer', fontSize:'var(--text-sm)', color:'var(--text2)', fontFamily:'inherit' }}>{children}</button>
}
function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick: ()=>void }) {
  return <button onClick={onClick} className="btn-glass" style={{ borderRadius:10, padding:'7px 12px', cursor:'pointer', fontSize:'var(--text-sm)', fontWeight:700, color:'var(--text)', fontFamily:'inherit' }}>{children}</button>
}
