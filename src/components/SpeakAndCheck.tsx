import { useEffect, useRef, useState } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { speakScore, scoreLabel } from '@/features/speaking/similarity'
import { stopSpeak } from '@/features/tts/speakDutch'
import { useReducedMotion } from '@/hooks/useReducedMotion'

interface Props {
  /** The Dutch sentence the learner should repeat */
  targetNl: string
  /** Optional heading label (Arabic) */
  label?: string
}

type Phase = 'idle' | 'listening' | 'scored' | 'error'

const UNSUPPORTED_MSG =
  '🌐 متصفّحك لا يدعم التعرّف على الكلام. استخدم Google Chrome للحصول على أفضل تجربة.'
const NO_MIC_MSG =
  '🎤 لم يُمنح إذن الميكروفون. اسمح بالوصول في إعدادات متصفّحك ثمّ حاول مجدّدًا.'
const OFFLINE_MSG =
  '📶 التعرّف على الكلام يحتاج اتّصال بالإنترنت. تحقّق من الاتّصال وحاول مجدّدًا.'

export function SpeakAndCheck({ targetNl, label }: Props) {
  const {
    transcript,
    interimTranscript,
    listening,
    isMicrophoneAvailable,
    browserSupportsSpeechRecognition,
    resetTranscript,
  } = useSpeechRecognition()

  const [phase, setPhase] = useState<Phase>('idle')
  const [score, setScore] = useState<number | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const reducedMotion = useReducedMotion()
  // Track whether we initiated this listening session so auto-stop fires correctly
  const ours = useRef(false)

  // Compute score once listening stops (auto-stop or manual).
  // setState runs on a cancellable 0 ms timer — never synchronously in the
  // effect body — while ours.current flips synchronously to keep the
  // cross-effect session guard race-free
  useEffect(() => {
    if (!ours.current) return
    if (!listening && transcript) {
      ours.current = false
      const pct = speakScore(transcript, targetNl)
      const t = setTimeout(() => {
        setScore(pct)
        setPhase('scored')
      }, 0)
      return () => clearTimeout(t)
    } else if (!listening && !transcript && phase === 'listening') {
      // recognition ended without a result (e.g. silence timeout)
      ours.current = false
      const t = setTimeout(() => setPhase('idle'), 0)
      return () => clearTimeout(t)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listening])

  // React to mic permission being revoked after start
  useEffect(() => {
    if (!isMicrophoneAvailable && phase === 'listening') {
      ours.current = false
      const t = setTimeout(() => {
        setErrorMsg(NO_MIC_MSG)
        setPhase('error')
      }, 0)
      return () => clearTimeout(t)
    }
  }, [isMicrophoneAvailable, phase])

  if (!browserSupportsSpeechRecognition) {
    return (
      <div role="status" style={infoStyle('var(--amber-l)', 'var(--amber)')}>
        {UNSUPPORTED_MSG}
      </div>
    )
  }

  const start = async () => {
    if (!navigator.onLine) {
      setErrorMsg(OFFLINE_MSG)
      setPhase('error')
      return
    }
    // Stop TTS so it doesn't interfere with the mic
    stopSpeak()
    resetTranscript()
    setScore(null)
    setErrorMsg(null)
    ours.current = true
    setPhase('listening')
    try {
      await SpeechRecognition.startListening({ language: 'nl-NL', continuous: false })
    } catch {
      ours.current = false
      if (!isMicrophoneAvailable) {
        setErrorMsg(NO_MIC_MSG)
      } else {
        setErrorMsg('حدث خطأ — حاول مجدّدًا.')
      }
      setPhase('error')
    }
  }

  const stop = async () => {
    await SpeechRecognition.stopListening()
    // score will be set by the useEffect above when listening → false
  }

  const reset = () => {
    SpeechRecognition.abortListening().catch(() => {})
    resetTranscript()
    ours.current = false
    setPhase('idle')
    setScore(null)
    setErrorMsg(null)
  }

  const lbl = score !== null ? scoreLabel(score) : null
  const displayTranscript = listening ? (transcript + (interimTranscript ? ' ' + interimTranscript : '')) : transcript

  return (
    <div
      dir="rtl"
      style={{
        marginTop: 10,
        padding: '12px 14px',
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--r-sm)',
        boxShadow: 'var(--elev-1)',
      }}
    >
      {label && (
        <div style={{ fontSize: '.82rem', fontWeight: 600, color: 'var(--text2)', marginBottom: 8 }}>
          🎙️ {label}
        </div>
      )}

      {/* Control buttons */}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {phase !== 'listening' ? (
          <MicButton
            onPress={start}
            reducedMotion={reducedMotion}
            label="ابدأ النطق — اضغط للتسجيل بالهولندية"
          />
        ) : (
          <button
            onClick={stop}
            aria-label="أوقف التسجيل"
            style={{ ...btnBase, background: 'var(--red-l)', color: 'var(--red)', borderColor: 'var(--red)' }}
          >
            ⏹ إيقاف
          </button>
        )}
        {(phase === 'scored' || phase === 'error') && (
          <button onClick={reset} aria-label="أعِد المحاولة" style={btnBase}>
            🔄 حاول مجدّدًا
          </button>
        )}
      </div>

      {/* Live transcript (aria-live) */}
      {(phase === 'listening' || (phase === 'scored' && displayTranscript)) && (
        <div
          role="status"
          aria-live="polite"
          aria-atomic="false"
          style={{
            marginTop: 8,
            padding: '7px 10px',
            background: 'var(--glass-bg-strong)',
            border: '1px solid var(--glass-border)',
            borderRadius: 8,
            fontSize: '.88rem',
            color: phase === 'listening' ? 'var(--text)' : 'var(--text2)',
            minHeight: 34,
            direction: 'ltr',
            textAlign: 'left',
            fontStyle: phase === 'listening' ? 'normal' : 'italic',
          }}
        >
          {displayTranscript || (phase === 'listening' ? '…' : '')}
        </div>
      )}

      {/* Score bar */}
      {phase === 'scored' && score !== null && lbl && (
        <div style={{ marginTop: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
            <span style={{ fontSize: '.82rem', color: lbl.color, fontWeight: 600 }}>{lbl.text}</span>
            <span style={{ fontSize: '.88rem', fontWeight: 700, color: lbl.color }}>{score}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={score}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`نتيجة النطق: ${score} بالمئة`}
            style={{
              height: 7,
              background: 'var(--surface3)',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${score}%`,
                background: lbl.color,
                transition: reducedMotion ? 'none' : 'width .5s ease',
                borderRadius: 4,
              }}
            />
          </div>
        </div>
      )}

      {/* Error message */}
      {phase === 'error' && errorMsg && (
        <div role="alert" style={{ ...infoStyle('var(--red-l)', 'var(--red)'), marginTop: 8 }}>
          {errorMsg}
        </div>
      )}
    </div>
  )
}

/* ── Mic button with pulsing ring when idle ── */
function MicButton({
  onPress,
  reducedMotion,
  label,
}: {
  onPress: () => void
  reducedMotion: boolean
  label: string
}) {
  return (
    <button
      onClick={onPress}
      aria-label={label}
      style={{
        ...btnBase,
        background: 'var(--orange-l)',
        borderColor: 'var(--orange)',
        color: 'var(--orange)',
        animation: reducedMotion ? 'none' : 'mic-pulse 2s ease-in-out infinite',
      }}
    >
      🎙️ ابدأ النطق
      <style>{`
        @keyframes mic-pulse {
          0%, 100% { box-shadow: 0 0 0 0 color-mix(in srgb, var(--orange) 30%, transparent); }
          50%       { box-shadow: 0 0 0 6px transparent; }
        }
        @media (prefers-reduced-motion: reduce) {
          button[aria-label="${label}"] { animation: none !important; }
        }
      `}</style>
    </button>
  )
}

const btnBase: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '7px 14px',
  border: '1px solid var(--btn-border)',
  borderRadius: 10,
  cursor: 'pointer',
  fontSize: '.83rem',
  fontFamily: 'inherit',
  fontWeight: 600,
  background: 'var(--btn-bg)',
  backdropFilter: 'blur(10px)',
  WebkitBackdropFilter: 'blur(10px)',
  color: 'var(--text2)',
  transition: 'background .15s, border-color .15s',
}

function infoStyle(bg: string, border: string): React.CSSProperties {
  return {
    background: bg,
    border: `1px solid ${border}`,
    borderInlineStart: `3px solid ${border}`,
    borderRadius: 'var(--r-sm)',
    padding: '10px 12px',
    fontSize: '.85rem',
    color: 'var(--text2)',
    lineHeight: 1.55,
  }
}
