import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { AiLookup } from '@/components/AiLookup'
import { WordCard } from '@/components/WordCard'
import { FlashCard } from '@/components/FlashCard'
import { B1_THEMAS } from '@/data/themas'
import { LEARNED_BOX } from '@/data/phases'
import { isFsrsLearned } from '@/features/vocab/fsrs'
import type { VocabWord } from '@/store/types'

type View = 'bank' | 'due' | 'review' | 'themas'

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default function Vocab(_: {}) {
  const { vocab, removeVocab, gradeFlash, vocabAdd } = useAppStore()
  const [view, setView] = useState<View>('bank')
  const [search, setSearch] = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [selectedThema, setSelectedThema] = useState(0)

  const isLearned = (w: VocabWord) =>
    w.fsrs_state !== undefined ? isFsrsLearned(w) : w.box >= LEARNED_BOX
  const dueWords = vocab.filter((w) => (w.due ?? 0) <= Date.now() && !isLearned(w))

  const filteredBank = vocab.filter((w) => {
    if (levelFilter && w.level !== levelFilter) return false
    if (search) { const s = search.toLowerCase(); return w.dutch.toLowerCase().includes(s) || w.arabic.includes(search) }
    return true
  }).sort((a, b) => (a.box - b.box) || (a.due - b.due))

  const SEG: { id: View; label: string }[] = [
    { id:'bank', label:'🗂️ بنك المفردات' },
    { id:'due', label:`⏰ مستحقّة (${dueWords.length})` },
    { id:'review', label:'🎴 جلسة مراجعة (SRS)' },
    { id:'themas', label:'🎨 مواضيع B1' },
  ]

  return (
    <div style={{ padding:'24px 28px 60px', maxWidth:1100, margin:'0 auto' }}>
      <h2 style={{ fontFamily:'var(--font-display)', fontSize:'1.5rem', fontWeight:700, color:'var(--text)', margin:'0 0 12px', display:'flex', alignItems:'center', gap:10 }}>
        <span style={{ color:'var(--orange)' }}>📚</span> منصّة المفردات + AI
      </h2>

      <AiLookup />

      {/* Segmented switch */}
      <div style={{ display:'flex', gap:4, background:'var(--glass-bg)', backdropFilter:'blur(10px)', WebkitBackdropFilter:'blur(10px)', border:'1px solid var(--glass-border)', borderRadius:14, padding:4, marginBottom:16, overflowX:'auto', scrollbarWidth:'none' }} role="tablist">
        {SEG.map((s) => (
          <button key={s.id} role="tab" aria-selected={view === s.id} onClick={() => setView(s.id)}
            style={{ flex:1, minWidth:'max-content', background: view===s.id ? 'var(--glass-bg-strong)' : 'transparent', color: view===s.id ? 'var(--orange)' : 'var(--muted)', fontWeight: view===s.id ? 600 : 500, border:'none', padding:'9px 14px', borderRadius:10, fontSize:'.85rem', cursor:'pointer', fontFamily:'inherit', boxShadow: view===s.id ? 'var(--elev-1), inset 0 1px 0 rgba(255,255,255,.5)' : 'none', transition:'.15s', whiteSpace:'nowrap' }}>
            {s.label}
          </button>
        ))}
      </div>

      {/* Bank view */}
      {view === 'bank' && (
        <>
          <div style={{ display:'flex', gap:10, alignItems:'center', marginBottom:14, flexWrap:'wrap' }}>
            <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="🔍 ابحث في كلماتك..." autoComplete="off"
              style={{ flex:1, minWidth:200, padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', backdropFilter:'blur(6px)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)' }} />
            <select value={levelFilter} onChange={(e) => setLevelFilter(e.target.value)}
              style={{ padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:12, background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'.92rem', color:'var(--text)', maxWidth:140 }}>
              <option value="">كل المستويات</option>
              {['A1','A2','B1','B2','C1'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          {filteredBank.length === 0 ? (
            <div style={{ background:'var(--surface)', border:'1px solid var(--border)', borderRadius:'var(--r-sm)', padding:'14px 18px', fontSize:'.9rem', color:'var(--text2)' }}>📚 بنك مفرداتك فارغ — استخدم خانة AI أعلاه لإضافة كلمات هولندية.</div>
          ) : filteredBank.map((w) => <WordCard key={w.id} word={w} onDelete={removeVocab} />)}
        </>
      )}

      {/* Due view */}
      {view === 'due' && (
        dueWords.length === 0
          ? <div style={{ background:'var(--green-l)', border:'1px solid var(--glass-border)', borderInlineStart:'3px solid var(--green)', borderRadius:'var(--r-sm)', padding:'14px 18px', fontSize:'.9rem', color:'var(--text2)' }}>✅ لا توجد كلمات مستحقّة للمراجعة الآن — أحسنت! عُد لاحقًا.</div>
          : <div>
              <div style={{ background:'var(--orange-l)', border:'1px solid var(--glass-border)', borderInlineStart:'3px solid var(--orange)', borderRadius:'var(--r-sm)', padding:'14px 18px', marginBottom:12, fontSize:'.9rem', color:'var(--text2)' }}>⏰ <strong style={{ color:'var(--text)' }}>{dueWords.length} كلمة</strong> مستحقّة للمراجعة الآن.</div>
              <button onClick={() => setView('review')} style={{ background:'var(--grad-primary)', color:'#fff', border:'none', borderRadius:14, padding:'10px 20px', fontWeight:600, cursor:'pointer', fontSize:'.9rem', boxShadow:'var(--elev-2)' }}>🎴 ابدأ المراجعة</button>
            </div>
      )}

      {/* Review view */}
      {view === 'review' && (
        <FlashCard
          queue={dueWords}
          onGrade={(id, q) => gradeFlash(id, q)}
          onDone={() => setView('bank')}
        />
      )}

      {/* Themas view */}
      {view === 'themas' && (
        <div>
          <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:12 }}>
            {B1_THEMAS.map((t, i) => (
              <button key={i} onClick={() => setSelectedThema(i)}
                style={{ background: i===selectedThema ? 'var(--grad-primary)' : 'var(--glass-bg)', color: i===selectedThema ? '#fff' : 'var(--text2)', border:'1px solid var(--glass-border)', borderRadius:10, padding:'7px 12px', fontSize:'.85rem', cursor:'pointer', fontFamily:'inherit', fontWeight: i===selectedThema ? 600 : 500 }}>
                {t.nl} <span style={{ opacity:.7 }}>({t.ar})</span>
              </button>
            ))}
          </div>
          {B1_THEMAS[selectedThema] && (
            <>
              <h3 style={{ fontSize:'1.05rem', fontWeight:600, color:'var(--text)', margin:'0 0 10px' }}>
                📌 {B1_THEMAS[selectedThema].nl} — {B1_THEMAS[selectedThema].ar} <span style={{ fontSize:'.78rem', color:'var(--muted)', fontWeight:400 }}>({B1_THEMAS[selectedThema].words.length} كلمة)</span>
              </h3>
              {B1_THEMAS[selectedThema].words.map((w, i) => {
                const fakeWord: VocabWord = { id: `thema_${selectedThema}_${i}`, dutch: w.nl, arabic: w.ar, example: w.ex ?? '', level: (w.level as VocabWord['level']) ?? 'B1', box: 0, due: 0, reps: 0 }
                return <WordCard key={i} word={fakeWord} showAdd onAdd={() => vocabAdd(w.nl, w.ar, w.ex ?? '', w.level ?? 'B1')} />
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
