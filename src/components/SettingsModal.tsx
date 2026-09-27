import { useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { _voices, loadVoices } from '@/features/tts/voices'
import { testAudio } from '@/features/tts/speakDutch'
import { CloudPanel } from './CloudPanel'
import { toast } from './Toast'

interface Props { onClose: () => void }

export function SettingsModal({ onClose }: Props) {
  const s = useAppStore()
  const [name, setName] = useState(s.name)
  const [examDate, setExamDate] = useState(() => { try { return new Date(s.examDate).toISOString().slice(0,10) } catch { return '' } })
  const [rate, setRate] = useState(String(s.prefs.rate))
  const [fontSize, setFontSize] = useState(String(s.prefs.fontSize ?? 16))
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
        fontSize: Math.min(19, Math.max(13, Number(fontSize) || 16)),
        rate: parseFloat(rate) || 0.9,
        ttsEngine, voiceURI,
        studyDayMinutes: Math.min(480, Math.max(15, parseInt(studyDayMinutes) || 60)),
        minutesPerTask:  Math.min(120, Math.max(5,   parseInt(minutesPerTask)  || 30)),
      },
    })
    toast('حُفظت الإعدادات')
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
    r.onload = () => { const ok = s.importData(r.result as string); if (ok) toast('تمّ الاستيراد'); else toast('ملفّ غير صالح', 'error') }
    r.readAsText(f); e.target.value = ''
  }

  // Full reload (not just onClose) after resetAll(): theme/focus attributes are
  // written straight to <html> and several widgets seed useState once at mount,
  // so a reload is the cheapest way to guarantee nothing stale survives.
  const handleReset = () => {
    if (!confirm('سيتم حذف كلّ بياناتك — هل أنت متأكّد؟')) return
    s.resetAll()
    window.location.reload()
  }

  const handleTest = async () => { setTestResult('يجرّب الآن…'); try { const r = await testAudio(); setTestResult(r) } catch (e) { setTestResult('❌ فشل: ' + String(e)) } }

  return (
    <Overlay onClose={onClose} label="الإعدادات">
      <h3 style={{ fontFamily:'var(--font-display)', fontSize:'var(--text-xl)', fontWeight:'var(--fw-heading)', color:'var(--text)', marginBottom:'var(--sp-2)' }}>⚙️ الإعدادات</h3>
      <p style={{ color:'var(--muted)', fontSize:'var(--text-sm)', marginBottom:'var(--sp-3)' }}>اضبط بياناتك واستهدافك للامتحان.</p>

      <CloudPanel />

      <Group>التعلّم</Group>
      <Field label="اسمك (اختياري)"><input className="form-in" value={name} onChange={(e)=>setName(e.target.value)} placeholder="اسمك" /></Field>
      <Field label="حجم خط الواجهة">
        <select className="form-in" value={fontSize} onChange={(e) => setFontSize(e.target.value)}>
          {[13, 14, 15, 16, 17, 18, 19].map(size => <option key={size} value={size}>{size === 16 ? `${size} — افتراضي` : size}</option>)}
        </select>
      </Field>
      <Field label="تاريخ الامتحان"><input className="form-in" type="date" value={examDate} onChange={(e)=>setExamDate(e.target.value)} /></Field>
      <Field label="مدّة الخطّة"><div style={{ fontSize:'var(--text-sm)', color:'var(--text2)', padding:'4px 0' }}>تُحسب تلقائيًا من تاريخ الامتحان — يومك الحالي في الخطّة يتقدّم وحده مع الأيام.</div></Field>
      {/* FIX 3 — study capacity inputs */}
      <Field label="دقائق الدراسة المتاحة يوميًا">
        <input
          className="form-in"
          type="number"
          value={studyDayMinutes}
          onChange={(e) => setStudyDayMinutes(e.target.value)}
          min={15} max={480}
          style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'var(--text-sm)', color:'var(--text)' }}
        />
      </Field>
      <Field label="متوسّط دقائق التمرين الواحد">
        <input
          className="form-in"
          type="number"
          value={minutesPerTask}
          onChange={(e) => setMinutesPerTask(e.target.value)}
          min={5} max={120}
          style={{ width:'100%', padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'var(--text-sm)', color:'var(--text)' }}
        />
      </Field>
      <Group>الصوت والنطق</Group>
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
      <div style={{ marginBottom:'var(--sp-3)' }}>
        <button onClick={handleTest} className="btn-shine" style={btnStyle('primary')}>🔊 اختبر الصوت الآن</button>
        {/* testAudio يعيد نصًّا عاديًّا — العرض كنصّ يمنع حقن أي HTML قادم من رسالة خطأ */}
        {testResult && <div style={{ marginTop:'var(--sp-2)', fontSize:'var(--text-sm)', color:'var(--muted)' }}>{testResult}</div>}
      </div>

      <Group>المرشدة كاتيا</Group>
      <Field label="كاتيا 🐱">
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text2)', cursor: 'pointer' }}>
          <input type="checkbox" checked={!s.mascotDismissed} onChange={() => s.toggleMascot()} />
          إظهار كاتيا (المرشدة التفاعلية) في زاوية الشاشة
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', fontSize: 'var(--text-sm)', color: 'var(--text2)', cursor: 'pointer', marginTop: 'var(--sp-2)' }}>
          <input type="checkbox" checked={s.botWordReminders} onChange={() => s.toggleBotWordReminders()} />
          تذكير بكلمات المهام المكتملة كل دقيقتين
        </label>
      </Field>

      <Group>بياناتك</Group>
      <details style={{ marginBottom:'var(--sp-3)' }}>
        <summary style={{ minHeight: 44, display: 'flex', alignItems: 'center', cursor:'pointer', color:'var(--text2)', fontSize:'var(--text-sm)' }}>نسخة احتياطية، استيراد، أو إعادة تعيين</summary>
        <div style={{ marginTop:'var(--sp-3)', display:'flex', gap:'var(--sp-2)', flexWrap:'wrap' }}>
          <button onClick={handleExport} className="btn-shine" style={btnStyle('ghost')}>📥 تصدير بياناتي (JSON)</button>
          <button onClick={()=>fileRef.current?.click()} className="btn-shine" style={btnStyle('ghost')}>📤 استيراد</button>
          <input ref={fileRef} type="file" accept=".json" style={{ display:'none' }} onChange={handleImport} />
          <button onClick={handleReset} style={btnStyle('danger')}>🗑️ إعادة تعيين كاملة</button>
        </div>
      </details>

      <div style={{ marginTop:'var(--sp-4)', textAlign:'center' }}>
        <a href="/privacy.html" target="_blank" rel="noopener noreferrer"
          style={{ fontSize:'var(--text-xs)', color:'var(--muted)', textDecoration:'underline' }}>
          سياسة الخصوصية
        </a>
      </div>

      <div style={{ display:'flex', gap:'var(--sp-3)', justifyContent:'flex-end', marginTop:'var(--sp-3)', flexWrap:'wrap' }}>
        <button onClick={onClose} className="btn-shine" style={btnStyle('ghost')}>إلغاء</button>
        <button onClick={save} className="btn-shine" style={btnStyle('primary')}>حفظ</button>
      </div>
    </Overlay>
  )
}

/* ── Shared overlay helpers ── */
export function Overlay({ children, onClose, label }: { children: React.ReactNode; onClose: () => void; label: string }) {
  const panelRef = useRef<HTMLDivElement>(null)

  // A11y: focus management for the modal — move focus into the panel on open,
  // trap Tab within it, close on Escape, and restore focus to the trigger on
  // unmount. (aria-modal alone does not constrain DOM focus, so keyboard users
  // could otherwise Tab out to the page behind the dialog.)
  useEffect(() => {
    const trigger = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const focusables = () => {
      if (!panel) return []
      const all = Array.from(
        panel.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),summary,[tabindex]:not([tabindex="-1"])',
        ),
      )
      // Drop hidden nodes (e.g. the file input, collapsed <details> content).
      // offsetParent has no layout in jsdom, so fall back to the full list there.
      const visible = all.filter((el) => el.offsetParent !== null)
      return visible.length ? visible : all
    }

    panel?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) { e.preventDefault(); panel?.focus(); return }
      const first = items[0], last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panel)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
      else if (active && panel && !panel.contains(active)) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      trigger?.focus?.()
    }
  }, [onClose])

  return (
    <div
      style={{ position:'fixed', inset:0, background:'var(--overlay-bg)', backdropFilter:'blur(10px) saturate(1.2)', WebkitBackdropFilter:'blur(10px) saturate(1.2)', zIndex:900, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      role="dialog" aria-modal="true" aria-label={label}
    >
      <div ref={panelRef} tabIndex={-1} style={{ outline:'none', background:'var(--modal-bg)', backdropFilter:'blur(30px) saturate(2)', WebkitBackdropFilter:'blur(30px) saturate(2)', border:'1px solid var(--modal-border)', boxShadow:'var(--elev-3), inset 0 1px 0 var(--glass-hi)', borderRadius:'calc(var(--r) + 2px)', padding:24, maxWidth:520, width:'100%', maxHeight:'88vh', overflowY:'auto', animation:'popIn .28s cubic-bezier(.2,.8,.2,1) both' }}>
        {children}
      </div>
    </div>
  )
}

/* عنوان مجموعة داخل الإعدادات: الحقول المتقاربة تُقرأ معًا بدل قائمة طويلة
   واحدة. Heading, not a styled div, so screen-reader users can jump between
   the groups. */
export function Group({ children }: { children: React.ReactNode }) {
  return (
    <h4 style={{
      margin: 'var(--sp-5) 0 var(--sp-3)', paddingBottom: 'var(--sp-2)',
      borderBottom: '1px solid var(--border)',
      fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-cta)', color: 'var(--text)',
    }}>{children}</h4>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  // الحقل داخل <label> نفسها → ربط ضمني بلا حاجة إلى id/htmlFor (a11y: label)
  return (
    <label style={{ display:'block', marginBottom:'var(--sp-3)' }}>
      <span style={{ display:'block', fontSize:'var(--text-sm)', fontWeight:'var(--fw-medium)', color:'var(--text2)', marginBottom:'var(--sp-2)' }}>{label}</span>
      {children}
    </label>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- مساعد أنماط (ليس مكوّنًا)
export function btnStyle(variant: 'primary'|'ghost'|'danger') {
  const base = { display:'inline-flex', alignItems:'center', justifyContent:'center', gap:'var(--sp-2)', padding:'10px 18px', borderRadius:'var(--r-sm)', fontFamily:'inherit', fontSize:'var(--text-sm)', fontWeight:'var(--fw-heading)', cursor:'pointer', border:'1px solid transparent', transition:'.18s' } as const
  if (variant==='primary') return { ...base, background:'var(--btn-bg)', backdropFilter:'blur(10px)' as const, WebkitBackdropFilter:'blur(10px)' as const, color:'var(--text)', fontWeight:'var(--fw-cta)', borderColor:'var(--btn-border)', boxShadow:'var(--elev-1), inset 0 1px 0 var(--glass-hi)' }
  if (variant==='danger') return { ...base, background:'transparent', color: 'var(--red-text)', borderColor:'var(--red)' }
  return { ...base, background:'var(--btn-bg)', backdropFilter:'blur(10px)' as const, WebkitBackdropFilter:'blur(10px)' as const, color:'var(--text2)', borderColor:'var(--btn-border)', boxShadow:'var(--elev-1)' }
}
