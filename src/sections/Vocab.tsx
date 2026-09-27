import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { AiLookup } from '@/components/AiLookup'
import { WordCard } from '@/components/WordCard'
import { FlashCard } from '@/components/FlashCard'
import { B1_THEMAS } from '@/data/themas'
import { useFuzzySearch, getMatchIndices } from '@/hooks/useFuzzySearch'
import { useNow } from '@/hooks/useNow'
import { dueWords as queueOf } from '@/features/vocab/queue'
import { peekNavIntent, clearNavIntent } from '@/lib/navIntent'
import type { VocabWord } from '@/store/types'
import type { IFuseOptions } from 'fuse.js'
import { Callout } from '@/components/ui/Callout'
import { Button } from '@/components/ui/Button'
import { Segmented } from '@/components/ui/Segmented'
import { VocabOverview } from '@/components/vocab/VocabOverview'

type View = 'bank' | 'due' | 'themas'

const FUSE_OPTIONS: IFuseOptions<VocabWord> = {
  keys: [
    { name: 'dutch',   weight: 0.5 },
    { name: 'arabic',  weight: 0.35 },
    { name: 'example', weight: 0.15 },
  ],
  threshold: 0.4,          // 0 = exact, 1 = match anything
  includeMatches: true,     // needed for highlight indices
  includeScore: true,
  minMatchCharLength: 2,
  ignoreLocation: true,     // don't penalise matches far from string start
}

export default function Vocab() {
  const { vocab, removeVocab, gradeFlash, vocabAdd } = useAppStore()
  // "راجع الآن" on the home screen lands directly in the session.
  const [intent] = useState(() => peekNavIntent('vocab'))
  const [view, setView]               = useState<View>(intent?.view === 'themas' ? 'themas' : 'bank')
  const [reviewing, setReviewing]     = useState(intent?.view === 'review')
  const [search, setSearch]           = useState('')
  const [levelFilter, setLevelFilter] = useState('')
  const [selectedThema, setSelectedThema] = useState(0)
  useEffect(() => { clearNavIntent('vocab') }, [])

  const now = useNow()
  // The exact queue the session opens — see features/vocab/queue.
  const dueWords = queueOf(vocab, now)
  const savedWords = new Set(vocab.map((word) => word.dutch.trim().toLowerCase()))

  // Level-filtered list is the base for fuzzy search
  const levelFiltered = levelFilter
    ? vocab.filter(w => w.level === levelFilter)
    : vocab

  const fuseResults = useFuzzySearch(levelFiltered, FUSE_OPTIONS, search)

  // When no query: show all level-filtered words sorted by box/due
  // When query:   show Fuse-ranked results (already scored)
  const filteredBank = fuseResults
    ? fuseResults.map(r => r.item)
    : [...levelFiltered].sort((a, b) => (a.box - b.box) || (a.due - b.due))

  // Map itemId → FuseResult for highlight lookup (O(1) per card)
  const resultMap = new Map(fuseResults?.map(r => [r.item.id, r]) ?? [])

  /* جلسة المراجعة وضع مركّز: لا مفاتيح عرض ولا بحث حولها، فلا يخرج المتعلّم
     منها بنقرة خاطئة في منتصفها. «إنهاء الجلسة» داخل البطاقة يعيده. */
  if (reviewing) {
    return (
      <div className="page page--narrow">
        <div className="vocab-session-heading">
          <p className="eyebrow">مراجعة مركّزة</p>
          <h1>جلسة المراجعة</h1>
          <p>أظهر الإجابة بعد أن تستحضر المعنى، ثم اختر مستوى تذكّرك.</p>
        </div>
        <FlashCard
          queue={dueWords}
          onGrade={(id, q) => gradeFlash(id, q)}
          onDone={() => setReviewing(false)}
        />
      </div>
    )
  }

  return (
    <div className="page">
      <VocabOverview />
      <p style={{ color: 'var(--text2)', fontSize: 'var(--text-base)', margin: '0 0 var(--sp-4)' }}>تعلّم كلمة في سياقها، وراجعها عندما يحين موعدها.</p>

      {dueWords.length > 0 ? (
        <Callout icon="⏰" style={{ marginBottom: 'var(--sp-4)' }}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><strong style={{ display: 'block', color: 'var(--text)', fontSize: 'var(--text-lg)' }}>{dueWords.length} كلمة بانتظار المراجعة</strong><span>تذكّر المعنى أوّلًا، ثم قيّم تذكّرك ليُحدَّد الموعد التالي.</span></div>
            <Button variant="primary" size="lg" onClick={() => setReviewing(true)}>ابدأ المراجعة</Button>
          </div>
        </Callout>
      ) : vocab.length > 0 && (
        <Callout tone="success" style={{ marginBottom: 'var(--sp-4)' }}>لا كلمات مستحقّة الآن. ستظهر هنا عندما يحين موعد مراجعتها.</Callout>
      )}

      <details open={vocab.length === 0} style={{ marginBottom: 'var(--sp-4)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)', background: 'var(--glass-bg)', padding: 'var(--sp-3)' }}>
        <summary style={{ minHeight: 44, cursor: 'pointer', color: 'var(--text)', fontWeight: 'var(--fw-heading)', lineHeight: 'var(--lh-arabic)' }}>إضافة كلمة أو البحث عن معناها</summary>
        <AiLookup />
      </details>

      <Segmented
        label="عرض المفردات"
        value={view}
        onChange={setView}
        options={[
          { id: 'bank', label: `كلماتي (${vocab.length})` },
          { id: 'due', label: `للمراجعة (${dueWords.length})` },
          { id: 'themas', label: 'مواضيع الحياة اليومية' },
        ]}
      />

      {/* Bank view */}
      {view === 'bank' && (
        <>
          <div style={{ display:'flex', gap:'var(--sp-3)', alignItems:'center', marginBottom:'var(--sp-3)', flexWrap:'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <input
                type="search"
                dir="auto"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالهولندية أو العربية"
                autoComplete="off"
                aria-label="بحث مرن في المفردات"
                style={{ minHeight:44, width:'100%', padding:'10px 12px', paddingInlineEnd:52, border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'var(--text-base)', color:'var(--text)', boxSizing: 'border-box' }}
              />
              {search && (
                <button
                  onClick={() => setSearch('')}
                  aria-label="مسح البحث"
                  style={{ minHeight:44, minWidth:44, position:'absolute', insetInlineEnd:0, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--muted)', fontSize:'var(--text-base)', lineHeight:'var(--lh-none)' }}
                >✕</button>
              )}
            </div>
            <select
              value={levelFilter}
              onChange={(e) => setLevelFilter(e.target.value)}
              aria-label="تصفية حسب المستوى"
              style={{ minHeight:44, padding:'10px 12px', border:'1px solid var(--border2)', borderRadius:'var(--r-sm)', background:'var(--glass-bg-strong)', fontFamily:'inherit', fontSize:'var(--text-sm)', color:'var(--text)', maxWidth:160 }}
            >
              <option value="">كل المستويات</option>
              {['A1','A2','B1','B2','C1'].map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>

          {/* Result count when searching */}
          {search.trim() && (
            <div style={{ fontSize:'var(--text-xs)', color:'var(--text2)', marginBottom:'var(--sp-2)' }} aria-live="polite" aria-atomic="true">
              {filteredBank.length > 0
                ? `${filteredBank.length} نتيجة`
                : 'لا توجد نتائج'}
            </div>
          )}

          {filteredBank.length === 0 ? (
            <div className="card" style={{ fontSize:'var(--text-sm)', color:'var(--text2)' }}>
              <p style={{ margin: '0 0 var(--sp-3)' }}>
                {vocab.length === 0
                  ? 'ابدأ بكلمات تحتاجها في حياتك اليومية. اختر من المواضيع الجاهزة أو ابحث عن كلمة وأضفها.'
                  : 'لا توجد كلمات تطابق بحثك.'}
              </p>
              <Button variant={vocab.length === 0 ? 'primary' : 'secondary'} onClick={() => {
                if (vocab.length === 0) setView('themas')
                else { setSearch(''); setLevelFilter('') }
              }}>{vocab.length === 0 ? 'اكتشف كلمات حسب الموضوع' : 'مسح البحث والتصفية'}</Button>
            </div>
          ) : (
          <div className="stagger">
          {filteredBank.map((w) => {
            const r = resultMap.get(w.id)
            return (
              <WordCard
                key={w.id}
                word={w}
                onDelete={removeVocab}
                hlNl={r ? getMatchIndices(r, 'dutch')   : undefined}
                hlAr={r ? getMatchIndices(r, 'arabic')  : undefined}
                hlEx={r ? getMatchIndices(r, 'example') : undefined}
              />
            )
          })}
          </div>
          )}
        </>
      )}

      {/* Due view */}
      {view === 'due' && (
        dueWords.length === 0
          ? <Callout tone="success">لا توجد كلمات مستحقّة للمراجعة الآن. يمكنك إضافة كلمات من المواضيع أو العودة عند موعد المراجعة التالي.</Callout>
          : <div>
              <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--sp-3)', marginBottom: 'var(--sp-3)' }}>
                <p style={{ color: 'var(--text2)', margin: 0 }}>مرتّبة حسب موعد المراجعة، الأقدم أوّلًا.</p>
                <Button variant="primary" onClick={() => setReviewing(true)}>ابدأ جلسة المراجعة</Button>
              </div>
              {dueWords.map((word) => <WordCard key={word.id} word={word} onDelete={removeVocab} />)}
            </div>
      )}

      {/* Themas view */}
      {view === 'themas' && (
        <div>
          <div style={{ display:'flex', gap:'var(--sp-2)', flexWrap:'wrap', marginBottom:'var(--sp-3)' }}>
            {B1_THEMAS.map((t, i) => (
              <button key={i} onClick={() => setSelectedThema(i)} aria-pressed={i === selectedThema}
                style={{ minHeight:44, background: i===selectedThema ? 'var(--orange-l)' : 'var(--btn-bg)', color: i===selectedThema ? 'var(--orange-text)' : 'var(--text2)', border:`1px solid ${i===selectedThema ? 'var(--orange)' : 'var(--btn-border)'}`, borderRadius:'var(--r-sm)', padding:'7px 12px', fontSize:'var(--text-sm)', cursor:'pointer', fontFamily:'inherit', fontWeight: i===selectedThema ? 'var(--fw-heading)' : 'var(--fw-body)' }}>
                <span dir="ltr" lang="nl" style={{ display: 'block', fontFamily: 'var(--font-latin)' }}>{t.nl}</span><span dir="rtl" lang="ar" style={{ display: 'block' }}>{t.ar}</span>
              </button>
            ))}
          </div>
          {B1_THEMAS[selectedThema] && (
            <>
              <h3 style={{ fontSize:'var(--text-md)', fontWeight:'var(--fw-heading)', color:'var(--text)', margin:'0 0 10px' }}>
                <span dir="ltr" lang="nl" style={{ display: 'block', fontFamily: 'var(--font-latin)' }}>{B1_THEMAS[selectedThema].nl}</span>
                <span dir="rtl" lang="ar" style={{ display: 'block' }}>{B1_THEMAS[selectedThema].ar} <span style={{ fontSize:'var(--text-sm)', color:'var(--text2)', fontWeight:'var(--fw-body)' }}>({B1_THEMAS[selectedThema].words.length} كلمة)</span></span>
              </h3>
              {B1_THEMAS[selectedThema].words.map((w, i) => {
                const fakeWord: VocabWord = { id: `thema_${selectedThema}_${i}`, dutch: w.nl, arabic: w.ar, example: w.ex ?? '', level: (w.level as VocabWord['level']) ?? 'B1', box: 0, due: 0, reps: 0 }
                return <WordCard key={i} word={fakeWord} meaningVisual={{ sentence: w.ex ?? '', meaning: w.ar }} showAdd saved={savedWords.has(w.nl.trim().toLowerCase())} onAdd={() => vocabAdd(w.nl, w.ar, w.ex ?? '', w.level ?? 'B1')} />
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
