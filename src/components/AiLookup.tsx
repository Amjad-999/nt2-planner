import { useState, useRef } from 'react'
import { aiLookup, type LookupResult } from '@/features/ai/lookup'
import { useAppStore } from '@/store/useAppStore'
import { speakDutch } from '@/features/tts/speakDutch'

type Result = LookupResult

export function AiLookup() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [status, setStatus] = useState<'idle' | 'ready' | 'error'>('idle')
  const [statusText, setStatusText] = useState('جاهز للعمل — يستخدم قاموسًا مدمجًا، ومع اتصال إنترنت ينتقل تلقائيًا إلى MyMemory.')
  const vocabAdd = useAppStore((s) => s.vocabAdd)
  const speakBtnRef = useRef<HTMLButtonElement>(null)

  const lookup = async () => {
    const word = input.trim().toLowerCase()
    if (!word) return
    setLoading(true)
    setStatus('idle')
    setStatusText('يبحث…')
    try {
      const r = await aiLookup(word)
      setResult(r)
      setStatus('ready')
      const labels = ['', '✅ تمّ من القاموس المدمج (فوري، بدون إنترنت).', '✅ تمت الترجمة عبر MyMemory المجاني.', '⚠️ لا اتصال — عُرض تقدير محلّي.']
      setStatusText(labels[r.tier] ?? '')
      if (r.tier === 3) setStatus('error')
    } catch {
      setStatus('error')
      setStatusText('❌ حدث خطأ — حاول مجدّدًا.')
    } finally {
      setLoading(false)
    }
  }

  const addNow = () => {
    if (!result) return
    const ok = vocabAdd(result.nl, result.ar, result.exampleNL, result.level)
    if (ok) { setInput(''); setResult(null); setStatus('idle') }
    else alert('الكلمة موجودة في بنكك مسبقًا')
  }

  const addWithEdit = () => {
    if (!result) return
    const ar = prompt('المعنى بالعربية:', result.ar)
    if (ar == null) return
    const ex = prompt('جملة هولندية كمثال (اختياري):', result.exampleNL ?? '') ?? ''
    const lvl = (prompt('المستوى (A1/A2/B1/B2/C1):', result.level) ?? result.level).toUpperCase()
    const ok = vocabAdd(result.nl, ar, ex, lvl)
    if (ok) { setInput(''); setResult(null); setStatus('idle') }
  }

  const dotColor = status === 'ready' ? 'var(--green)' : status === 'error' ? 'var(--red)' : 'var(--amber)'

  return (
    <div style={{ background: 'linear-gradient(135deg,var(--purple-l),var(--orange-l))', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r)', padding: 18, marginBottom: 16, boxShadow: 'var(--elev-2), inset 0 1px 0 var(--glass-hi)' }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>🤖 ابحث عن كلمة هولندية بذكاء اصطناعي مجاني</h3>
      <div className="flex items-center gap-1.5 text-[.78rem] text-[var(--muted)] mb-2.5">
        <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: dotColor, verticalAlign: 'middle' }} />
        <span>{statusText}</span>
      </div>
      <div className="flex gap-2 mb-2.5">
        <input
          type="text" value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup()}
          placeholder="اكتب كلمة هولندية… مثل: vergadering, gezellig, afspraak"
          dir="ltr" lang="nl" autoComplete="off"
          className="flex-1 px-3 py-2.5 rounded-xl border border-[var(--border2)] bg-[var(--glass-bg-strong)] text-[var(--text)] font-[inherit] text-[.92rem] focus:outline-none focus:border-[var(--orange)] focus:ring-[3px] focus:ring-[var(--ring-primary)]"
          aria-label="ابحث عن كلمة هولندية"
        />
        <button
          onClick={lookup} disabled={loading || !input.trim()}
          className="btn-shine font-semibold text-white px-5 py-2.5 rounded-xl border-0 cursor-pointer disabled:opacity-60"
          style={{ background: 'var(--grad-primary)', boxShadow: 'var(--elev-2), inset 0 1px 0 rgba(255,255,255,.4)' }}
        >
          {loading ? '⏳' : '🔍 ابحث'}
        </button>
      </div>
      <div className="text-[.78rem] text-[var(--muted)]">يعطيك المعنى بالعربية + المستوى الأوروبي (A1–C1) + جملة مثال + النوع والجمع، ثم تضيفها بنقرة واحدة.</div>

      {result && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 10 }}>
          <div className="flex items-center gap-2 text-xl font-bold text-[var(--text)] mb-1">
            {result.nl}
            <button ref={speakBtnRef} onClick={() => speakDutch(result.nl, speakBtnRef.current)} className="text-[.78rem] px-1.5 py-0.5 rounded border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[var(--muted)] cursor-pointer hover:text-[var(--orange)]">🔊</button>
          </div>
          <div className="flex gap-1.5 flex-wrap mb-2">
            {result.article && <span style={{ background: 'var(--surface3)', color: 'var(--text2)', borderRadius: 99, padding: '2px 8px', fontSize: '.72rem', fontWeight: 600 }}>{result.article}</span>}
            {result.type && <span style={{ background: 'var(--surface3)', color: 'var(--text2)', borderRadius: 99, padding: '2px 8px', fontSize: '.72rem', fontWeight: 600 }}>{result.type}</span>}
            <span style={{ background: 'var(--surface3)', color: 'var(--text2)', borderRadius: 99, padding: '2px 8px', fontSize: '.72rem', fontWeight: 600 }}>CEFR {result.level}</span>
            <span style={{ background: 'var(--purple-l)', color: 'var(--purple)', borderRadius: 99, padding: '2px 8px', fontSize: '.72rem', fontWeight: 600 }}>{result.source}</span>
          </div>
          <div className="text-[var(--text)] text-[1rem] mb-2 font-medium">📖 {result.ar}</div>
          {result.examples && result.examples.length > 0 ? (
            <div className="mb-1">
              <div className="text-[var(--muted)] text-[.78rem] mb-1.5">📝 أمثلة لفهم المعنى في سياقه:</div>
              {result.examples.map((ex, i) => (
                <div key={i} className="py-2 px-2.5 rounded-md mb-1.5" style={{ background: 'var(--surface2)' }}>
                  <div className="flex items-start gap-1.5">
                    <span dir="ltr" lang="nl" className="flex-1 text-[var(--text2)] text-[.88rem] italic">"{ex.nl}"</span>
                    <button
                      onClick={(e) => speakDutch(ex.nl, e.currentTarget)}
                      aria-label="استمع لنطق الجملة"
                      className="shrink-0 text-[.72rem] px-1.5 py-0.5 rounded border border-[var(--btn-border)] bg-[var(--btn-bg)] text-[var(--muted)] cursor-pointer hover:text-[var(--orange)] hover:border-[var(--orange)]"
                    >🔊</button>
                  </div>
                  {ex.ar && <div className="text-[var(--muted)] text-[.82rem] mt-1">{ex.ar}</div>}
                </div>
              ))}
            </div>
          ) : (
            result.exampleNL && <div className="text-[var(--text2)] text-[.88rem] py-2 px-2.5 rounded-md italic mb-1" style={{ background: 'var(--surface2)' }}>"{result.exampleNL}"</div>
          )}
          <div className="flex gap-1.5 justify-end flex-wrap mt-2">
            <button onClick={addWithEdit} className="btn-glass text-[.8rem] px-3 py-1.5 rounded-[10px] text-[var(--text2)] cursor-pointer hover:text-[var(--orange)]">✏️ تعديل قبل الإضافة</button>
            <button onClick={addNow} className="btn-shine text-[.8rem] px-3 py-1.5 rounded-[10px] border-0 text-white cursor-pointer font-semibold" style={{ background: 'var(--grad-primary)', boxShadow: 'var(--elev-1), inset 0 1px 0 rgba(255,255,255,.35)' }}>➕ أضف إلى بنك المفردات</button>
          </div>
        </div>
      )}
    </div>
  )
}
