interface Props {
  kind: 'good' | 'warn' | 'bad' | ''
  icon: string
  title: string
  desc: string
}

const BORDER: Record<string, string> = {
  good: 'var(--green)', warn: 'var(--amber)', bad: 'var(--red)', '': 'var(--blue)',
}

export function InsightCard({ kind, icon, title, desc }: Props) {
  return (
    <div
      className="flex gap-3 items-start rounded-card p-[14px_16px] relative overflow-hidden glow-card"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        border: '1px solid var(--glass-border)',
        borderInlineStart: `3px solid ${BORDER[kind] ?? 'var(--blue)'}`,
        boxShadow: 'var(--elev-1)',
      }}
    >
      <div className="text-xl shrink-0 mt-[1px] card-icon" aria-hidden="true">{icon}</div>
      <div className="flex-1">
        <div className="font-semibold text-[var(--text)] text-[.92rem] mb-[3px] card-value">{title}</div>
        <div className="text-[.83rem] text-[var(--text2)] leading-[1.55]">{desc}</div>
      </div>
    </div>
  )
}
