import { useState } from 'react'
import { StepFrame, Passage, SpeakButton, type StepProps } from './shared'
import { Button, Chip, Notice } from '../ui'
import { IArrowRight, IEye, IHeadphones } from '../icons'

/* Step 1 — watch/listen or read one selected item.
   A "listen" item starts with the text hidden (listening comprehension);
   the transcript is one tap away and appears automatically if speech is
   unavailable. Nothing forces the learner to listen before continuing. */

export function InputStep({ item, readOnly, onComplete }: StepProps) {
  const listen = item.kind === 'listen'
  const [showText, setShowText] = useState(!listen || readOnly)
  const full = item.paragraphs.join(' ')

  return (
    <StepFrame
      kicker={`STAP 01 · ${listen ? 'LUISTEREN' : 'LEZEN'}`}
      title={listen ? 'استمع إلى النص مرة أو مرتين' : 'اقرأ النص بهدوء'}
      lede={listen
        ? 'حاول أن تلتقط الفكرة العامة: من؟ ماذا؟ متى؟ النص المكتوب متاح إن احتجته.'
        : 'اقرأ للفكرة العامة أولًا. الكلمات الصعبة موجودة في «لوحة السياق».'}
    >
      <div className="o-row" style={{ margin: '4px 0 16px' }}>
        <Chip tone="neutral">نص تدريبي — أماكن وأشخاص متخيَّلون</Chip>
        {listen && <Chip tone="cobalt" icon={IHeadphones}>صوت مُولَّد آليًا</Chip>}
      </div>

      {listen && (
        <div className="o-night o-stage" style={{ marginBottom: 16 }}>
          <p className="o-small" style={{ marginBottom: 12 }}>الاستماع يستخدم محرّك النطق في إعداداتك (الإنترنت أولًا، ثم صوت جهازك).</p>
          <SpeakButton text={full} label="استمع إلى النص" size="md" onUnavailable={() => setShowText(true)} />
        </div>
      )}

      {showText ? (
        <div className="o-plane o-plane--raised">
          <div className="o-passage__head">
            <h3 className="o-nl-display" lang="nl" style={{ fontSize: '1.45rem' }}>{item.titleNl}</h3>
            {!listen && <SpeakButton text={full} label="استمع" />}
          </div>
          <Passage item={item} />
        </div>
      ) : (
        <Notice tone="info" title="النص مخفي الآن."
          actions={<Button size="sm" variant="secondary" icon={IEye} onClick={() => setShowText(true)}>اعرض النص</Button>}>
          إظهاره مساعدة مسموحة — لا شيء يُحسب ضدك.
        </Notice>
      )}

      {!readOnly && (
        <div className="o-actions">
          <Button variant="primary" iconEnd={IArrowRight} flipEnd onClick={onComplete}>انتقل إلى الأسئلة</Button>
        </div>
      )}
    </StepFrame>
  )
}
