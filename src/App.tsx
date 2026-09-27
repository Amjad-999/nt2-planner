import { useRegisterSW } from 'virtual:pwa-register/react'
import { AppShell } from '@/components/AppShell'
import { RootErrorBoundary } from '@/components/RootErrorBoundary'

export default function App() {
  // PWA registration — registerType 'autoUpdate' activates new versions
  // silently on the next visit (no blocking confirm() prompt)
  useRegisterSW()

  // Wraps everything: TabErrorBoundary only covers the active section, so a
  // throw in the top bar, the tabs, a modal or the mascot used to white-screen
  // the whole app with no way back.
  return (
    <RootErrorBoundary>
      <AppShell />
    </RootErrorBoundary>
  )
}
