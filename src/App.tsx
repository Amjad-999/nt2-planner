import { useRegisterSW } from 'virtual:pwa-register/react'
import { AppShell } from '@/components/AppShell'

export default function App() {
  // PWA registration — registerType 'autoUpdate' activates new versions
  // silently on the next visit (no blocking confirm() prompt)
  useRegisterSW()

  return <AppShell />
}
