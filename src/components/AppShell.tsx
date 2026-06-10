import { useState, useEffect, lazy, Suspense } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useAppStore } from '@/store/useAppStore'
import { TopBar } from './TopBar'
import { NavTabs } from './NavTabs'
import { SettingsModal } from './SettingsModal'
import { OnboardModal } from './OnboardModal'
import { StudyTimeModal } from './StudyTimeModal'
import { useBadgeCheck } from '@/hooks/useBadgeCheck'

const Dashboard  = lazy(() => import('@/sections/Dashboard'))
const Plan       = lazy(() => import('@/sections/Plan'))
const Vocab      = lazy(() => import('@/sections/Vocab'))
const Books      = lazy(() => import('@/sections/Books'))
const Exam       = lazy(() => import('@/sections/Exam'))
const Exercises  = lazy(() => import('@/sections/Exercises'))
const Grammar    = lazy(() => import('@/sections/Grammar'))
const Stats      = lazy(() => import('@/sections/Stats'))
const Resources  = lazy(() => import('@/sections/Resources'))
const Platform   = lazy(() => import('@/sections/Platform'))

const SECTION_MAP = {
  dashboard: Dashboard, plan: Plan, vocab: Vocab, books: Books,
  exam: Exam, exercises: Exercises, grammar: Grammar, stats: Stats, resources: Resources, platform: Platform,
} as const

const SectionLoader = () => (
  <div className="flex items-center justify-center py-20 text-[var(--muted)]">جاري التحميل…</div>
)

export function AppShell() {
  const activeTab = useAppStore((s) => s.activeTab)
  const onboarded = useAppStore((s) => s.onboarded)

  const [showSettings, setShowSettings] = useState(false)
  const [showOnboard, setShowOnboard] = useState(false)
  const [showStudyTime, setShowStudyTime] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredInstall, setDeferredInstall] = useState<any>(null)

  useBadgeCheck()

  // Show onboarding on first load
  useEffect(() => { if (!onboarded) setTimeout(() => setShowOnboard(true), 300) }, [onboarded])

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredInstall(e); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setShowInstall(false))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = () => {
    if (deferredInstall) {
      deferredInstall.prompt()
      deferredInstall.userChoice.then((ch: { outcome: string }) => {
        if (ch.outcome === 'accepted') setShowInstall(false)
      })
    } else {
      alert('للتثبيت على iPhone/iPad:\n1. اضغط زرّ المشاركة في Safari ⬆️\n2. اختر "أضف إلى الشاشة الرئيسية"\n\nعلى Android Chrome: قائمة ⋮ ← "تثبيت التطبيق".')
    }
  }

  const ActiveSection = SECTION_MAP[activeTab] ?? Dashboard

  return (
    <div className="min-h-dvh flex flex-col">
      <TopBar
        onOpenSettings={() => setShowSettings(true)}
        onInstall={handleInstall}
        showInstall={showInstall}
      />
      <NavTabs />

      <main
        id={`tab-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`ntab-${activeTab}`}
        tabIndex={-1}
        className="flex-1 focus:outline-none"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.22, ease: [0.2, 0.7, 0.2, 1] }}
          >
            <Suspense fallback={<SectionLoader />}>
              <ActiveSection onOpenStudyTime={() => setShowStudyTime(true)} />
            </Suspense>
          </motion.div>
        </AnimatePresence>
      </main>

      {showSettings  && <SettingsModal onClose={() => setShowSettings(false)} />}
      {showOnboard   && <OnboardModal onClose={() => setShowOnboard(false)} />}
      {showStudyTime && <StudyTimeModal onClose={() => setShowStudyTime(false)} />}
    </div>
  )
}
