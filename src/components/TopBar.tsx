import { useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { getDaysLeft } from '@/store/useAppStore'
import { AppIcon } from './AppIcon'
import { Magnetic } from './Magnetic'
import { ThemeToggle } from './themes/ThemeToggle'
import { CalendarDots, Fire, DownloadSimple, GearSix } from './icons'

interface Props {
  onOpenSettings: () => void
  onOpenProfile: () => void
  onInstall: () => void
  showInstall: boolean
  showProfile: boolean
  userEmail?: string
}

function initials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '؟'
  return (parts[0][0] + (parts[1]?.[0] ?? '')).toUpperCase()
}

export function TopBar({ onOpenSettings, onOpenProfile, onInstall, showInstall, showProfile, userEmail }: Props) {
  const name = useAppStore((s) => s.name)
  const examDate = useAppStore((s) => s.examDate)
  const streak = useAppStore((s) => s.streak)
  const prefs = useAppStore((s) => s.prefs)
  const saveSettings = useAppStore((s) => s.saveSettings)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const daysLeft = getDaysLeft(examDate)

  const changeFontSize = (delta: number) => {
    const next = Math.min(19, Math.max(13, (prefs.fontSize ?? 16) + delta))
    document.documentElement.style.setProperty('--font-size-base', `${next}px`)
    saveSettings({ prefs: { fontSize: next } })
  }

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', `${prefs.fontSize ?? 16}px`)
  }, [prefs.fontSize])

  return (
    <header
      className="app-bar sticky top-0 z-[200] flex items-center gap-1 sm:gap-3 border-b"
      style={{
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(20px) saturate(1.8)',
        WebkitBackdropFilter: 'blur(20px) saturate(1.8)',
        borderColor: 'var(--glass-border)',
        boxShadow: 'var(--elev-1), inset 0 1px 0 var(--glass-hi)',
      }}
    >
      {/* Logo */}
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); setActiveTab('dashboard') }}
        className="flex items-center gap-2 shrink-0 no-underline text-[var(--text)]"
        title="الصفحة الرئيسية"
        aria-label="الصفحة الرئيسية"
      >
        <div
          className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[var(--text-base)] font-bold shrink-0"
          style={{ background: 'var(--grad-primary)', color: 'var(--on-primary)', boxShadow: 'var(--elev-2)', border: '1px solid var(--btn-border)' }}
          aria-hidden="true"
        >NT</div>
        <div aria-hidden="true" dir="ltr" className="hidden lg:block font-display text-[var(--text-lg)] font-bold text-[var(--text)] tracking-tight leading-none">
          NT2<span style={{ color: 'var(--orange-text)' }}>·</span>Planner
        </div>
      </a>

      <div className="flex-1" />

      {/* Countdown pill — hidden on phones (same info lives in the hero + KPIs);
          also hidden in Focus Mode (decor-flourish) — motivational chrome, not core nav.
          Hidden entirely until the user has picked a date: the hero's countdown
          ring owns the "when is your exam?" question, and an em-dash pill here
          would just be chrome that asks nothing and answers nothing. */}
      {daysLeft != null && (
        <div
          className="decor-flourish hidden lg:flex items-center gap-1.5 border rounded-full px-3.5 py-[5px] text-[var(--text-xs)] text-[var(--muted)] whitespace-nowrap"
          style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(8px)', borderColor: 'var(--glass-border)' }}
          title="الأيام المتبقية حتى الامتحان"
        >
          <AppIcon icon={CalendarDots} size={15} style={{ color: 'var(--orange-text)' }} />
          {/* لون النص الأساسي يضمن ≥4.5:1 — الأيقونة البرتقالية تحمل الهوية */}
          <strong style={{ color: 'var(--text)', fontWeight: 'var(--fw-heading)' }}>{daysLeft}</strong>
          <span>يومًا للامتحان</span>
        </div>
      )}

      {/* Streak pill — hidden on phones (shown in the hero + KPIs); Focus Mode hides it too */}
      <div
        className="decor-flourish hidden lg:flex items-center gap-1.5 border rounded-full px-3.5 py-[5px] text-[var(--text-xs)] text-[var(--muted)] whitespace-nowrap"
        style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(8px)', borderColor: 'var(--glass-border)' }}
        title="عدد أيام المواظبة المتتالية"
      >
        <AppIcon icon={Fire} size={15} style={{ color: 'var(--orange-text)' }} />
        <strong style={{ color: 'var(--text)', fontWeight: 'var(--fw-heading)' }}>{streak.count}</strong>
        <span>يوم</span>
      </div>

      {/* Font size */}
      <div className="hidden sm:flex items-center gap-1">
        {/* axe: الاسم المسموع يجب أن يضم النص المرئي (A−/A+) حرفيًا */}
        <IconBtn onClick={() => changeFontSize(-1)} title="تصغير الخطّ" aria-label="A− تصغير الخطّ">A−</IconBtn>
        <IconBtn onClick={() => changeFontSize(1)} title="تكبير الخطّ" aria-label="A+ تكبير الخطّ">A+</IconBtn>
      </div>

      {/* Install button */}
      {showInstall && (
        <Magnetic>
          <button
            onClick={onInstall}
            className="btn-glass flex items-center gap-1.5 rounded-lg px-3.5 text-[var(--text-sm)] font-bold text-[var(--text)] h-9 cursor-pointer"
            style={{ boxShadow: 'var(--elev-1), inset 0 1px 0 var(--glass-hi)' }}
            aria-label="تثبيت التطبيق"
          >
            <AppIcon icon={DownloadSimple} size={16} />
            <span className="hidden sm:inline">تثبيت</span>
          </button>
        </Magnetic>
      )}

      {/* Theme + Focus Mode */}
      <ThemeToggle />

      {/* Profile — only once the auth gate has been resolved (signed in or guest) */}
      {showProfile && (
        <Magnetic>
          <button
            onClick={onOpenProfile}
            aria-label="الملف الشخصي" title={userEmail ?? (name || 'الملف الشخصي')}
            className="btn-shine icon-btn rounded-lg flex items-center justify-center text-[var(--text-xs)] font-bold cursor-pointer font-[inherit]"
            style={{ background: 'var(--grad-primary)', color: 'var(--on-primary)', border: '1px solid var(--btn-border)', boxShadow: 'var(--elev-1)' }}
          >
            {initials(name || userEmail || 'ضيف')}
          </button>
        </Magnetic>
      )}

      {/* Settings */}
      <IconBtn onClick={onOpenSettings} aria-label="الإعدادات" title="الإعدادات">
        <AppIcon icon={GearSix} size={18} />
      </IconBtn>
    </header>
  )
}

export function IconBtn({ children, onClick, title, 'aria-label': ariaLabel }: {
  children: React.ReactNode; onClick: () => void; title?: string; 'aria-label'?: string
}) {
  return (
    <Magnetic>
      <button
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
        className="btn-shine icon-btn rounded-lg flex items-center justify-center text-[var(--text-base)] text-[var(--muted)] cursor-pointer font-[inherit] transition-all hover:-translate-y-0.5"
        style={{ background: 'var(--btn-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid var(--btn-border)', boxShadow: 'var(--elev-1)' }}
      >
        {children}
      </button>
    </Magnetic>
  )
}
