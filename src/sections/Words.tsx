import { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import '@/components/obs/obs.css'
import { useAppStore } from '@/store/useAppStore'
import { useObs, useMotionLevel } from '@/hooks/useObs'
import { useNow } from '@/hooks/useNow'
import { evidenceOf, stageCounts, STAGE_AR, STAGE_ORDER, type Stage } from '@/features/observatory/evidence'
import { norm } from '@/features/observatory/evaluate'
import { peekIntent, takeIntent } from '@/features/observatory/intent'
import { stagger } from '@/features/observatory/motion'
import { findItem } from '@/data/observatory/items'
import type { ExpressionRecord } from '@/features/observatory/types'
import { StatusStrip } from '@/components/obs/StatusStrip'
import { WordToken } from '@/components/obs/WordToken'
import { RecallQuick } from '@/components/obs/words/RecallQuick'
import { WordDetail } from '@/components/obs/words/WordDetail'
import { WorkspaceHead, Button, StageBadge, EmptyState, Meta } from '@/components/obs/ui'
import { IMagnifyingGlass, IArrowRight, IArrowSquareOut, IX } from '@/components/obs/icons'

/* ── Words ──────────────────────────────────────────────────────────────────
   The word, its meaning in context, the learner's own example — and the
   evidence stage earned by actions. Retrieval ("تذكّر الآن") sits above the
   list: practising is one tap, browsing is secondary. */

type Filter = 'all' | Stage

export default function Words() {
  const [o] = useObs()
  const vocab = useAppStore((s) => s.vocab)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const now = useNow()
  const level = useMotionLevel()
  const { container, item } = stagger(level)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [savedOnly, setSavedOnly] = useState(false)
  const [openId, setOpenId] = useState<string | null>(() => {
    const i = peekIntent()
    if (i?.kind === 'word') return i.id
    if (i?.kind === 'use-words') return Object.values(o.expressions).find((e) => e.savedAt && !e.uses.some((u) => u.kind === 'independent'))?.id ?? null
    return null
  })
  const [recalling, setRecalling] = useState(() => peekIntent()?.kind === 'recall')
  useEffect(() => { takeIntent('word', 'use-words', 'recall') }, [])

  const rule = o.settings.activeRule
  const all = useMemo(() => Object.values(o.expressions).sort((a, b) => (b.savedAt || b.seenAt) - (a.savedAt || a.seenAt)), [o.expressions])
  const counts = stageCounts(o)
  const lastUse = (e: ExpressionRecord) => Math.max(0, ...e.uses.map((u) => u.at))
  const recallSet = all.filter((e) => evidenceOf(e, rule).stage !== 'active').sort((a, b) => lastUse(a) - lastUse(b)).slice(0, 5)
  const nq = norm(q)
  const shown = all.filter((e) => {
    if (savedOnly && !e.savedAt) return false
    if (filter !== 'all' && evidenceOf(e, rule).stage !== filter) return false
    if (!nq) return true
    return [e.nl, e.ar, e.example, ...e.uses.map((u) => u.text)].some((t) => norm(t).includes(nq) || t.includes(q.trim()))
  })
  const due = vocab.filter((w) => (w.due ?? 0) <= now).length
  const open = openId ? o.expressions[openId] : undefined

  if (recalling && recallSet.length) {
    return <div className="o-root"><div className="o-page"><RecallQuick items={recallSet} onDone={() => setRecalling(false)} /></div></div>
  }

  return (
    <div className="o-root">
      <motion.div className="o-page" variants={container} initial="hidden" animate="show">
        <StatusStrip />
        <motion.div variants={item}>
          <WorkspaceHead kicker="WOORDEN · UW EIGEN VOORRAAD" title="كلماتي" nl="Woorden die u echt gebruikt"
            lede="التعبير، ومعناه في سياقه، وجملتك أنت. الحالة تتغيّر فقط بما تفعله: التذكّر تدريب، والجملة من كتابتك استخدام مستقل." />
        </motion.div>

        {all.length === 0 ? (
          <motion.div variants={item} className="o-plane">
            <EmptyState word="woord" gloss="كلمة" title="لا تعابير بعد"
              action={<Button variant="primary" iconEnd={IArrowRight} flipEnd onClick={() => setActiveTab('today')}>ابدأ جلسة اليوم</Button>}>
              التعابير التي تفتحها في الجلسات تظهر هنا، مع الجملة التي جاءت فيها. {vocab.length ? `وقائمة كلماتك القديمة (${vocab.length}) ما زالت في «المفردات».` : ''}
            </EmptyState>
          </motion.div>
        ) : (
          <>
            <motion.section variants={item} className="o-night o-recall-cta" aria-labelledby="recall-title">
              <div>
                <Meta>HERHALEN · UIT HET GEHEUGEN</Meta>
                <h2 id="recall-title" className="o-h2">تذكّر الآن</h2>
                <p className="o-small">{recallSet.length ? `${recallSet.length} تعابير لم تصبح «نشِطة» بعد، الأقدم تدريبًا أولًا. ≈ ${Math.max(2, recallSet.length)} دقائق.` : 'كل تعابيرك نشِطة حسب قاعدتك.'}</p>
              </div>
              <Button variant="primary" iconEnd={IArrowRight} flipEnd disabled={!recallSet.length} onClick={() => setRecalling(true)}>ابدأ التذكّر</Button>
            </motion.section>

            <motion.div variants={item} className="o-words-tools">
              <label className="o-search">
                <IMagnifyingGlass size={20} />
                <span className="o-sr">ابحث في تعابيرك</span>
                <input className="o-input" type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالهولندية أو العربية" />
              </label>
              <div className="o-seg" role="radiogroup" aria-label="تصفية حسب الحالة">
                <label><input type="radio" name="stage" checked={filter === 'all'} onChange={() => setFilter('all')} /><span>الكل · {all.length}</span></label>
                {STAGE_ORDER.map((s) => (
                  <label key={s}><input type="radio" name="stage" checked={filter === s} onChange={() => setFilter(s)} /><span>{STAGE_AR[s]} · {counts[s]}</span></label>
                ))}
              </div>
              <label className="o-check o-small">
                <input type="checkbox" checked={savedOnly} onChange={(e) => setSavedOnly(e.target.checked)} />
                المحفوظة فقط
              </label>
            </motion.div>

            {shown.length === 0 ? (
              <div className="o-plane" role="status">
                <EmptyState word="niets" gloss="لا شيء" title={q ? `لا نتائج لـ «${q}»` : 'لا تعابير في هذه الحالة'}
                  action={<Button variant="secondary" icon={IX} onClick={() => { setQ(''); setFilter('all'); setSavedOnly(false) }}>امسح البحث والتصفية</Button>}>
                  جرّب كلمة أقصر، أو ابحث بالمعنى العربي.
                </EmptyState>
              </div>
            ) : (
              <ul className="o-list o-words" aria-label="التعابير">
                {shown.map((e) => {
                  const ev = evidenceOf(e, rule)
                  const own = [...e.uses].reverse().find((u) => u.kind === 'independent')
                  const it = e.itemId ? findItem(e.itemId) : undefined
                  return (
                    <li key={e.id} className="o-card o-word-row">
                      <WordToken nl={e.nl} size="sm" onOpen={() => setOpenId(e.id)} layoutId={`tok-${e.id}`} label={`${e.nl} — افتح الدليل`} tone={e.savedAt ? 'mint' : 'paper'} />
                      <div className="o-word-row__body">
                        <div className="o-row" style={{ justifyContent: 'space-between' }}>
                          <strong>{e.ar}</strong>
                          <StageBadge stage={ev.stage} />
                        </div>
                        <span className="o-nl o-small" lang="nl" style={{ color: 'var(--o-ink-2)' }}>{e.example}</span>
                        <span className="o-small">{own ? <>جملتك: <span className="o-nl" lang="nl">{own.text}</span></> : 'لا جملة من كتابتك بعد.'}</span>
                        <span className="o-small">
                          {ev.independent} مستقل · {ev.practised} تدريب{ev.selfReports ? ` · ${ev.selfReports} تقرير ذاتي` : ''}{it ? ` · من «${it.topicAr}»` : ''}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </>
        )}

        <motion.div variants={item} className="o-plane o-plane--quiet" style={{ marginTop: 24, border: '1px solid var(--o-line)' }}>
          <strong>قائمة كلماتك الأخرى (بطاقات المراجعة)</strong>
          <p className="o-small">{vocab.length} كلمة · {due} مستحقة الآن. هذه تُراجع بنظام التكرار المتباعد في قسم «المفردات».</p>
          <Button size="sm" variant="secondary" icon={IArrowSquareOut} onClick={() => setActiveTab('vocab')}>افتح المفردات + AI</Button>
        </motion.div>
      </motion.div>
      {open && <WordDetail rec={open} onClose={() => setOpenId(null)} />}
    </div>
  )
}
