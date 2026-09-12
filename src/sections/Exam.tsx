import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { EXAM_READING, EXAM_LISTENING, EXAM_WRITING, EXAM_SPEAKING } from '@/data/examContent'
import { PASS_THRESHOLD, LEARNED_BOX } from '@/data/phases'
import { PassagePractice } from '@/components/exam/PassagePractice'
import { Segmented } from '@/components/ui/Segmented'
import { dueWords } from '@/features/vocab/queue'
import { peekNavIntent, clearNavIntent } from '@/lib/navIntent'
import { useSpeech } from '@/features/tts/useSpeech'
import { FlashCard } from '@/components/FlashCard'
import { WordCard } from '@/components/WordCard'
import { SpeakAndCheck } from '@/components/SpeakAndCheck'
import { WritingFeedbackPanel } from '@/components/exam/WritingFeedbackPanel'
import { MockExamPanel } from '@/components/exam/MockExamPanel'
import { useFuzzySearch, getMatchIndices } from '@/hooks/useFuzzySearch'
import { useNow } from '@/hooks/useNow'
import { wordCount } from '@/lib/utils'
import type { AppStore } from '@/store/useAppStore'
import type { ExamWord, SkillKey } from '@/store/types'
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

type ExamView = 'mock' | 'reading' | 'listening' | 'writing' | 'speaking' | 'words'

/** Maps a mock-exam skill onto the tab that holds its questions. */
const SKILL_TAB: Record<SkillKey, ExamView> = {
  reading: 'reading', listening: 'listening', writing: 'writing', speaking: 'speaking',
}

export default function Exam() {
  // "تدرّب على الاستماع" on the home screen opens that skill directly.
  const [view, setView] = useState<ExamView>(() => peekNavIntent('exam')?.view ?? 'reading')
  useEffect(() => { clearNavIntent('exam') }, [])
  const s = useAppStore()

  const SEG: { id: ExamView; label: string }[] = [
    { id:'mock',      label:'⏱️ امتحان كامل' },
    { id:'reading',   label:'📖 القراءة (Lezen)' },
    { id:'listening', label:'🎧 الاستماع (Luisteren)' },
    { id:'writing',   label:'✍️ الكتابة (Schrijven)' },
    { id:'speaking',  label:'🗣️ التحدّث (Spreken)' },
    { id:'words',     label:'🆕 كلمات الامتحانات' },
  ]

  return (
    <div className="page">
      <h2 className="section-title">
        تدريب امتحان NT2 — المستوى B1
      </h2>
      <p style={{ margin: '0 0 var(--sp-4)', color: 'var(--text2)', lineHeight: 'var(--lh-arabic)' }}>
        تمارين بأسلوب امتحانات DUO. المحتوى مكتوب للتدريب على مستوى B1، ونتائجه لا تعني اجتياز الامتحان الرسمي.
      </p>
      <Segmented label="جزء الامتحان" value={view} onChange={setView} options={SEG} />
      {view==='mock'      && <MockExamPanel onGoToSkill={(k) => setView(SKILL_TAB[k])} />}
      {view==='reading'   && <PassagePractice kind="reading" items={EXAM_READING} answers={s.examReading} onAnswer={s.answerReading} onReset={s.resetReading} />}
      {view==='listening' && <PassagePractice kind="listening" items={EXAM_LISTENING} answers={s.examListening} onAnswer={s.answerListening} onReset={s.resetListening} />}
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
      <div style={{ fontFamily:'var(--font-latin)', fontSize:'var(--text-2xl)', fontWeight:'var(--fw-heading)', color:pass?'var(--green-text)':'var(--orange-text)', lineHeight:'var(--lh-tight)', fontFeatureSettings:"'tnum'" }}>{pct}%</div>
      <div style={{ fontSize:'var(--text-sm)', color:'var(--text2)', marginTop:'var(--sp-1)' }}>{pass?'✅ فوق عتبة النجاح (65%)':'❌ تحت العتبة — استمرّ!'}</div>
      <div style={{ height:8, background:'var(--surface3)', borderRadius:'var(--r-2xs)', margin:'14px 0 4px', overflow:'hidden', position:'relative' }}>
        <div className="progress-wave" style={{ height:'100%', backgroundColor:pass?'var(--green)':'var(--orange)', width:`${pct}%`, transition:'width .8s ease' }} />
        <div style={{ position:'absolute', top:-3, bottom:-3, width:2, background:'var(--green)', insetInlineStart:`${PASS_THRESHOLD}%` }}>
          <span style={{ position:'absolute', top:-18, insetInlineStart:'50%', transform:'translateX(-50%)', fontSize:'var(--text-2xs)', color: 'var(--green-text)', fontWeight:'var(--fw-heading)', whiteSpace:'nowrap' }}>العتبة</span>
        </div>
      </div>
    </div>
  )
}

type S = AppStore

function WritingView({ s }: { s: S }) {
  return (
    <div>
      <InfoBox color="blue">✍️ <strong>Schrijven — أسلوب DUO:</strong> {EXAM_WRITING.length} مهام كتابة معايرة على B1.</InfoBox>
      {EXAM_WRITING.map((w) => {
        const cur = s.examWriting[w.id] ?? { text:'', score:0 }
        const wc = wordCount(cur.text ?? '')
        const inRange = wc>=w.minWords && wc<=w.maxWords
        return (
          <Card key={w.id}>
            {/* Dutch task title → LTR */}
            <h3 dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontSize:'var(--text-lg)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'0 0 6px' }}>
              📝 {w.titleNl}
            </h3>
            <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'18px 20px', margin:'12px 0 10px', boxShadow:'var(--elev-1)' }}>
              {/* Dutch brief → LTR */}
              <p dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', lineHeight:'var(--lh-arabic)' }}><strong>Opdracht:</strong> {w.briefNl}</p>
              {/* Arabic UI guidance — stays RTL */}
              <p style={{ fontSize:'var(--text-sm)', color:'var(--muted)', marginTop:'var(--sp-2)' }}>عدد الكلمات المستهدف: <strong>{w.minWords}–{w.maxWords}</strong></p>
            </div>
            <textarea value={cur.text??''} aria-label={`إجابة مهمّة الكتابة: ${w.titleNl}`} onChange={(e)=>{ s.saveWriting(w.id,e.target.value); clearTimeout((window as unknown as Record<string,number>)._wSave); (window as unknown as Record<string,ReturnType<typeof setTimeout>>)._wSave=setTimeout(()=>s.save(),600) }} rows={8} placeholder="اكتب إجابتك بالهولندية هنا..." dir="ltr" lang="nl"
              style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', background:'var(--glass-bg-strong)', backdropFilter:'blur(6px)', fontFamily:'var(--font-latin)', fontSize:'var(--text-base)', color:'var(--text)', resize:'vertical', minHeight:80, lineHeight:'var(--lh-ui)' }} />
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:'var(--sp-2)', flexWrap:'wrap', gap:'var(--sp-2)' }}>
              <div style={{ fontSize:'var(--text-sm)', color:inRange?'var(--green-text)':'var(--muted)' }}><strong>{wc}</strong> كلمة / {w.minWords}–{w.maxWords}</div>
              <div style={{ display:'flex', gap:'var(--sp-2)' }}>
                <GhostBtn onClick={()=>s.resetWriting(w.id)}>🔄 مسح</GhostBtn>
              </div>
            </div>
            <WritingFeedbackPanel
              task={w}
              text={cur.text ?? ''}
              onRecord={(total, summary) => { s.scoreWriting(w.id, total, summary); s.save() }}
            />
            {cur.score>0&&(<><div style={{ marginTop:'var(--sp-3)', fontSize:'var(--text-sm)', color:'var(--muted)' }}>آخر درجة مسجّلة</div><PassBar pct={cur.score}/></>)}
          </Card>
        )
      })}
    </div>
  )
}

type SpeakLevel = 'notyet' | 'almost' | 'good'
/* Scores stay below / at / above the practice target (PASS_THRESHOLD = 65),
   so the speaking skill history keeps meaning what it meant. */
const SPEAK_LEVELS: { id: SpeakLevel; score: number; icon: string; label: string; hint: string }[] = [
  { id: 'notyet', score: 35, icon: '○', label: 'أحتاج تدريبًا', hint: 'تردّدت كثيرًا أو لم تكمل الجواب. استمع إلى النموذج مرّة أخرى، ثم أعد المحاولة.' },
  { id: 'almost', score: 55, icon: '◐', label: 'قريب', hint: 'أجبت، مع توقّف أو أخطاء. ركّز على الجملة الأولى والأخيرة من الجواب.' },
  { id: 'good',   score: 80, icon: '●', label: 'واثق', hint: 'أجبت بوضوح وفي الوقت. انتقل إلى المهمّة التالية.' },
]
/** Older saves stored any 0–100 value from a slider; map it to the nearest level. */
function speakLevelOf(score: number): SpeakLevel | '' {
  if (score <= 0) return ''
  return score >= 70 ? 'good' : score >= 45 ? 'almost' : 'notyet'
}

function SpeakingView({ s }: { s: S }) {
  const d1 = EXAM_SPEAKING.filter((x)=>x.deel===1)
  const d2 = EXAM_SPEAKING.filter((x)=>x.deel===2)
  return (
    <div>
      <InfoBox color="blue">🗣️ <strong>Spreken — أسلوب DUO:</strong> {EXAM_SPEAKING.length} مهمّة: {d1.length} قصيرة (20 ث) و{d2.length} موسّعة (30 ث). استمع للنموذج، ثمّ قيّم نفسك.</InfoBox>
      {[
        {n:'Deel 1 — Korte reactie (20 sec.)', arr:d1},
        {n:'Deel 2 — Uitgebreide reactie (30 sec.)', arr:d2},
      ].map((grp)=>(
        <div key={grp.n}>
          <h3 dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'18px 0 10px' }}>{grp.n}</h3>
          {grp.arr.map((sp, idx)=>{
            const saved = s.examSpeaking[sp.id]??{score:0,at:0}
            return (
              <Card key={sp.id}>
                {/* Dutch task label — no Arabic title */}
                {/* الترقيم داخل كل جزء يبدأ من واحد، فبدونه يبدو الجزء الثاني
                    وكأنّه كلّ البنك. إضافة المجموع تُزيل هذا الالتباس. */}
                <div dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', fontWeight:'var(--fw-heading)', color:'var(--text)', marginBottom:'var(--sp-2)' }}>
                  🎤 Spreektaak {idx + 1} / {grp.arr.length}
                </div>
                {/* Dutch situation + task → LTR, no Arabic translations */}
                <div dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:'18px 20px', marginBottom:'var(--sp-3)', boxShadow:'var(--elev-1)', lineHeight:'var(--lh-arabic)' }}>
                  <p><strong>Situatie:</strong> {sp.situatieNl}</p>
                  <p style={{ marginTop:'var(--sp-2)' }}><strong>Taak:</strong> {sp.taakNl}</p>
                </div>
                <TtsPlayer text={sp.voorbeeldNl} label="🔊 استمع للجواب النموذجي" />
                <details style={{ marginTop:'var(--sp-2)' }}>
                  <summary style={{ cursor:'pointer', color:'var(--text2)', fontSize:'var(--text-sm)' }}>📜 إظهار النموذج</summary>
                  <div dir="ltr" lang="nl" style={{ fontFamily:'var(--font-latin)', marginTop:'var(--sp-2)', padding:10, background:'var(--surface2)', borderRadius:'var(--r-xs)', fontSize:'var(--text-base)', color:'var(--text)', lineHeight:'var(--lh-arabic)' }}>{sp.voorbeeldNl}</div>
                </details>
                <SpeakAndCheck targetNl={sp.voorbeeldNl} label="كرّر الجواب النموذجي" />
                {/* تقييم ذاتي بثلاث درجات مفهومة بدل شريط 0–100: رقم مثل 73 لا
                    يعني شيئًا حين يقيّم المتعلّم نفسه. كل درجة تُخزَّن بقيمة
                    ثابتة فيبقى سجلّ مهارة التحدّث متوافقًا. */}
                <div style={{ marginTop:'var(--sp-3)' }}>
                  <p style={{ margin: '0 0 var(--sp-2)', fontSize:'var(--text-sm)', fontWeight:'var(--fw-heading)', color:'var(--text)' }}>كيف كان جوابك؟ قيّم نفسك بصدق:</p>
                  <Segmented
                    label={`تقييمك الذاتي لمهمّة التحدّث ${idx + 1}`}
                    value={speakLevelOf(saved.score) || null}
                    onChange={(lv) => s.setSpeakingScore(sp.id, SPEAK_LEVELS.find((l) => l.id === lv)!.score)}
                    options={SPEAK_LEVELS.map((l) => ({ id: l.id, label: <><span aria-hidden="true">{l.icon} </span>{l.label}</> }))}
                  />
                  {saved.score > 0 && (
                    <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>
                      {SPEAK_LEVELS.find((l) => l.id === speakLevelOf(saved.score))?.hint}
                    </p>
                  )}
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
  // Same queue definition as the vocabulary tab — see features/vocab/queue.
  const dueExam = dueWords(examWords, now)

  const fuseResults = useFuzzySearch(examWords, EXAM_FUSE_OPTIONS, search)
  const filtered = fuseResults ? fuseResults.map(r => r.item) : examWords
  const resultMap = new Map(fuseResults?.map(r => [r.item.id, r]) ?? [])

  const openAdd = () => { const nl=prompt('الكلمة الهولندية:'); if(!nl)return; const ar=prompt('المعنى بالعربية:'); if(!ar)return; const ex=prompt('جملة مثال (اختياري):')?? ''; const lvl=(prompt('المستوى (B1):')?? 'B1').toUpperCase(); addExamWord(nl,ar,ex,lvl) }
  return (
    <div>
      <InfoBox color="blue">🆕 <strong>كلمات الامتحانات الجديدة</strong> — كل كلمة جديدة تصادفها، أضِفها هنا.</InfoBox>
      <div style={{ display:'flex', gap:'var(--sp-3)', alignItems:'center', marginBottom:'var(--sp-3)', flexWrap:'wrap' }}>
        <div style={{ position:'relative', flex:1, minWidth:200 }}>
          <input
            type="text"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
            placeholder="🔍 ابحث بشكل مرن..."
            aria-label="بحث مرن في كلمات الامتحان"
            style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'var(--text-base)', color:'var(--text)', boxSizing:'border-box' }}
          />
          {search && (
            <button onClick={()=>setSearch('')} aria-label="مسح البحث"
              style={{ position:'absolute', insetInlineEnd:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:'var(--text-base)' }}>✕</button>
          )}
        </div>
        <PrimaryBtn onClick={openAdd}>➕ إضافة كلمة</PrimaryBtn>
        {dueExam.length>0 && <GhostBtn onClick={()=>setReviewing(true)}>🎴 مراجعة ({dueExam.length})</GhostBtn>}
      </div>
      {search.trim() && (
        <div style={{ fontSize:'var(--text-sm)', color:'var(--muted)', marginBottom:'var(--sp-2)' }} aria-live="polite" aria-atomic="true">
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
  return <div style={{ background:'var(--glass-bg)', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', border:'1px solid var(--glass-border)', borderRadius:'var(--r)', padding:18, boxShadow:'var(--elev-1)', marginBottom:'var(--sp-4)' }}>{children}</div>
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
        display:'inline-flex', alignItems:'center', gap:'var(--sp-2)', padding:'9px 16px', margin:'4px 0',
        borderRadius:'var(--r-sm)', border:'1px solid var(--btn-border)', cursor:'pointer',
        backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)',
        background: speaking ? 'var(--orange-l)' : 'var(--btn-bg)',
        color: speaking ? 'var(--orange-text)' : 'var(--text2)',
        fontFamily:'inherit', fontSize:'var(--text-sm)', fontWeight:'var(--fw-heading)', boxShadow:'var(--elev-1)',
      }}
    >
      {speaking ? '⏹ إيقاف' : label}
    </button>
  )
}
function InfoBox({ children, color }: { children: React.ReactNode; color: string }) {
  const c = `var(--${color})`; const bg = `var(--${color}-l)`
  return <div style={{ background:bg, border:'1px solid var(--glass-border)', borderInlineStart:`3px solid ${c}`, borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:'var(--sp-4)', fontSize:'var(--text-sm)', color:'var(--text2)' }}>{children}</div>
}

function GhostBtn({ children, onClick }: { children: React.ReactNode; onClick: ()=>void }) {
  return <button onClick={onClick} className="btn-glass" style={{ borderRadius:'var(--r-sm)', padding:'7px 12px', cursor:'pointer', fontSize:'var(--text-sm)', color:'var(--text2)', fontFamily:'inherit' }}>{children}</button>
}
function PrimaryBtn({ children, onClick }: { children: React.ReactNode; onClick: ()=>void }) {
  return <button onClick={onClick} className="btn-glass" style={{ borderRadius:'var(--r-sm)', padding:'7px 12px', cursor:'pointer', fontSize:'var(--text-sm)', fontWeight:'var(--fw-cta)', color:'var(--text)', fontFamily:'inherit' }}>{children}</button>
}
