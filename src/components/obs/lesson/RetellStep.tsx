import { useState } from 'react'
import { recordRetell } from '@/features/observatory/session'
import { retellCoverage, classifyOwnSentence, wordCount } from '@/features/observatory/evaluate'
import { addUse, ensureExpression } from '@/features/observatory/evidence'
import { uid, CAPS } from '@/features/observatory/state'
import { todayKey } from '@/lib/utils'
import { StepFrame, type StepProps } from './shared'
import { useDraft } from './useDraft'
import { VoiceRecorder } from '../VoiceRecorder'
import { Button, Chip, Nl } from '../ui'
import { IArrowRight, IMicrophone, IKeyboard, ICheck } from '../icons'

/* Step 5 — retell the main idea for about 30–60 seconds, spoken or typed.
   Spoken: a real recording the learner can replay, plus an explicit
   SELF-assessment of the key points (nothing listens to the audio).
   Typed: a keyword check that says which points appear — labelled as a
   keyword check, not a language grade. */

export function RetellStep({ item, run, readOnly, onComplete, update }: StepProps) {
  const a = run.answers.retell
  const canRecord = typeof window !== 'undefined' && typeof MediaRecorder !== 'undefined'
  const [mode, setMode] = useState<'speak' | 'type'>(a.recordingId || !run.drafts.retell ? (canRecord ? 'speak' : 'type') : 'type')
  const [typed, setTyped] = useDraft(run, 'retell', update)
  const [checked, setChecked] = useState(false)
  const hits = retellCoverage(typed, item.retell.points)
  const words = wordCount(typed)
  const ready = !!a.recordingId || words >= 8

  const toggleSelf = (i: number) => {
    const set = new Set(a.selfCheck)
    if (set.has(i)) set.delete(i); else set.add(i)
    update((o) => recordRetell(o, { selfCheck: [...set].sort() }, Date.now()))
  }

  const finish = (skip = false) => {
    const now = Date.now()
    update((o) => {
      let x = recordRetell(o, { typed: skip ? '' : typed, skipped: skip && !a.recordingId }, now)
      if (!skip && (typed.trim() || a.recordingId)) {
        x = { ...x, attempts: [...x.attempts, { id: uid('a', now), at: now, kind: 'retell' as const, refId: item.id, text: typed.trim(), recordingId: a.recordingId, durationSec: a.durationSec }].slice(-CAPS.attempts) }
      }
      // Independent use: a sentence of the retelling that contains a session
      // expression and is not a copy of anything shown in the lesson.
      if (!skip && typed.trim()) {
        const shown = [...item.paragraphs, ...item.expressions.map((e) => e.example)]
        const sentences = typed.split(/(?<=[.!?])\s+|\n+/).filter(Boolean)
        for (const seed of item.expressions.filter((e) => run.wordIds.includes(e.id))) {
          const s = sentences.find((t) => classifyOwnSentence(t, seed, shown) === 'independent')
          if (s) x = addUse(ensureExpression(x, seed, item, now), seed.id, 'independent', item.context, s, 'retell', now, todayKey())
        }
      }
      return x
    })
    onComplete()
  }

  return (
    <StepFrame kicker="STAP 05 · NAVERTELLEN" title="أعد الفكرة الرئيسية بكلماتك"
      lede={<>تكلّم نحو 30–60 ثانية، أو اكتب بضع جمل. <Nl>{item.retell.promptNl}</Nl></>}>
      {readOnly ? (
        <p className="o-small">{a.skipped ? 'تخطّيت هذه الخطوة.' : `${a.recordingId ? `تسجيل (${Math.round(a.durationSec)} ث)` : ''}${a.recordingId && a.typed ? ' + ' : ''}${a.typed ? 'نص مكتوب' : ''}`}</p>
      ) : (
        <div className="o-seg" role="radiogroup" aria-label="طريقة الإجابة" style={{ marginBottom: 12 }}>
          <label><input type="radio" name="retell-mode" checked={mode === 'speak'} onChange={() => setMode('speak')} /><span><IMicrophone size={18} />&nbsp;تحدّث</span></label>
          <label><input type="radio" name="retell-mode" checked={mode === 'type'} onChange={() => setMode('type')} /><span><IKeyboard size={18} />&nbsp;اكتب</span></label>
        </div>
      )}

      <p className="o-small">{item.retell.promptAr}</p>

      {!readOnly && mode === 'speak' && (
        <>
          <VoiceRecorder initialId={a.recordingId} initialDuration={a.durationSec}
            onSaved={(id, d) => update((o) => recordRetell(o, { recordingId: id, durationSec: d, skipped: false }, Date.now()))}
            onDiscard={() => update((o) => recordRetell(o, { recordingId: '', durationSec: 0, selfCheck: [] }, Date.now()))}
            onTypeInstead={() => setMode('type')} />
          {a.recordingId && (
            <fieldset className="o-plane" style={{ marginTop: 14 }}>
              <legend className="o-h3" style={{ padding: '0 6px' }}>تقييم ذاتي: ما الذي ذكرته؟</legend>
              <p className="o-small" style={{ marginBottom: 8 }}>استمع لتسجيلك ثم علّم النقاط التي قلتها. هذا تقديرك أنت — لا يوجد تقييم آلي للكلام.</p>
              <ul className="o-list">
                {item.retell.points.map((pt, i) => (
                  <li key={i}>
                    <label className="o-option" style={{ minHeight: 52 }}>
                      <input type="checkbox" checked={a.selfCheck.includes(i)} onChange={() => toggleSelf(i)} />
                      <span className="o-option__key" aria-hidden="true">{a.selfCheck.includes(i) ? <ICheck size={16} /> : i + 1}</span>
                      <span className="o-option__text">{pt.ar} <span className="o-small o-nl" lang="nl">({pt.nl})</span></span>
                    </label>
                  </li>
                ))}
              </ul>
            </fieldset>
          )}
        </>
      )}

      {(mode === 'type' || readOnly) && (
        <div className="o-field" style={{ marginTop: 6 }}>
          <label className="o-label" htmlFor="retell-text">إعادتك المكتوبة</label>
          <textarea id="retell-text" className="o-textarea" lang="nl" dir="ltr" rows={6} value={readOnly ? a.typed : typed} readOnly={readOnly}
            onChange={(e) => { setTyped(e.target.value); setChecked(false) }} placeholder="De tekst gaat over…" />
          <span className="o-hint">{words} كلمة{words < 8 ? ' — 8 كلمات على الأقل لتُحفظ كمحاولة' : ''}</span>
          {!readOnly && <div><Button size="sm" variant="secondary" onClick={() => setChecked(true)} disabled={!typed.trim()}>أي النقاط ذكرت؟</Button></div>}
          {checked && (
            <div className="o-plane o-plane--quiet" style={{ border: '1px solid var(--o-line)' }} aria-live="polite">
              <p className="o-small" style={{ marginBottom: 6 }}>فحص كلمات مفتاحية فقط — ليس تقييمًا للغتك:</p>
              <ul className="o-list">
                {item.retell.points.map((pt, i) => (
                  <li key={i} className="o-row" style={{ gap: 8 }}>
                    {hits.includes(i) ? <Chip tone="mint" icon={ICheck}>ذُكرت</Chip> : <Chip>لم تظهر</Chip>}
                    <span>{pt.ar}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {!readOnly && (
        <div className="o-actions">
          <Button variant="primary" iconEnd={IArrowRight} flipEnd disabled={!ready} onClick={() => finish(false)}>انتهيت — إلى التذكّر</Button>
          <Button variant="ghost" onClick={() => finish(true)}>تخطَّ هذه المرة</Button>
          {!ready && <span className="o-small">سجّل أو اكتب 8 كلمات على الأقل، أو تخطَّ.</span>}
        </div>
      )}
    </StepFrame>
  )
}
