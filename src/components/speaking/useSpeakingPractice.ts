import { useEffect, useRef, useState } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import { stopSpeak } from '@/features/tts/speakDutch'

type Phase = 'idle' | 'starting' | 'listening' | 'result' | 'error'
const MICROPHONE_ERROR = 'لم يُمنح إذن الميكروفون. اسمح بالوصول في إعدادات المتصفّح ثم حاول مجدّدًا.'
const EMPTY_RESULT = 'لم يلتقط المتصفّح كلامًا واضحًا. اقترب من الميكروفون، ثم حاول مجدّدًا في مكان هادئ.'

export function useSpeakingPractice() {
  const { transcript, listening, browserSupportsSpeechRecognition, isMicrophoneAvailable, resetTranscript } = useSpeechRecognition()
  const [phase, setPhase] = useState<Phase>('idle')
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const ours = useRef(false)
  const heardListening = useRef(false)
  const session = useRef(0)

  useEffect(() => {
    if (!ours.current) return
    const timer = setTimeout(() => {
      if (!ours.current) return
      if (!isMicrophoneAvailable) {
        ours.current = false
        setError(MICROPHONE_ERROR)
        setPhase('error')
      } else if (listening) {
        heardListening.current = true
        setPhase('listening')
      } else if (heardListening.current) {
        ours.current = false
        if (transcript.trim()) {
          setResult(transcript.trim())
          setPhase('result')
        } else {
          setError(EMPTY_RESULT)
          setPhase('error')
        }
      }
    }, 0)
    return () => clearTimeout(timer)
  }, [listening, isMicrophoneAvailable, transcript, phase])

  useEffect(() => () => {
    session.current += 1
    if (ours.current) {
      ours.current = false
      void SpeechRecognition.abortListening().catch(() => {})
    }
  }, [])

  async function start() {
    if (ours.current) return
    setResult(null)
    setError(null)
    if (!navigator.onLine) {
      setError('التعرّف على الكلام يحتاج اتصالًا بالإنترنت. يمكنك الاستماع إلى المثال وتكراره، ثم المحاولة عند عودة الاتصال.')
      setPhase('error')
      return
    }
    const attempt = ++session.current
    stopSpeak()
    resetTranscript()
    ours.current = true
    heardListening.current = false
    setPhase('starting')
    try {
      await SpeechRecognition.startListening({ language: 'nl-NL', continuous: false })
    } catch {
      if (session.current !== attempt) return
      ours.current = false
      setError(isMicrophoneAvailable ? 'تعذّر تشغيل التعرّف على الكلام. تحقّق من إذن الميكروفون والاتصال، ثم حاول مجدّدًا.' : MICROPHONE_ERROR)
      setPhase('error')
    }
  }

  async function stop() {
    if (phase === 'starting') {
      session.current += 1
      ours.current = false
      setPhase('idle')
      await SpeechRecognition.abortListening().catch(() => {})
      return
    }
    try {
      await SpeechRecognition.stopListening()
    } catch {
      ours.current = false
      setError('تعذّر إنهاء المحاولة. حاول تشغيل الميكروفون مرّة أخرى.')
      setPhase('error')
    }
  }

  return { phase, result, error, supported: browserSupportsSpeechRecognition, liveTranscript: phase === 'listening' ? transcript : '', start, stop }
}
