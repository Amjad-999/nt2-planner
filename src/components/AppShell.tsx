import { useState, useEffect, lazy, Suspense } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useAuth } from '@/hooks/useAuth'
import { TopBar } from './TopBar'
import { NavTabs } from './NavTabs'
import { TabErrorBoundary } from './TabErrorBoundary'
import { ToastHost } from './Toast'

/* النوافذ لا تُعرض قبل نقرة المستخدم — لا مبرر لوجودها (ومعها CloudPanel)
   في حزمة الإقلاع */
const SettingsModal  = lazy(() => import('./SettingsModal').then((m) => ({ default: m.SettingsModal })))
const OnboardModal   = lazy(() => import('./OnboardModal').then((m) => ({ default: m.OnboardModal })))
const StudyTimeModal = lazy(() => import('./StudyTimeModal').then((m) => ({ default: m.StudyTimeModal })))
const AuthModal      = lazy(() => import('./auth/AuthModal').then((m) => ({ default: m.AuthModal })))
const UserProfile    = lazy(() => import('./auth/UserProfile').then((m) => ({ default: m.UserProfile })))
const Mascot         = lazy(() => import('./mascot/Mascot').then((m) => ({ default: m.Mascot })))
import { useBadgeCheck } from '@/hooks/useBadgeCheck'
import { useCloud } from '@/features/cloud/cloudStore'
import { cloudConfigured } from '@/lib/supabase'

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

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

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
  const { isAuthenticated, guestMode, resolved, user } = useAuth()

  const [showSettings, setShowSettings] = useState(false)
  const [showOnboard, setShowOnboard] = useState(false)
  const [showStudyTime, setShowStudyTime] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [showInstall, setShowInstall] = useState(false)
  const [deferredInstall, setDeferredInstall] = useState<BeforeInstallPromptEvent | null>(null)

  useBadgeCheck()

  // First-run auth gate: must resolve (signed in, or explicit "continue as
  // guest") before onboarding. `resolved` is false only for the brief window
  // where a configured backend's session check hasn't returned yet — during
  // that window we show neither the gate nor onboarding, to avoid a flash of
  // one before the other.
  const needsAuthGate = cloudConfigured() && resolved && !isAuthenticated && !guestMode

  // Show onboarding on first load — deferred behind the auth gate above.
  useEffect(() => {
    if (needsAuthGate || !resolved) return
    if (!onboarded) setTimeout(() => setShowOnboard(true), 300)
  }, [onboarded, needsAuthGate, resolved])

  // Previously this only ran for *returning* signed-in users (detected via a
  // leftover sb-*-auth-token key), so brand-new guests never paid for the
  // supabase-js chunk. Task 5's mandatory first-run auth gate needs to know
  // the session state for EVERY visitor before deciding what to show them —
  // there's no way to offer a working "sign in with Google" screen without
  // the auth client loaded, so that optimization no longer applies once
  // cloud is configured. It's still skipped entirely when cloud isn't
  // configured (local dev without .env, or a deploy that opts out).
  useEffect(() => {
    if (cloudConfigured()) useCloud.getState().init()
  }, [])

  // PWA install prompt
  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredInstall(e as BeforeInstallPromptEvent); setShowInstall(true) }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => setShowInstall(false))
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = () => {
    if (deferredInstall) {
      deferredInstall.prompt()
      deferredInstall.userChoice.then((ch) => {
        if (ch.outcome === 'accepted') setShowInstall(false)
      })
    } else {
      alert('للتثبيت على iPhone/iPad:\n1. اضغط زرّ المشاركة في Safari ⬆️\n2. اختر "أضف إلى الشاشة الرئيسية"\n\nعلى Android Chrome: قائمة ⋮ ← "تثبيت التطبيق".')
    }
  }

  const ActiveSection = SECTION_MAP[activeTab] ?? Dashboard

  return (
    <div className="min-h-dvh flex flex-col">
      {/* رابط تخطٍّ لأول عنصر قابل للتركيز — يقفز فوق الشريط والتبويبات
          مباشرةً إلى المحتوى (مخفيّ حتى يُركَّز عليه بلوحة المفاتيح) */}
      <a href="#main-content" className="skip-link">تخطَّ إلى المحتوى</a>
      <TopBar
        onOpenSettings={() => setShowSettings(true)}
        onOpenProfile={() => setShowProfile(true)}
        onInstall={handleInstall}
        showInstall={showInstall}
        showProfile={isAuthenticated || guestMode}
        userEmail={user?.email}
      />
      <NavTabs />

      {/* <main> يحمل معلم landmark للصفحة؛ لوحة التبويب (role=tabpanel) بداخله
          فيبقى الاثنان معًا (كان الدور tabpanel يلغي معلم main سابقًا) */}
      <main id="main-content" tabIndex={-1} className="flex-1 focus:outline-none">
        {/* key يعيد التركيب عند تبديل التبويب فتعمل حركة الدخول CSS
            (fade + انزلاق .3s) — بلا framer في مسار الإقلاع */}
        <div
          key={activeTab}
          id={`tab-${activeTab}`}
          role="tabpanel"
          aria-labelledby={`ntab-${activeTab}`}
          className="tab-in"
        >
          <TabErrorBoundary tabKey={activeTab}>
            <Suspense fallback={<SectionLoader />}>
              <ActiveSection onOpenStudyTime={() => setShowStudyTime(true)} />
            </Suspense>
          </TabErrorBoundary>
        </div>
      </main>

      <ToastHost />
      {/* Not shown during the first-run auth gate / onboarding — it would just
          be clutter competing with a modal the user must resolve first. */}
      {!needsAuthGate && onboarded && (
        <Suspense fallback={null}>
          <Mascot />
        </Suspense>
      )}
      <Suspense fallback={null}>
        {needsAuthGate && <AuthModal />}
        {showSettings  && <SettingsModal onClose={() => setShowSettings(false)} />}
        {showOnboard   && <OnboardModal onClose={() => setShowOnboard(false)} />}
        {showStudyTime && <StudyTimeModal onClose={() => setShowStudyTime(false)} />}
        {showProfile   && <UserProfile onClose={() => setShowProfile(false)} />}
      </Suspense>
    </div>
  )
}
