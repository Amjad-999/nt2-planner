import { useState, useEffect } from 'react'

export interface CountdownResult {
  days: number | null
  hours: number
  minutes: number
  seconds: number
  isPast: boolean
}

function calc(examDate: string): CountdownResult {
  if (!examDate) return { days: null, hours: 0, minutes: 0, seconds: 0, isPast: false }
  const diff = new Date(examDate).getTime() - Date.now()
  if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true }
  const days = Math.floor(diff / 86400000)
  const hours = Math.floor((diff % 86400000) / 3600000)
  const minutes = Math.floor((diff % 3600000) / 60000)
  const seconds = Math.floor((diff % 60000) / 1000)
  return { days, hours, minutes, seconds, isPast: false }
}

export function useCountdown(examDate: string): CountdownResult {
  const [prevExamDate, setPrevExamDate] = useState(examDate)
  const [result, setResult] = useState(() => calc(examDate))

  // React's "adjust state during render" pattern (react.dev's own
  // CountdownTimer example) — recomputes immediately when examDate changes,
  // instead of showing the previous date's numbers for up to 1s until the
  // next interval tick.
  if (examDate !== prevExamDate) {
    setPrevExamDate(examDate)
    setResult(calc(examDate))
  }

  useEffect(() => {
    const id = setInterval(() => setResult(calc(examDate)), 1000)
    return () => clearInterval(id)
  }, [examDate])

  return result
}
