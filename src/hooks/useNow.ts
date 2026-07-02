import { useState } from 'react'

/**
 * Timestamp (epoch ms) captured once at component mount.
 * Render-safe replacement for calling Date.now() during render
 * (react-hooks/purity). Sections remount on every tab switch,
 * so the snapshot is fresh whenever the user navigates.
 */
export function useNow(): number {
  const [now] = useState(() => Date.now())
  return now
}
