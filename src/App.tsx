import { useRegisterSW } from 'virtual:pwa-register/react'
import { AppShell } from '@/components/AppShell'
import { useEffect } from 'react'

export default function App() {
  // PWA update toast
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      if (confirm('نسخة جديدة من التطبيق متاحة. هل تريد التحديث الآن؟')) {
        updateServiceWorker(true)
      }
    },
  })

  useEffect(() => { void needRefresh }, [needRefresh])

  return <AppShell />
}
