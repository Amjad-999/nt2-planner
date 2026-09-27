import { useRef } from 'react'
import { useRecorder } from '@/features/observatory/useRecorder'
import { SpeakingObject } from './SpeakingObject'
import { Button, Notice } from './ui'
import { IMicrophone, IStop, IPlay, IArrowCounterClockwise, IKeyboard } from './icons'

/* Recording UI with every state spelled out:
   ready · permission needed · recording (timer + clear stop) · processing ·
   recorded ⇄ playing · denied · unsupported · error. The typed alternative
   is always one tap away. No transcription, no pronunciation score: those
   are not connected in this app, so the UI never implies them. */

interface Props {
  initialId?: string
  initialDuration?: number
  maxSec?: number
  target?: string
  onSaved: (id: string, durationSec: number) => void
  onDiscard?: () => void
  onTypeInstead?: () => void
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export function VoiceRecorder({ initialId, initialDuration, maxSec = 90, target = '30–60', onSaved, onDiscard, onTypeInstead }: Props) {
  const meter = useRef<HTMLDivElement | null>(null)
  const { state, start, stop, play, stopPlayback, discard, retry } = useRecorder({ initialId, initialDuration, maxSec, meter, onSaved, onDiscard })
  const s = state.status
  const statusText: Record<typeof s, string> = {
    idle: 'جاهز. اضغط «ابدأ التسجيل» وتكلّم بهدوء.',
    requesting: 'بانتظار إذن الميكروفون من المتصفّح…',
    recording: `يسجّل الآن — ${fmt(state.elapsed)} (المقترح ${target} ثانية، الحد ${maxSec})`,
    processing: 'يحفظ التسجيل على جهازك…',
    recorded: `تسجيل محفوظ (${fmt(state.durationSec)}). استمع لنفسك وقارن.`,
    playing: 'يعزف تسجيلك الآن.',
    denied: 'الميكروفون مرفوض.',
    unsupported: 'التسجيل غير مدعوم في هذا المتصفّح.',
    error: state.error === 'no-mic' ? 'لم يُعثر على ميكروفون.' : state.error === 'missing' ? 'التسجيل غير موجود على هذا الجهاز.' : state.error === 'save' ? 'تعذّر حفظ التسجيل.' : 'حدث خطأ في التسجيل.',
  }

  return (
    <div className="o-night o-stage o-recorder" data-status={s}>
      <SpeakingObject status={s} meterRef={meter} />
      <p className="o-timer" aria-hidden={s !== 'recording'}>{s === 'recording' ? fmt(state.elapsed) : s === 'recorded' || s === 'playing' ? fmt(state.durationSec) : '0:00'}</p>
      <p className="o-small" role="status" aria-live="polite" style={{ color: 'var(--o-on-night)' }}>
        {s === 'recording' && <span className="o-rec-dot" aria-hidden="true" style={{ marginInlineEnd: 8 }} />}
        {statusText[s]}
      </p>

      <div className="o-row" style={{ justifyContent: 'center', marginTop: 12 }}>
        {(s === 'idle') && <Button variant="primary" icon={IMicrophone} onClick={start}>ابدأ التسجيل</Button>}
        {s === 'requesting' && <Button variant="night" disabled>بانتظار الإذن…</Button>}
        {s === 'recording' && <Button variant="primary" icon={IStop} onClick={stop}>أوقف التسجيل</Button>}
        {s === 'processing' && <Button variant="night" disabled>يحفظ…</Button>}
        {s === 'recorded' && <>
          <Button variant="primary" icon={IPlay} onClick={play}>استمع لتسجيلك</Button>
          <Button variant="night" icon={IArrowCounterClockwise} onClick={discard}>سجّل من جديد</Button>
        </>}
        {s === 'playing' && <Button variant="primary" icon={IStop} onClick={stopPlayback}>أوقف الاستماع</Button>}
        {(s === 'error') && <Button variant="night" icon={IArrowCounterClockwise} onClick={retry}>حاول مجددًا</Button>}
        {onTypeInstead && s !== 'recording' && <Button variant="night" icon={IKeyboard} onClick={onTypeInstead}>اكتب بدلًا من ذلك</Button>}
      </div>

      {s === 'denied' && (
        <div style={{ marginTop: 12, textAlign: 'start' }}>
          <Notice tone="warn" title="لا نستطيع التسجيل بلا إذن."
            actions={<Button size="sm" variant="secondary" onClick={retry}>حاولت تفعيله — أعد المحاولة</Button>}>
            افتح إعدادات الموقع في المتصفّح (رمز القفل بجانب العنوان) واسمح بالميكروفون، أو اكتب إجابتك بدلًا من ذلك.
          </Notice>
        </div>
      )}
      {s === 'unsupported' && (
        <div style={{ marginTop: 12, textAlign: 'start' }}>
          <Notice tone="warn" title="متصفّحك لا يدعم التسجيل هنا.">جرّب متصفّحًا حديثًا، أو اكتب إجابتك — الكتابة تُحفظ بالطريقة نفسها.</Notice>
        </div>
      )}
      <p className="o-small" style={{ marginTop: 12 }}>التسجيل يبقى على هذا الجهاز فقط. لا يوجد في هذا التطبيق تفريغ نصي آلي ولا تقييم للنطق.</p>
    </div>
  )
}
