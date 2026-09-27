import type { RefObject } from 'react'
import type { RecStatus } from '@/features/observatory/useRecorder'
import { IMicrophone, IWaveform, ICheck, IWarningCircle } from './icons'

/* ── Speaking object ────────────────────────────────────────────────────────
   A satin lens with two rings. The rings scale with --level, which the
   recorder writes from the ACTUAL analyser signal (mic while recording, the
   learner's own take while playing back). Idle, it is still. It carries no
   information on its own: every state is also written as text next to it. */

export function SpeakingObject({ status, meterRef }: { status: RecStatus; meterRef: RefObject<HTMLDivElement | null> }) {
  const Ic = status === 'recording' ? IWaveform
    : status === 'recorded' || status === 'playing' ? ICheck
      : status === 'denied' || status === 'error' || status === 'unsupported' ? IWarningCircle
        : IMicrophone
  return (
    <div ref={meterRef} className="o-orb" data-state={status} aria-hidden="true">
      <span className="o-orb__ring" />
      <span className="o-orb__ring o-orb__ring--2" />
      <span className="o-orb__core"><Ic size={34} /></span>
    </div>
  )
}
