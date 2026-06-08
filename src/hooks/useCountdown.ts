import { useState, useEffect } from 'react'

export interface CountdownResult {
  days: number | null
  hours: number
  minutes: number
  seconds: number
}

export function useCountdown(examDate: string): CountdownResult {
  const calc = (): CountdownResult => {
    if (!examDate) return { days: null, hours: 0, minutes: 0, seconds: 0 }
    const diff = new Date(examDate).getTime() - Date.now()
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 }
    const days = Math.floor(diff / 86400000)
    const hours = Math.floor((diff % 86400000) / 3600000)
    const minutes = Math.floor((diff % 3600000) / 60000)
    const seconds = Math.floor((diff % 60000) / 1000)
    return { days, hours, minutes, seconds }
  }

  const [result, setResult] = useState(calc)
  useEffect(() => {
    const id = setInterval(() => setResult(calc()), 1000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [examDate])

  return result
}
