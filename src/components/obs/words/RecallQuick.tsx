import { useState, type FormEvent } from 'react'
import type { ExpressionRecord } from '@/features/observatory/types'
import { checkTyped } from '@/features/observatory/evaluate'
import { addUse } from '@/features/observatory/evidence'
import { noteDifficulty } from '@/features/observatory/insights'
import { expressionSeed } from '@/data/observatory/items'
import { todayKey } from '@/lib/utils'
import { useObs } from '@/hooks/useObs'
import { Button, Feedback, Meta } from '../ui'
import { IArrowRight } from '../icons'

/* Quick retrieval from «كلماتي»: up to five expressions, least recently
   practised first. Meaning → type the Dutch from memory → honest result.
   A correct recall is logged as "practised" (not "used independently"). */

export function RecallQuick({ items, onDone }: { items: ExpressionRecord[]; onDone: () => void }) {
  const [, update] = useObs()
  const [k, setK] = useState(0)
  const [typed, setTyped] = useState('')
  const [tries, setTries] = useState(0)
  const [result, setResult] = useState<'' | 'correct' | 'close' | 'wrong'>('')
  const [score, setScore] = useState(0)
  const rec = items[k]

  if (!rec) {
    return (
      <div className="o-step-plane">
        <Meta>HERHALEN · KLAAR</Meta>
        <h2 className="o-h2">انتهت جولة التذكّر</h2>
        <p className="o-lede">تذكّرت {score} من {items.length} من الذاكرة. سُجّلت كتدريب لكل تعبير.</p>
        <div className="o-actions"><Button variant="primary" onClick={onDone}>العودة إلى الكلمات</Button></div>
      </div>
    )
  }
  const found = expressionSeed(rec.id)
  const answer = found?.seed.answer ?? rec.nl
  const cue = found?.seed.clozeNl ?? ''
  const done = result === 'correct' || result === 'close' || tries >= 2

  const check = (e: FormEvent) => {
    e.preventDefault()
    if (done) { setK(k + 1); setTyped(''); setTries(0); setResult(''); return }
    const r = checkTyped(typed, answer)
    if (!r) return
    setResult(r)
    const t = tries + 1
    setTries(t)
    if (r === 'correct' || r === 'close') {
      setScore(score + 1)
      update((o) => addUse(o, rec.id, 'practised', found?.item.context ?? 'overig', typed, 'words', Date.now(), todayKey()))
    } else if (t >= 2) {
      update((o) => noteDifficulty(o, 'recall', answer, Date.now()))
    }
  }

  return (
    <form className="o-step-plane" onSubmit={check} noValidate style={{ display: 'grid', gap: 12 }}>
      <Meta>{`HERHALEN · ${k + 1}/${items.length}`}</Meta>
      <h2 className="o-h2">ما الهولندية لـ «{rec.ar}»؟</h2>
      {cue && <p className="o-nl o-example" lang="nl">{cue}</p>}
      <label className="o-field">
        <span className="o-label">{cue ? 'الكلمة الناقصة' : 'التعبير'}</span>
        <input className="o-input" lang="nl" dir="ltr" autoComplete="off" autoCapitalize="off" spellCheck={false} value={typed} readOnly={done}
          onChange={(e) => setTyped(e.target.value)} />
      </label>
      <div aria-live="polite">
        {result === 'correct' && <Feedback tone="right" title="تذكّرتها." />}
        {result === 'close' && <Feedback tone="close" title="قريبة — محسوبة."><p>الإملاء: <b className="o-nl" lang="nl">{answer}</b></p></Feedback>}
        {result === 'wrong' && tries < 2 && <Feedback tone="wrong" title="ليست هي بعد — حاول مرة أخرى." />}
        {result === 'wrong' && tries >= 2 && <Feedback tone="info" title="الإجابة:"><p><b className="o-nl" lang="nl">{answer}</b> ({rec.nl})</p></Feedback>}
      </div>
      <div className="o-actions">
        <Button type="submit" variant="primary" iconEnd={done ? IArrowRight : undefined} flipEnd disabled={!done && !typed.trim()}>
          {done ? (k + 1 < items.length ? 'التالي' : 'النتيجة') : 'تحقّق'}
        </Button>
        <Button variant="ghost" onClick={onDone}>إنهاء</Button>
      </div>
    </form>
  )
}
