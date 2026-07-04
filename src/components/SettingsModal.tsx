import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { _voices, loadVoices } from '@/features/tts/voices'
import { testAudio } from '@/features/tts/speakDutch'
import { CloudPanel } from './CloudPanel'

interface Props { onClose: () => void }

export function SettingsModal({ onClose }: Props) {
  const s = useAppStore()
  const [name, setName] = useState(s.name)
  const [examDate, setExamDate] = useState(() => { try { return new Date(s.examDate).toISOString().slice(0,10) } catch { return '' } })
  const [rate, setRate] = useState(String(s.prefs.rate))
  const [ttsEngine, setTtsEngine] = useState(s.prefs.ttsEngine)
  const [voiceURI, setVoiceURI] = useState(s.prefs.voiceURI)
  // FIX 3: study capacity prefs
  const [studyDayMinutes, setStudyDayMinutes] = useState(String(s.prefs.studyDayMinutes ?? 60))
  const [minutesPerTask,  setMinutesPerTask]  = useState(String(s.prefs.minutesPerTask  ?? 30))
  const [testResult, setTestResult] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => { loadVoices() }, [])

  const save = () => {
    s.saveSettings({
      name: name.trim(),
      examDate: examDate ? new Date(examDate + 'T09:00:00').toISOString() : s.examDate,
      prefs: {
        rate: parseFloat(rate) || 0.9,
        ttsEngine, voiceURI,
        studyDayMinutes: Math.min(480, Math.max(15, parseInt(studyDayMinutes) || 60)),
        minutesPerTask:  Math.min(120, Math.max(5,   parseInt(minutesPerTask)  || 30)),
      },
    })
    onClose()
  }

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(s, null, 2)], { type:'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `nt2-planner-backup-${new Date().toISOString().slice(0,10)}.json`
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return
    const r = new FileReader()
    r.onload = () => { const ok = s.importData(r.result as string); alert(ok ? 'تمّ الاستيراد ✅' : 'ملفّ غير صالح ❌') }
    r.readAsText(f); e.target.value = ''
  }

  const handleReset = () => { if (confirm('سيتم حذف كلّ بياناتك — هل أنت متأكّد؟')) { s.resetAll(); onClose() } }

  const handleTest = async () => { setTestResult('يجرّب الآن…'); try { const r = await testAudio(); setTestResult(r) } catch (e) { setTestResult('❌ فشل: ' + String(e)) } }

  return (
    <Overlay onClose={onClose}>
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:'1.35rem', fontWeight:700, color:'var(--text)', marginBottom:8 }}>⚙️ الإعدادات</h3>
      <p style={{ color:'var(--muted)', fontSize:'.88rem', marginBottom:14 }}>اضبط بياناتك واستهدافك للامتحان.</p>

      <CloudPanel />

      <Field label="اسمك (اختياري)"><input className="form-in" value={name} onChange={(e)=>setName(e.target.value)} placeholder="اسمك" /></Field>
      <Field label="تاريخ الامتحان"><input className="form-in" type="date" value={examDate} onChange={(e)=>setExamDate(e.target.value)} /></Field>
      <Field label="مدّة الخطّة"><div style={{ fontSize:'.85rem', color:'var(--muted)', padding:'4px 0' }}>تُحسب تلقائيًا من تاريخ الامتحان — يومك الحالي في الخطّة يتقدّم وحده مع الأيام.</div></Field>
      {/* FIX 3 — study capacity inputs */}
      <Field label="دقائق الدراسة المتاحة يوميًا">
        <input
          className="form-in"
          type="number"
          value={studyDayMinutes}
          onChange={(e) => setStudyDayMinutes(e.target.value)}
          min={15} max={480}
          style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)' }}
        />
      </Field>
      <Field label="متوسّط دقائق التمرين الواحد">
        <input
          className="form-in"
          type="number"
          value={minutesPerTask}
          onChange={(e) => setMinutesPerTask(e.target.value)}
          min={5} max={120}
          style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)' }}
        />
      </Field>
      <Field label="سرعة النطق الهولندي">
        <select className="form-in" value={rate} onChange={(e)=>setRate(e.target.value)}>
          <option value="0.8">بطيئة (0.8×)</option>
          <option value="0.9">طبيعية (0.9×)</option>
          <option value="1.0">عادية (1.0×)</option>
          <option value="1.1">سريعة (1.1×)</option>
        </select>
      </Field>
      <Field label="صوت هولندي مفضّل (متصفّح)">
        <select className="form-in" value={voiceURI} onChange={(e)=>setVoiceURI(e.target.value)}>
          <option value="">(تلقائي — أفضل صوت طبيعي متوفّر)</option>
          {_voices.filter((v)=>/^nl/i.test(v.lang)).map((v)=><option key={v.voiceURI} value={v.voiceURI}>{v.name} ({v.lang})</option>)}
        </select>
      </Field>
      <Field label="محرّك النطق الصوتي">
        <select className="form-in" value={ttsEngine} onChange={(e)=>setTtsEngine(e.target.value as 'auto'|'online'|'browser')}>
          <option value="auto">تلقائي — صوت Google الهولندي، ثمّ صوت الجهاز (موصى به)</option>
          <option value="online">عبر الإنترنت — صوت Google الهولندي (يتطلّب اتصالًا)</option>
          <option value="browser">متصفّح فقط — يتطلّب صوتًا هولنديًّا مثبَّتًا على جهازك</option>
        </select>
      </Field>
      <div style={{ marginBottom:14 }}>
        <button onClick={handleTest} style={btnStyle('primary')}>🔊 اختبر الصوت الآن</button>
        {testResult && <div style={{ marginTop:8, fontSize:'.84rem', color:'var(--muted)' }} dangerouslySetInnerHTML={{ __html: testResult }} />}
      </div>

      <details style={{ marginBottom:14 }}>
        <summary style={{ cursor:'pointer', color:'var(--text2)', fontSize:'.88rem' }}>إجراءات متقدّمة</summary>
        <div style={{ marginTop:10, display:'flex', gap:8, flexWrap:'wrap' }}>
          <button onClick={handleExport} style={btnStyle('ghost')}>📥 تصدير بياناتي (JSON)</button>
          <button onClick={()=>fileRef.current?.click()} style={btnStyle('ghost')}>📤 استيراد</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport} />
          <button onClick={handleReset} style={btnStyle('danger')}>🗑️ إعادة تعيين كاملة</button>
        </div>
      </details>

      <div style={{ marginTop:16, textAlign:'center' }}>
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
          style={{ fontSize:'.8rem', color:'var(--muted)', textDecoration:'underline' }}>
          سياسة الخصوصية
        </a>
      </div>

      <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:14, flexWrap:'wrap' }}>
        <button onClick={onClose} style={btnStyle('ghost')}>إلغاء</button>
        <button onClick={save} style={btnStyle('primary')}>حفظ</button>
      </div>
    </Overlay>
  )
}

/* ── Shared overlay helpers ── */
export function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onClose])
  return (
    <div
      style={{ position:'fixed', inset:0, background:'var(--overlay-bg)', backdropFilter:'blur(10px) saturate(1.2)', WebkitBackdropFilter:'blur(10px) saturate(1.2)', zIndex:900, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog" aria-modal="true"
    >
      <div style={{ background:'var(--glass-bg-strong)', backdropFilter:'blur(26px) saturate(1.4)', WebkitBackdropFilter:'blur(26px) saturate(1.4)', border:'1px solid var(--glass-border)', boxShadow:'var(--elev-3), inset 0 1px 0 var(--glass-hi)', borderRadius:'calc(var(--r) + 2px)', padding:24, maxWidth:520, width:'100%', maxHeight:'88vh', overflowY:'auto', animation:'popIn .28s cubic-bezier(.2,.8,.2,1) both' }}>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div style={{ marginBottom:10 }}><label style={{ display:'block', fontSize:'.85rem', fontWeight:500, color:'var(--text2)', marginBottom:6 }}>{label}</label>{children}</div>
}

// eslint-disable-next-line react-refresh/only-export-components -- مساعد أنماط (ليس مكوّنًا)
export function btnStyle(variant: 'primary'|'ghost'|'danger') {
  const base = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6, padding:'10px 18px', borderRadius:14, fontFamily:'inherit', fontSize:'.9rem', fontWeight:600, cursor:'pointer', border:'1px solid transparent', transition:'.18s' } as const
  if (variant==='primary') return { ...base, background:'var(--grad-primary)', color:'#fff', border:'none', boxShadow:'var(--elev-2), inset 0 1px 0 rgba(255,255,255,.4)' }
  if (variant==='danger') return { ...base, background:'transparent', color:'var(--red)', borderColor:'var(--red)' }
  return { ...base, background:'var(--glass-bg)', backdropFilter:'blur(8px)' as const, WebkitBackdropFilter:'blur(8px)' as const, color:'var(--text2)', borderColor:'var(--glass-border)', boxShadow:'var(--elev-1)' }
}
