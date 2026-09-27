interface Props {
  /** 0..100. Values outside the range are clamped. */
  value: number
  /** What is progressing — read out by screen readers ("تقدّم مهام اليوم"). */
  label: string
  /** Spoken value, e.g. "2 من 5". Defaults to the percentage. */
  valueText?: string
}

/** A real progressbar: announced by assistive tech, animated with transform. */
export function ProgressBar({ value, label, valueText }: Props) {
  const pct = Math.max(0, Math.min(100, Math.round(value)))
  return (
    <div
      className="progress"
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-valuetext={valueText ?? `${pct}%`}
    >
      <span style={{ transform: `scaleX(${pct / 100})` }} />
    </div>
  )
}
