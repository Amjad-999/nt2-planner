import { useState } from 'react'
import { motion } from 'framer-motion'
import type { ContextKey, ExpressionRecord, ExpressionUse } from '@/features/observatory/types'
import { evidenceOf, addUse, removeUse, saveExpression, STAGE_AR } from '@/features/observatory/evidence'
import { classifyOwnSentence } from '@/features/observatory/evaluate'
import { CONTEXTS } from '@/features/observatory/state'
import { CONTEXT_AR, CONTEXT_NL, shortDate } from '@/features/observatory/format'
import { layoutTransition } from '@/features/observatory/motion'
import { expressionSeed, findItem } from '@/data/observatory/items'
import { todayKey } from '@/lib/utils'
import { useObs, useMotionLevel } from '@/hooks/useObs'
import { Sheet } from '../Sheet'
import { Constellation } from '../Constellation'
import { SpeakButton } from '../lesson/shared'
import { Button, Feedback, StageBadge } from '../ui'
import { IBookmarkSimple, IFlag, ITrash, IArrowCounterClockwise } from '../icons'

/* One expression, in full: meaning in context, the situations it connects
   to, every piece of evidence (removable if it was logged by mistake), a
   place to use it again, and an explicit self-report for use outside the app. */

const KIND_AR: Record<ExpressionUse['kind'], string> = { practised: 'تدريب', independent: 'استخدام مستقل', 'self-report': 'تقرير ذاتي' }

export function WordDetail({ rec, onClose }: { rec: ExpressionRecord; onClose: () => void }) {
  const [o, update] = useObs()
  const level = useMotionLevel()
  const found = expressionSeed(rec.id)
  const rule = o.settings.activeRule
  const ev = evidenceOf(rec, rule)
  const [text, setText] = useState('')
  const [ctx, setCtx] = useState<ContextKey>(found?.seed.contexts[0] ?? 'overig')
  const [res, setRes] = useState<'' | 'independent' | 'copied' | 'missing' | 'too-short' | 'reported'>('')
  const [removed, setRemoved] = useState<ExpressionUse | null>(null)
  const item = rec.itemId ? findItem(rec.itemId) : undefined

  const possible = Array.from(new Set([...(found?.seed.contexts ?? []), ...rec.uses.map((u) => u.context)])).slice(0, 4)
  const usedIn = new Set(ev.contexts)

  const check = () => {
    if (!found) return
    const shown = [rec.example, found.seed.clozeNl.replace('___', found.seed.answer), ...(item?.paragraphs ?? []), ...rec.uses.map((u) => u.text)]
    const r = classifyOwnSentence(text, found.seed, shown)
    setRes(r)
    if (r === 'independent') { update((x) => addUse(x, rec.id, 'independent', ctx, text, 'words', Date.now(), todayKey())); setText('') }
  }
  const report = () => {
    update((x) => addUse(x, rec.id, 'self-report', ctx, text.trim() || '(استخدام خارج التطبيق)', 'words', Date.now(), todayKey()))
    setRes('reported'); setText('')
  }
  const remove = (u: ExpressionUse) => { update((x) => removeUse(x, rec.id, u.id)); setRemoved(u) }
  const undo = () => {
    if (!removed) return
    const u = removed
    update((x) => ({ ...x, expressions: { ...x.expressions, [rec.id]: { ...x.expressions[rec.id], uses: [...x.expressions[rec.id].uses, u].sort((a, b) => a.at - b.at) } } }))
    setRemoved(null)
  }

  return (
    <Sheet title={rec.nl} onClose={onClose} placement="center">
      <motion.div layoutId={level === 'reduced' ? undefined : `tok-${rec.id}`} transition={layoutTransition(level, 'panel')} className="o-word__detail">
        <div className="o-row" style={{ justifyContent: 'space-between' }}>
          <p className="o-nl-display" lang="nl">{rec.nl}</p>
          <StageBadge stage={ev.stage} />
        </div>
        <p><b>{rec.ar}</b>{found && <> · <span className="o-nl" lang="nl">{found.seed.simpleNl}</span></>}</p>
        <p className="o-nl o-example" lang="nl">{rec.example}</p>
        <div className="o-row">
          <SpeakButton text={rec.example || rec.nl} />
          {found && (
            <Button size="sm" variant={rec.savedAt ? 'secondary' : 'ghost'} icon={IBookmarkSimple} aria-pressed={!!rec.savedAt}
              onClick={() => update((x) => saveExpression(x, found.seed, found.item, Date.now(), !rec.savedAt))}>
              {rec.savedAt ? 'محفوظة (اضغط للإلغاء)' : 'احفظ'}
            </Button>
          )}
        </div>
      </motion.div>

      <h3 className="o-h3" style={{ margin: '16px 0 6px' }}>أين تُستخدم</h3>
      <p className="o-small">الأخضر: سياق استخدمتها فيه فعلًا.</p>
      <Constellation variant="paper" center={{ nl: rec.nl }} compact animate={level !== 'reduced'}
        nodes={possible.slice(0, 3).map((c) => ({ id: c, nl: CONTEXT_NL[c], gloss: usedIn.has(c) ? `${CONTEXT_AR[c]} ✓` : CONTEXT_AR[c], tone: usedIn.has(c) ? 'mint' as const : undefined }))}
        contexts={[]} summary={`سياقات «${rec.nl}»: ${possible.map((c) => `${CONTEXT_AR[c]}${usedIn.has(c) ? ' (استخدمته هنا)' : ''}`).join('، ')}.`} />

      <h3 className="o-h3" style={{ margin: '16px 0 6px' }}>الدليل</h3>
      <p className="o-small">
        قاعدة «{STAGE_AR.active}»: {rule.uses} استخدامات مستقلة، في {rule.contexts} سياقات، على {rule.days} أيام مختلفة.
        {ev.stage === 'active' ? ' تحققت.' : ` الباقي: ${[ev.missing.uses && `${ev.missing.uses} استخدام`, ev.missing.contexts && `${ev.missing.contexts} سياق`, ev.missing.days && `${ev.missing.days} يوم`].filter(Boolean).join('، ')}.`}
      </p>
      {rec.uses.length === 0 ? <p className="o-small">لا دليل بعد: فتح الكلمة أو حفظها لا يُحسب تعلّمًا.</p> : (
        <ul className="o-list" style={{ marginTop: 8 }}>
          {[...rec.uses].reverse().map((u) => (
            <li key={u.id} className="o-card" style={{ padding: 12 }}>
              <span className="o-row" style={{ justifyContent: 'space-between' }}>
                <span className="o-small">{shortDate(u.at)} · {KIND_AR[u.kind]} · {CONTEXT_AR[u.context]}</span>
                <Button size="sm" variant="ghost" icon={ITrash} onClick={() => remove(u)} aria-label={`احذف هذا الدليل (${KIND_AR[u.kind]})`}>احذف</Button>
              </span>
              {u.text && <span className="o-nl" lang="nl">{u.text}</span>}
            </li>
          ))}
        </ul>
      )}
      {removed && (
        <div className="o-notice o-notice--info" role="status" style={{ marginTop: 8 }}>
          <span className="o-grow">حُذف دليل واحد.</span>
          <Button size="sm" variant="secondary" icon={IArrowCounterClockwise} onClick={undo}>تراجع</Button>
        </div>
      )}

      {found && (
        <div className="o-part" style={{ marginTop: 16 }}>
          <h3 className="o-h3">استخدمها الآن</h3>
          <label className="o-field">
            <span className="o-label">جملة جديدة من حياتك (أو صف أين استخدمتها)</span>
            <textarea className="o-textarea" lang="nl" dir="ltr" rows={2} value={text} onChange={(e) => { setText(e.target.value); setRes('') }} />
          </label>
          <fieldset className="o-ctx-pick">
            <legend className="o-small" style={{ marginBottom: 6 }}>السياق</legend>
            {CONTEXTS.map((c) => <label key={c}><input type="radio" name={`d-ctx-${rec.id}`} checked={ctx === c} onChange={() => setCtx(c)} /><span>{CONTEXT_AR[c]}</span></label>)}
          </fieldset>
          <div aria-live="polite">
            {res === 'independent' && <Feedback tone="right" title="أُضيف استخدام مستقل." />}
            {res === 'copied' && <Feedback tone="close" title="قريبة جدًا من جملة سابقة أو معروضة — لم تُحسب." />}
            {res === 'missing' && <Feedback tone="close" title="التعبير غير موجود في الجملة." />}
            {res === 'too-short' && <Feedback tone="close" title="اكتب جملة كاملة (4 كلمات على الأقل)." />}
            {res === 'reported' && <Feedback tone="info" title="سُجّل تقرير ذاتي."><p className="o-small">يظهر في الدليل منفصلًا{rule.countSelfReports ? ' ويُحسب في القاعدة حسب إعداداتك.' : '، ولا يُحسب في قاعدة «نشِط» إلا إذا فعّلت ذلك في الإعدادات.'}</p></Feedback>}
          </div>
          <div className="o-row">
            <Button variant="primary" onClick={check} disabled={!text.trim()}>تحقّق وأضِف</Button>
            <Button variant="secondary" icon={IFlag} onClick={report}>استخدمتها خارج التطبيق</Button>
          </div>
        </div>
      )}
    </Sheet>
  )
}
