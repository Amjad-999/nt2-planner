import { useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { BADGE_DEFS, TIER_ORDER, TIER_LABEL, TIER_COLOR } from '@/features/achievements/badges'

export function AchievementsPanel() {
  const unlocked = useAppStore(s => s.unlockedBadges)
  const [open, setOpen] = useState(false)

  const total = BADGE_DEFS.length
  const count = BADGE_DEFS.filter(b => unlocked.includes(b.id)).length

  return (
    <section
      aria-labelledby="ach-heading"
      style={{
        background: 'var(--glass-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--r)',
        padding: '14px 18px',
        boxShadow: 'var(--elev-1)',
      }}
    >
      {/* Header row — always visible */}
      <button
        id="ach-heading"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        aria-controls="ach-body"
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'none', border: 'none', cursor: 'pointer', padding: 0,
          fontFamily: 'inherit',
        }}
      >
        <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-md)', fontWeight: 'var(--fw-cta)', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          🏅 إنجازاتي
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <ProgressPips unlocked={count} total={total} />
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--text2)' }}>{count}/{total}</span>
          <span aria-hidden="true" style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)', transform: open ? 'rotate(180deg)' : undefined, display: 'inline-block', transition: 'transform .2s' }}>▼</span>
        </span>
      </button>

      {/* Badge grid */}
      {open && (
        <div id="ach-body" role="list" aria-label="قائمة الإنجازات"
          style={{ marginTop: 'var(--sp-3)' }}>
          {TIER_ORDER.map(tier => {
            const group = BADGE_DEFS.filter(b => b.tier === tier)
            return (
              <div key={tier} style={{ marginBottom: 'var(--sp-3)' }}>
                <div style={{ fontSize: 'var(--text-2xs)', fontWeight: 'var(--fw-cta)', color: TIER_COLOR[tier], textTransform: 'uppercase', letterSpacing: 1, marginBottom: 'var(--sp-2)' }}>
                  {TIER_LABEL[tier]}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(130px, 100%), 1fr))', gap: 'var(--sp-2)' }}>
                  {group.map(b => {
                    const earned = unlocked.includes(b.id)
                    return (
                      <div
                        key={b.id}
                        role="listitem"
                        aria-label={`${b.title} — ${earned ? 'مكتسب' : 'مقفل'}: ${b.desc}`}
                        style={{
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-1)',
                          padding: '10px 8px', borderRadius: 'var(--r-sm)', textAlign: 'center',
                          background: earned ? 'var(--orange-l)' : 'var(--surface3)',
                          border: `1px solid ${earned ? 'var(--orange-m)' : 'var(--border)'}`,
                          opacity: earned ? 1 : 0.55,
                          transition: 'opacity .2s',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{ fontSize: 'var(--glyph-md)', filter: earned ? undefined : 'grayscale(100%)' }}
                        >
                          {b.emoji}
                        </span>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-heading)', color: earned ? 'var(--text)' : 'var(--muted)', lineHeight: 'var(--lh-heading)' }}>
                          {b.title}
                        </span>
                        {earned && (
                          <span style={{ fontSize: 'var(--text-2xs)', color: 'var(--green-text)', fontWeight: 'var(--fw-heading)' }}>✓ مكتسب</span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}

function ProgressPips({ unlocked, total }: { unlocked: number; total: number }) {
  const pct = total > 0 ? unlocked / total : 0
  return (
    <div
      role="progressbar"
      aria-valuenow={unlocked}
      aria-valuemin={0}
      aria-valuemax={total}
      aria-label={`${unlocked} من ${total} إنجاز`}
      style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-0)' }}
    >
      {Array.from({ length: Math.min(8, total) }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          style={{
            width: 6, height: 6, borderRadius: 'var(--r-full)',
            background: i < Math.round(pct * Math.min(8, total))
              ? 'var(--orange)'
              : 'var(--border2)',
          }}
        />
      ))}
    </div>
  )
}
