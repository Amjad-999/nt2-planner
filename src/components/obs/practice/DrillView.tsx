import { useState } from 'react'
import type { BuildRule } from '@/features/observatory/types'
import { LESSON_ITEMS } from '@/data/observatory/items'
import { checkBuild, buildSentence } from '@/features/observatory/evaluate'
import { uid, CAPS } from '@/features/observatory/state'
import { DRILL_TITLE } from '@/features/observatory/format'
import { useObs } from '@/hooks/useObs'
import { TileBuilder } from '../TileBuilder'
import { Button, Feedback, Meta } from '../ui'
import { IArrowRight, IArrowLeft } from '../icons'

/* A focused drill for one recurring difficulty: every sentence-building
   exercise that practises the same rule, one after another. Each finished
   sentence is saved as an attempt (evidence of completed work). */

export function DrillView({ rule, onBack }: { rule: BuildRule; onBack: () => void }) {
  const [, update] = useObs()
  const list = LESSON_ITEMS.flatMap((it) => it.builds.filter((b) => b.rule === rule))
  const [k, setK] = useState(0)
  const [order, setOrder] = useState<number[]>([])
  const [tries, setTries] = useState(0)
  const [checked, setChecked] = useState<string | null>(null)
  const [right, setRight] = useState(0)
  const ex = list[k]
  if (!ex) {
    return (
      <div className="o-step-plane">
        <Meta>{`OEFENEN · ${rule.toUpperCase()} · KLAAR`}</Meta>
        <h2 className="o-h2">انتهى التمرين المركّز</h2>
        <p className="o-lede">{right} من {list.length} جمل صحيحة من المحاولة الأولى أو الثانية. حُفظت كل جملة أنجزتها في سجلّك.</p>
        <div className="o-actions"><Button variant="primary" icon={IArrowLeft} flipIcon onClick={onBack}>كل التمارين</Button></div>
      </div>
    )
  }
  const key = order.join(',')
  const result = checked === key ? checkBuild(order, ex) : null
  const solved = !!result?.correct
  const shown = tries >= 2 && !solved
  const correct = buildSentence(ex.tokens.map((_, i) => i), ex)

  const check = () => {
    const r = checkBuild(order, ex)
    setChecked(key)
    setTries(tries + 1)
    if (r.correct) {
      setRight(right + 1)
      update((o) => {
        const now = Date.now()
        return { ...o, attempts: [...o.attempts, { id: uid('a', now), at: now, kind: 'sentence' as const, refId: ex.id, text: buildSentence(order, ex), recordingId: '', durationSec: 0 }].slice(-CAPS.attempts), updatedAt: now }
      })
    }
  }
  const next = () => { setK(k + 1); setOrder([]); setTries(0); setChecked(null) }

  return (
    <div className="o-step-plane">
      <div className="o-row" style={{ justifyContent: 'space-between' }}>
        <Meta>{`OEFENEN · ${DRILL_TITLE[rule]} · ${k + 1}/${list.length}`}</Meta>
        <Button size="sm" variant="ghost" icon={IArrowLeft} flipIcon onClick={onBack}>خروج</Button>
      </div>
      <h2 className="o-h2" style={{ margin: '6px 0 12px' }}>{ex.promptAr}</h2>
      <TileBuilder ex={ex} order={order} onChange={(o) => { setOrder(o); if (checked) setChecked(null) }} result={result} locked={solved || shown} solvedRight={solved} />
      <div aria-live="polite" style={{ marginTop: 12 }}>
        {solved && <Feedback tone="right" title="صحيحة."><p className="o-small">{ex.ruleAr}</p></Feedback>}
        {result && !solved && !shown && <Feedback tone="wrong" title="ليست بعد."><p className="o-small">{ex.ruleAr}</p></Feedback>}
        {shown && <Feedback tone="info" title="الجملة الصحيحة:"><p className="o-nl" lang="nl">{correct}</p></Feedback>}
      </div>
      <div className="o-actions">
        {solved || shown
          ? <Button variant="primary" iconEnd={IArrowRight} flipEnd onClick={next}>التالي</Button>
          : <Button variant="primary" onClick={check} disabled={order.length !== ex.tokens.length || checked === key}>تحقّق</Button>}
      </div>
    </div>
  )
}
