import { useState, useEffect, lazy, Suspense } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { TopBar } from './TopBar'
import { NavTabs } from './NavTabs'
import { TabErrorBoundary } from './TabErrorBoundary'
import { ToastHost } from './Toast'

/* النوافذ لا تُعرض قبل نقرة المستخدم — لا مبرر لوجودها (ومعها CloudPanel)
   في حزمة الإقلاع */
const SettingsModal  = lazy(() => import('./SettingsModal').then((m) => ({ default: m.SettingsModal })))
const OnboardModal   = lazy(() => import('./OnboardModal').then((m) => ({ default: m.OnboardModal })))
const StudyTimeModal = lazy(() => import('./StudyTimeModal').then((m) => ({ default: m.StudyTimeModal })))
import { useBadgeCheck } from '@/hooks/useBadgeCheck'
import { useCloud } from '@/features/cloud/cloudStore'

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

/* P6: هيكل عظمي زجاجي مع لمعان shimmer بدل نص التحميل الفارغ */
const SectionLoader = () => (
  <div style={{ padding: '24px 28px 60px', maxWidth: 1100, margin: '0 auto' }} aria-busy="true" aria-label="جاري التحميل">
    {/* يطابق ارتفاع قسم البطل (minHeight 280) فلا ينزاح المحتوى عند التبديل */}
    <div className="skel" style={{ height: 280, borderRadius: 'var(--r)', marginBottom: 16 }} />
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(165px,1fr))', gap: 12, marginBottom: 16 }}>
      {[0, 1, 2, 3].map((i) => <div key={i} className="skel" style={{ height: 96, borderRadius: 'var(--r)' }} />)}
    </div>
    <div className="skel" style={{ height: 220, borderRadius: 'var(--r)' }} />
  </div>
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

  // Signed-in users sync from app start — not only after opening Settings.
  // The sb-*-auth-token key exists only after a login, so guests never pay
  // for the supabase-js chunk.
  useEffect(() => {
    try {
      if (Object.keys(localStorage).some((k) => k.startsWith('sb-') && k.endsWith('-auth-token')))
        useCloud.getState().init()
    } catch { /* storage blocked — CloudPanel still calls init() on open */ }
  }, [])

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
        {/* key يعيد التركيب عند تبديل التبويب فتعمل حركة الدخول CSS
            (fade + انزلاق .3s) — بلا framer في مسار الإقلاع */}
        <div key={activeTab} className="tab-in">
          <TabErrorBoundary tabKey={activeTab}>
            <Suspense fallback={<SectionLoader />}>
              <ActiveSection onOpenStudyTime={() => setShowStudyTime(true)} />
            </Suspense>
          </TabErrorBoundary>
        </div>
      </main>

      <ToastHost />
      <Suspense fallback={null}>
        {showSettings  && <SettingsModal onClose={() => setShowSettings(false)} />}
        {showOnboard   && <OnboardModal onClose={() => setShowOnboard(false)} />}
        {showStudyTime && <StudyTimeModal onClose={() => setShowStudyTime(false)} />}
      </Suspense>
    </div>
  )
}
