import { useCloud } from '@/features/cloud/cloudStore'
import { useAppStore } from '@/store/useAppStore'

/**
 * Single entry point for auth state/actions — composes the existing
 * Supabase-backed cloud store (useCloud: real sign-in/sign-up/OAuth/session)
 * with the app store's guestMode flag (the "continue without account" choice).
 * There's no separate auth state machine here on purpose; see the comment
 * atop ThemeToggle.tsx for the same reasoning applied to theme/focus-mode.
 */
export function useAuth() {
  const {
    configured, user, status, message, sessionChecked,
    signInEmail, signUpEmail, signInGoogle, signInMagicLink, signOut,
  } = useCloud()
  const guestMode = useAppStore((s) => s.guestMode)
  const setGuestMode = useAppStore((s) => s.setGuestMode)

  return {
    configured,        // cloud/auth backend reachable at all (env vars set)
    user,              // signed-in Supabase user, or null
    isAuthenticated: !!user,
    guestMode,         // explicitly chose "continue without account"
    // Resolved = we know what to show: either cloud isn't configured (no
    // gate possible), or the initial session check finished.
    resolved: !configured || sessionChecked,
    status,
    message,
    signInEmail,
    signUpEmail,
    signInGoogle,
    signInMagicLink,
    signOut,
    continueAsGuest: setGuestMode,
  }
}
