import { lazy, Suspense, useState } from 'react'
import { motion } from 'framer-motion'
import { useAuth } from '@/hooks/useAuth'
import { AppIcon } from '@/components/AppIcon'
import { CloudArrowUp, SignOut } from '@/components/icons'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { pressSpring, pressTransition, springCard } from '@/lib/animations'

/* The sign-in dialog is a click away, never part of the landing chunk. */
const AuthModal = lazy(() => import('./AuthModal').then((m) => ({ default: m.AuthModal })))

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

/* Minimum 44px on every interactive element (WCAG 2.5.5 / iOS HIG) — this row
   is the first thing a thumb reaches on the landing view. */
const TOUCH = 44

/**
 * Auth entry point for the landing view. Deliberately NOT hidden inside
 * settings: signing in is what makes progress survive a lost phone, so it
 * sits at the very top of the dashboard where a signed-out user cannot
 * miss it. Renders nothing when no cloud backend is configured — offering
 * "sync" that cannot work would be a lie, not a feature.
 */
export function AuthBar() {
  const { configured, isAuthenticated, user, signOut, status } = useAuth()
  const reduced = useReducedMotion()
  const [showAuth, setShowAuth] = useState(false)

  if (!configured) return null

  const displayName =
    user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? user?.email ?? 'حسابي'
  const avatarUrl = user?.user_metadata?.avatar_url ?? user?.user_metadata?.picture

  const syncLabel =
    status === 'syncing' ? 'جارٍ المزامنة…' : status === 'error' ? 'تعذّرت المزامنة' : 'محفوظ في السحابة'
  /* Every colour-coded state carries an icon of its own (critical rule 1) —
     colour alone never conveys the sync state. */
  const syncIcon = status === 'syncing' ? '⟳' : status === 'error' ? '⚠️' : '✓'
  const syncColor =
    status === 'error' ? 'var(--red)' : status === 'syncing' ? 'var(--amber)' : 'var(--green)'

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springCard}
      style={{
        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
        flexWrap: 'wrap', marginBottom: 'var(--sp-3)', minHeight: TOUCH,
      }}
    >
      {isAuthenticated ? (
        <>
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', minHeight: TOUCH,
              padding: '5px 14px 5px 5px', borderRadius: 'var(--r-pill)', minWidth: 0,
              background: 'var(--surface)', border: '1px solid var(--glass-border)',
              boxShadow: 'var(--elev-1)',
            }}
          >
            {avatarUrl ? (
              <img
                src={avatarUrl} alt="" width={34} height={34}
                style={{ borderRadius: 'var(--r-full)', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <span
                aria-hidden="true"
                style={{
                  width: 34, height: 34, borderRadius: 'var(--r-full)', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'var(--grad-primary)', color: 'var(--on-primary)',
                  fontSize: 'var(--text-xs)', fontWeight: 'var(--fw-cta)',
                }}
              >
                {initials(displayName)}
              </span>
            )}
            <span style={{ minWidth: 0 }}>
              <span
                style={{
                  display: 'block', fontSize: 'var(--text-sm)', fontWeight: 'var(--fw-heading)', color: 'var(--text)',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180,
                }}
              >
                {displayName}
              </span>
              <span style={{ display: 'block', fontSize: 'var(--text-2xs)', color: syncColor }}>
                <span aria-hidden="true">{syncIcon}</span> {syncLabel}
              </span>
            </span>
          </div>

          <motion.button
            type="button"
            onClick={() => signOut()}
            whileTap={reduced ? undefined : pressSpring}
            transition={pressTransition}
            aria-label="تسجيل الخروج من الحساب"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
              minHeight: TOUCH, padding: '0 14px', borderRadius: 'var(--r-pill)',
              background: 'var(--btn-bg)', border: '1px solid var(--btn-border)',
              color: 'var(--text2)', fontFamily: 'inherit', fontSize: 'var(--text-sm)',
              fontWeight: 'var(--fw-heading)', cursor: 'pointer',
            }}
          >
            <AppIcon icon={SignOut} size={17} flipOnRtl />
            خروج
          </motion.button>
        </>
      ) : (
        <>
          <motion.button
            type="button"
            onClick={() => setShowAuth(true)}
            whileTap={reduced ? undefined : pressSpring}
            transition={pressTransition}
            aria-haspopup="dialog"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)',
              minHeight: TOUCH, padding: '0 18px', borderRadius: 'var(--r-pill)',
              background: 'var(--btn-bg)', border: '1px solid var(--btn-border)',
              color: 'var(--text)', fontFamily: 'inherit', fontSize: 'var(--text-sm)',
              fontWeight: 'var(--fw-cta)', cursor: 'pointer', boxShadow: 'var(--elev-1)',
            }}
          >
            <AppIcon icon={CloudArrowUp} size={19} style={{ color: 'var(--orange-text)' }} />
            زامن تقدّمك
          </motion.button>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--muted)' }}>
            بياناتك محفوظة على هذا الجهاز فقط.
          </span>
        </>
      )}

      <Suspense fallback={null}>
        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </Suspense>
    </motion.div>
  )
}
