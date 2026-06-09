declare module 'react-speech-recognition' {
  export interface StartListeningOptions {
    language?: string
    continuous?: boolean
    interimResults?: boolean
  }

  export interface UseSpeechRecognitionOptions {
    transcribing?: boolean
    clearTranscriptOnListen?: boolean
    commands?: unknown[]
  }

  export interface SpeechRecognitionResult {
    transcript: string
    interimTranscript: string
    finalTranscript: string
    listening: boolean
    isMicrophoneAvailable: boolean
    browserSupportsSpeechRecognition: boolean
    browserSupportsContinuousListening: boolean
    resetTranscript: () => void
  }

  export function useSpeechRecognition(
    options?: UseSpeechRecognitionOptions,
  ): SpeechRecognitionResult

  const SpeechRecognition: {
    startListening: (options?: StartListeningOptions) => Promise<void>
    stopListening: () => Promise<void>
    abortListening: () => Promise<void>
    browserSupportsSpeechRecognition: () => boolean
    browserSupportsContinuousListening: () => boolean
    getRecognitionManager: () => unknown
    getRecognition: () => unknown
  }
  export default SpeechRecognition
}
