import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { normalise, wordFeedback } from '@/features/speaking/similarity'
import { speakDutch, stopSpeak } from '@/features/tts/speakDutch'
import { Callout } from '@/components/ui/Callout'
import { useSpeakingPractice } from '@/components/speaking/useSpeakingPractice'

interface Props {
  /** The Dutch sentence the learner should repeat. */
  targetNl: string
  label?: string
}

export function SpeakAndCheck(props: Props) {
  // Changing cards ends the old microphone session and clears its feedback.
  return <SpeakingPractice key={props.targetNl} {...props} />
}

function SpeakingPractice({ targetNl, label = 'تدرّب على النطق' }: Props) {
  const practice = useSpeakingPractice()
  const [playing, setPlaying] = useState(false)
  const [audioError, setAudioError] = useState(false)
  const audioRequest = useRef(0)
  const audioActive = useRef(false)
  const active = practice.phase === 'starting' || practice.phase === 'listening'
  const matches = practice.result !== null && normalise(practice.result) === normalise(targetNl)
  const feedback = practice.result === null ? [] : wordFeedback(targetNl, practice.result)
  const missing = feedback.filter((w) => w.state === 'missing').map((w) => w.word)

  useEffect(() => () => {
    audioRequest.current += 1
    if (audioActive.current) stopSpeak()
  }, [])

  async function playExample() {
    const request = ++audioRequest.current
    if (playing) {
      stopSpeak()
      audioActive.current = false
      setPlaying(false)
      return
    }
    setAudioError(false)
    setPlaying(true)
    audioActive.current = true
    await speakDutch(targetNl, undefined, {
      onError: () => { if (audioRequest.current === request) setAudioError(true) },
    })
    if (audioRequest.current === request) {
      audioActive.current = false
      setPlaying(false)
    }
  }

  return (
    <section dir="rtl" aria-label={label} style={{
      marginTop: 'var(--sp-3)', padding: 'var(--sp-4)',
      background: 'var(--surface2)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
    }}>
      <h4 style={{ margin: 0, color: 'var(--text)', fontSize: 'var(--text-base)', fontWeight: 'var(--fw-heading)' }}>{label}</h4>
      <p style={{ color: 'var(--text2)', fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-arabic)' }}>
        استمع إلى المثال، ثم قل الجملة بصوت واضح وقارن الكلمات التي التقطها المتصفّح.
      </p>
      <p dir="ltr" lang="nl" style={{
        color: 'var(--text)', fontFamily: 'var(--font-latin)', fontSize: 'var(--text-lg)',
        lineHeight: 'var(--lh-ui)', overflowWrap: 'anywhere', textAlign: 'start',
      }}>{targetNl}</p>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
        <button type="button" disabled={active} onClick={playExample} style={buttonStyle}>
          <span aria-hidden="true">{playing ? '⏹' : '🔊'}</span>
          {playing ? 'إيقاف المثال' : 'استمع إلى المثال'}
        </button>
        {practice.supported && (active ? (
          <button type="button" onClick={practice.stop} style={{ ...buttonStyle, color: 'var(--red-text)', background: 'var(--red-l)' }}>
            <span aria-hidden="true">⏹</span> إيقاف الميكروفون
          </button>
        ) : (
          <button type="button" onClick={() => {
            audioRequest.current += 1
            audioActive.current = false
            setPlaying(false)
            void practice.start()
          }} style={{ ...buttonStyle, color: 'var(--orange-text)', background: 'var(--orange-l)', borderColor: 'var(--orange)' }}>
            <span aria-hidden="true">🎙️</span>
            {practice.result !== null || practice.phase === 'error' ? 'حاول النطق مجدّدًا' : 'ابدأ النطق'}
          </button>
        ))}
      </div>

      {!practice.supported && (
        <Callout tone="warn" role="status" density="compact" style={{ marginTop: 'var(--sp-3)' }}>
          متصفّحك لا يدعم التعرّف على الكلام. يمكنك الاستماع إلى المثال وتكراره بنفسك، أو تجربة متصفّح يدعم الميكروفون.
        </Callout>
      )}
      {active && (
        <div role="status" style={{ marginTop: 'var(--sp-3)', color: 'var(--text2)', fontSize: 'var(--text-sm)' }}>
          <p>{practice.phase === 'starting' ? 'جارٍ طلب الميكروفون… اسمح بالوصول إذا طلب المتصفّح ذلك.' : 'الميكروفون يعمل… قل الجملة ثم اضغط إيقاف.'}</p>
          {practice.liveTranscript && <p dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)', overflowWrap: 'anywhere' }}>{practice.liveTranscript}</p>}
        </div>
      )}
      {practice.result !== null && (
        <Callout tone={matches ? 'success' : 'warn'} role="status" density="compact" style={{ marginTop: 'var(--sp-3)' }}>
          <strong>{matches ? 'التقط المتصفّح كل الكلمات كما في المثال.' : 'بعض الكلمات لم تصل كما في المثال.'}</strong>

          {/* تغذية راجعة على مستوى الكلمة: ما وصل وما لم يصل. ليست درجة نطق —
              التعرّف الآلي يقول ما سمعه فقط. */}
          <p style={{ margin: 'var(--sp-2) 0 var(--sp-1)' }}>كلمة كلمة:</p>
          <p dir="ltr" lang="nl" style={{ margin: 0, fontFamily: 'var(--font-latin)', display: 'flex', flexWrap: 'wrap', gap: 'var(--sp-2)', textAlign: 'start' }}>
            {feedback.map((w, i) => (
              <span key={i} style={{
                color: w.state === 'missing' ? 'var(--red-text)' : 'var(--text)',
                textDecoration: w.state === 'heard' ? 'none' : 'underline',
                textDecorationStyle: w.state === 'close' ? 'dotted' : 'solid',
              }}>
                <span aria-hidden="true">{w.state === 'heard' ? '✓' : w.state === 'close' ? '≈' : '✗'}</span> {w.word}
                <span className="sr-only">{w.state === 'heard' ? ' وصلت' : w.state === 'close' ? ' وصلت قريبة' : ' لم تصل'}</span>
              </span>
            ))}
          </p>

          {missing.length > 0 && (
            <p style={{ margin: 'var(--sp-2) 0' }}>
              أعد هذه الكلمات ببطء بعد المثال: <span dir="ltr" lang="nl" style={{ fontFamily: 'var(--font-latin)' }}>{missing.join(' · ')}</span>
            </p>
          )}
          <details style={{ marginTop: 'var(--sp-2)' }}>
            <summary style={{ cursor: 'pointer', minHeight: 44, display: 'flex', alignItems: 'center' }}>ما التقطه المتصفّح كاملًا</summary>
            <p dir="ltr" lang="nl" style={{ margin: 'var(--sp-2) 0', fontFamily: 'var(--font-latin)', color: 'var(--text)', overflowWrap: 'anywhere', textAlign: 'start' }}>{practice.result}</p>
          </details>
          <p style={{ margin: 'var(--sp-2) 0 0' }}>هذه مقارنة للكلمات وليست تقييمًا لدقّة النطق. قد يخطئ التعرّف الآلي.</p>
        </Callout>
      )}
      {practice.error && <Callout tone="warn" role="alert" density="compact" style={{ marginTop: 'var(--sp-3)' }}>{practice.error}</Callout>}
      {audioError && <Callout tone="warn" role="alert" density="compact" style={{ marginTop: 'var(--sp-3)' }}>تعذّر تشغيل المثال. تحقّق من الاتصال أو من توفر صوت هولندي على جهازك، ثم أعد المحاولة.</Callout>}
    </section>
  )
}

const buttonStyle: CSSProperties = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--sp-2)',
  minHeight: 'var(--tap-min)', padding: 'var(--sp-2) var(--sp-3)',
  border: '1px solid var(--btn-border)', borderRadius: 'var(--r-sm)',
  cursor: 'pointer', fontSize: 'var(--text-sm)', fontFamily: 'inherit',
  fontWeight: 'var(--fw-heading)', background: 'var(--btn-bg)', color: 'var(--text)',
}
