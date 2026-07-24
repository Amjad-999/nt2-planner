import { useEffect, useRef, useState } from 'react'
import { useTheme } from '@/hooks/useTheme'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type WaveSurfer from 'wavesurfer.js'

interface Props {
  /** Audio URL to load */
  src?: string
  /** Pre-decoded AudioBuffer (converted to WAV blob internally) */
  audioBuffer?: AudioBuffer
  /** Accessible label */
  title?: string
}

type Speed = 0.75 | 1 | 1.25

const SPEEDS: Speed[] = [0.75, 1, 1.25]
const SPEED_LABELS: Record<Speed, string> = { 0.75: '0.75×', 1: '1×', 1.25: '1.25×' }

function fmtTime(s: number): string {
  if (!isFinite(s) || s < 0) return '–:––'
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${m}:${String(sec).padStart(2, '0')}`
}

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || undefined!
}

/** Encode an AudioBuffer to a WAV Blob */
function audioBufferToBlob(buf: AudioBuffer): Blob {
  const ch = buf.numberOfChannels
  const sr = buf.sampleRate
  const frames = buf.length
  const bytes = frames * ch * 2
  const ab = new ArrayBuffer(44 + bytes)
  const v = new DataView(ab)
  const wr = (off: number, s: string) => [...s].forEach((c, i) => v.setUint8(off + i, c.charCodeAt(0)))
  wr(0, 'RIFF'); v.setUint32(4, 36 + bytes, true); wr(8, 'WAVE')
  wr(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true)
  v.setUint16(22, ch, true); v.setUint32(24, sr, true)
  v.setUint32(28, sr * ch * 2, true); v.setUint16(32, ch * 2, true); v.setUint16(34, 16, true)
  wr(36, 'data'); v.setUint32(40, bytes, true)
  let off = 44
  for (let i = 0; i < frames; i++) {
    for (let c = 0; c < ch; c++) {
      v.setInt16(off, Math.max(-1, Math.min(1, buf.getChannelData(c)[i])) * 0x7fff, true)
      off += 2
    }
  }
  return new Blob([ab], { type: 'audio/wav' })
}

export function WaveAudio({ src, audioBuffer, title }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)
  const blobUrlRef = useRef<string | null>(null)

  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [speed, setSpeed] = useState<Speed>(1)
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState(false)

  // A–B loop
  const [abA, setAbA] = useState<number | null>(null)
  const [abB, setAbB] = useState<number | null>(null)
  const [abOn, setAbOn] = useState(false)
  const abARef = useRef<number | null>(null)
  const abBRef = useRef<number | null>(null)
  const abOnRef = useRef(false)

  // Mirror A–B state into refs after commit (not during render) so the
  // wavesurfer callbacks registered once at init always read latest values
  useEffect(() => {
    abARef.current = abA
    abBRef.current = abB
    abOnRef.current = abOn
  }, [abA, abB, abOn])

  const { isDark } = useTheme()
  const reducedMotion = useReducedMotion()

  // Build wavesurfer colors from CSS vars
  const waveColors = () => ({
    waveColor:     cssVar('--orange-m') || '#EAB18F',
    progressColor: cssVar('--orange')   || '#E07A3E',
    cursorColor:   cssVar('--orange-d') || '#C96A32',
  })

  // ── Init wavesurfer on mount / src change ──
  useEffect(() => {
    if (!containerRef.current) return
    if (!src && !audioBuffer) return

    let destroyed = false
    let ws: WaveSurfer | null = null

    const init = async () => {
      const { default: WaveSurfer } = await import('wavesurfer.js')
      if (destroyed || !containerRef.current) return

      const colors = waveColors()
      const inst = WaveSurfer.create({
        container: containerRef.current,
        height: 56,
        barWidth: 2,
        barGap: 1,
        barRadius: 2,
        normalize: true,
        interact: true,
        dragToSeek: true,
        hideScrollbar: true,
        audioRate: speed,
        ...colors,
      })
      ws = inst
      wsRef.current = inst

      inst.on('ready', (dur: number) => {
        if (destroyed) return
        setDuration(dur)
        setReady(true)
        setLoadError(false)
      })
      inst.on('timeupdate', (ct: number) => {
        if (destroyed) return
        setCurrentTime(ct)
        // A–B loop
        if (
          abOnRef.current &&
          abARef.current !== null &&
          abBRef.current !== null &&
          abBRef.current > abARef.current &&
          ct >= abBRef.current
        ) {
          inst.setTime(abARef.current)
        }
      })
      inst.on('play',   () => { if (!destroyed) setPlaying(true) })
      inst.on('pause',  () => { if (!destroyed) setPlaying(false) })
      inst.on('finish', () => {
        if (destroyed) return
        if (abOnRef.current && abARef.current !== null) {
          inst.setTime(abARef.current)
          inst.play().catch(() => {})
        } else {
          setPlaying(false)
        }
      })
      inst.on('error', () => { if (!destroyed) setLoadError(true) })

      // Load source
      if (src) {
        await inst.load(src)
      } else if (audioBuffer) {
        const blob = audioBufferToBlob(audioBuffer)
        const blobUrl = URL.createObjectURL(blob)
        blobUrlRef.current = blobUrl
        await inst.load(blobUrl)
      }
    }

    init().catch(() => { if (!destroyed) setLoadError(true) })

    return () => {
      destroyed = true
      ws?.destroy()
      wsRef.current = null
      if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null }
      setReady(false)
      setPlaying(false)
      setCurrentTime(0)
      setDuration(0)
      setLoadError(false)
      setAbA(null); setAbB(null); setAbOn(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, audioBuffer])

  // ── Sync colors on theme change ──
  useEffect(() => {
    if (!wsRef.current || !ready) return
    wsRef.current.setOptions(waveColors())
  }, [isDark, ready])

  // ── Sync playback rate ──
  useEffect(() => {
    wsRef.current?.setPlaybackRate(speed, true)
  }, [speed])

  const togglePlay = () => wsRef.current?.playPause().catch(() => {})
  const seek = (ratio: number) => wsRef.current?.seekTo(Math.max(0, Math.min(1, ratio)))

  const setA = () => { const t = wsRef.current?.getCurrentTime() ?? 0; setAbA(t) }
  const setB = () => { const t = wsRef.current?.getCurrentTime() ?? 0; setAbB(t) }
  const clearAb = () => { setAbA(null); setAbB(null); setAbOn(false) }

  const progress = duration > 0 ? currentTime / duration : 0
  const abAFrac  = duration > 0 && abA !== null ? abA / duration : null
  const abBFrac  = duration > 0 && abB !== null ? abB / duration : null

  if (loadError) {
    return (
      <div role="alert" style={{ padding: '10px 14px', background: 'var(--red-l)', border: '1px solid var(--red)', borderRadius: 'var(--r-sm)', fontSize: '.85rem', color: 'var(--red)' }}>
        ⚠️ تعذّر تحميل الملف الصوتي.
      </div>
    )
  }

  return (
    <div
      dir="ltr"
      aria-label={title ?? 'مشغّل صوتي'}
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--r-sm)',
        padding: '10px 12px',
        boxShadow: 'var(--elev-1)',
      }}
    >
      {/* ── Main controls row ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        {/* Play / Pause */}
        <button
          onClick={togglePlay}
          disabled={!ready}
          aria-label={playing ? 'إيقاف مؤقّت' : 'تشغيل'}
          style={ctrlBtn(!ready)}
        >
          {playing ? '⏸' : '▶'}
        </button>

        {/* Time */}
        <span
          aria-live="off"
          style={{ fontSize: '.78rem', color: 'var(--text2)', fontVariantNumeric: 'tabular-nums', minWidth: 80, textAlign: 'center' }}
        >
          {fmtTime(currentTime)} / {fmtTime(duration)}
        </span>

        <div style={{ flex: 1 }} />

        {/* Speed selector */}
        <div role="group" aria-label="سرعة التشغيل" style={{ display: 'flex', gap: 3 }}>
          {SPEEDS.map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              aria-pressed={speed === s}
              aria-label={`السرعة ${SPEED_LABELS[s]}`}
              style={{
                ...ctrlBtn(false),
                background: speed === s ? 'var(--orange-ink)' : 'var(--btn-bg)',
                color:      speed === s ? '#fff' : 'var(--text2)',
                fontSize: '.72rem',
                padding: '4px 7px',
                fontWeight: speed === s ? 700 : 400,
              }}
            >
              {SPEED_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* ── Seek bar (progress + waveform overlay) ── */}
      <div
        style={{ position: 'relative', cursor: ready ? 'pointer' : 'default', userSelect: 'none' }}
        onClick={(e) => {
          if (!ready) return
          const rect = e.currentTarget.getBoundingClientRect()
          seek((e.clientX - rect.left) / rect.width)
        }}
        role="slider"
        aria-label="موضع التشغيل"
        aria-valuenow={Math.round(progress * 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        tabIndex={ready ? 0 : -1}
        onKeyDown={(e) => {
          if (!ready) return
          if (e.key === 'ArrowRight') { e.preventDefault(); wsRef.current?.skip(5) }
          if (e.key === 'ArrowLeft')  { e.preventDefault(); wsRef.current?.skip(-5) }
        }}
      >
        {/* WaveSurfer container */}
        <div
          ref={containerRef}
          style={{
            borderRadius: 6,
            overflow: 'hidden',
            transition: reducedMotion ? 'none' : 'opacity .2s',
            opacity: ready ? 1 : 0.4,
          }}
        />

        {/* A–B region highlight */}
        {abAFrac !== null && abBFrac !== null && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              insetInlineStart: `${abAFrac * 100}%`,
              width: `${(abBFrac - abAFrac) * 100}%`,
              background: 'rgba(160,88,69,.18)',
              border: '1px solid rgba(160,88,69,.5)',
              borderRadius: 3,
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* ── A–B loop controls ── */}
      <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', marginTop: 6 }}>
        <button onClick={setA} disabled={!ready} aria-label="تحديد نقطة A للتكرار" style={ctrlBtn(!ready, '.72rem')}>
          A {abA !== null ? fmtTime(abA) : '–'}
        </button>
        <button onClick={setB} disabled={!ready} aria-label="تحديد نقطة B للتكرار" style={ctrlBtn(!ready, '.72rem')}>
          B {abB !== null ? fmtTime(abB) : '–'}
        </button>
        {abA !== null && abB !== null && (
          <button
            onClick={() => setAbOn((v) => !v)}
            aria-pressed={abOn}
            aria-label={abOn ? 'إيقاف تكرار A–B' : 'تفعيل تكرار A–B'}
            style={{
              ...ctrlBtn(false, '.72rem'),
              background: abOn ? 'var(--orange-l)' : undefined,
              borderColor: abOn ? 'var(--orange)' : undefined,
              color: abOn ? 'var(--orange)' : undefined,
              fontWeight: abOn ? 700 : undefined,
            }}
          >
            🔁 {abOn ? 'تكرار: فعّال' : 'تكرار: موقوف'}
          </button>
        )}
        {(abA !== null || abB !== null) && (
          <button onClick={clearAb} aria-label="مسح نقاط A–B" style={ctrlBtn(false, '.72rem')}>
            ✕
          </button>
        )}
      </div>
    </div>
  )
}

function ctrlBtn(disabled: boolean, fontSize = '.9rem'): React.CSSProperties {
  return {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '5px 9px',
    minWidth: 32,
    border: '1px solid var(--btn-border)',
    borderRadius: 8,
    background: 'var(--btn-bg)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    color: 'var(--text2)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    fontSize,
    fontFamily: 'inherit',
    fontWeight: 500,
    transition: 'background .12s, color .12s',
    whiteSpace: 'nowrap',
  }
}
