import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { getDaysLeft } from '@/store/useAppStore'
import { useTheme } from '@/hooks/useTheme'
import { AppIcon } from './AppIcon'
import { CalendarDots, Fire, DownloadSimple, Moon, Sun, GearSix } from '@phosphor-icons/react'

interface Props {
  onOpenSettings: () => void
  onInstall: () => void
  showInstall: boolean
}

export function TopBar({ onOpenSettings, onInstall, showInstall }: Props) {
  const { toggleTheme, isDark } = useTheme()
  const examDate = useAppStore((s) => s.examDate)
  const streak = useAppStore((s) => s.streak)
  const prefs = useAppStore((s) => s.prefs)
  const saveSettings = useAppStore((s) => s.saveSettings)
  const setActiveTab = useAppStore((s) => s.setActiveTab)
  const daysLeft = getDaysLeft(examDate)

  const [fontSize, setFontSize] = useState(prefs.fontSize ?? 15)

  const changeFontSize = (delta: number) => {
    const next = Math.min(19, Math.max(13, fontSize + delta))
    setFontSize(next)
    document.documentElement.style.setProperty('--font-size-base', `${next}px`)
    saveSettings({ prefs: { fontSize: next } })
  }

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size-base', `${prefs.fontSize ?? 15}px`)
  }, [prefs.fontSize])

  return (
    <header
      className="sticky top-0 z-[200] flex items-center gap-3 px-7 h-[62px] border-b"
      style={{
        background: 'var(--topbar-bg)',
        backdropFilter: 'blur(22px) saturate(1.6)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.6)',
        borderColor: 'var(--glass-border)',
        boxShadow: 'var(--elev-1), inset 0 1px 0 var(--glass-hi)',
      }}
    >
      {/* Logo */}
      <a
        href="#"
        onClick={(e) => { e.preventDefault(); setActiveTab('dashboard') }}
        className="flex items-center gap-2 shrink-0 no-underline text-[var(--text)]"
        aria-label="الصفحة الرئيسية"
      >
        <div
          className="w-[34px] h-[34px] rounded-lg flex items-center justify-center text-[1rem] text-white font-bold shrink-0"
          style={{ background: 'var(--grad-primary)', boxShadow: 'var(--elev-2), inset 0 1px 0 rgba(255,255,255,.5)', border: '1px solid rgba(255,255,255,.18)' }}
          aria-hidden="true"
        >NT</div>
        <div className="font-display text-[1.25rem] font-bold text-[var(--text)] tracking-tight leading-none">
          NT2<span style={{ color: 'var(--orange)' }}>·</span>Planner
        </div>
      </a>

      <div className="flex-1" />

      {/* Countdown pill */}
      <div
        className="flex items-center gap-1.5 border rounded-full px-3.5 py-[5px] text-[.8rem] text-[var(--muted)] whitespace-nowrap"
        style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(8px)', borderColor: 'var(--glass-border)' }}
        title="الأيام المتبقية حتى الامتحان"
      >
        <AppIcon icon={CalendarDots} size={15} style={{ color: 'var(--orange)' }} />
        <strong style={{ color: 'var(--orange)', fontWeight: 600 }}>
          {daysLeft == null ? '—' : daysLeft}
        </strong>
        <span>يومًا للامتحان</span>
      </div>

      {/* Streak pill */}
      <div
        className="flex items-center gap-1.5 border rounded-full px-3.5 py-[5px] text-[.8rem] text-[var(--muted)] whitespace-nowrap"
        style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(8px)', borderColor: 'var(--glass-border)' }}
        title="عدد أيام المواظبة المتتالية"
      >
        <AppIcon icon={Fire} size={15} style={{ color: 'var(--orange)' }} />
        <strong style={{ color: 'var(--orange)', fontWeight: 600 }}>{streak.count}</strong>
        <span>يوم</span>
      </div>

      {/* Font size */}
      <div className="flex items-center gap-1">
        <IconBtn onClick={() => changeFontSize(-1)} title="تصغير الخطّ" aria-label="تصغير الخطّ">A−</IconBtn>
        <IconBtn onClick={() => changeFontSize(1)} title="تكبير الخطّ" aria-label="تكبير الخطّ">A+</IconBtn>
      </div>

      {/* Install button */}
      {showInstall && (
        <button
          onClick={onInstall}
          className="flex items-center gap-1.5 rounded-lg border-0 px-3.5 text-[.82rem] font-semibold text-white h-9 cursor-pointer"
          style={{ background: 'var(--grad-primary)', boxShadow: 'var(--elev-2), inset 0 1px 0 rgba(255,255,255,.4)' }}
          aria-label="تثبيت التطبيق"
        >
          <AppIcon icon={DownloadSimple} size={16} />
          تثبيت
        </button>
      )}

      {/* Theme toggle */}
      <IconBtn onClick={toggleTheme} aria-label="تبديل المظهر" title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}>
        <AppIcon icon={isDark ? Sun : Moon} size={18} />
      </IconBtn>

      {/* Settings */}
      <IconBtn onClick={onOpenSettings} aria-label="الإعدادات" title="الإعدادات">
        <AppIcon icon={GearSix} size={18} />
      </IconBtn>
    </header>
  )
}

function IconBtn({ children, onClick, title, 'aria-label': ariaLabel }: {
  children: React.ReactNode; onClick: () => void; title?: string; 'aria-label'?: string
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={ariaLabel}
      className="w-9 h-9 rounded-lg flex items-center justify-center text-[1rem] text-[var(--muted)] cursor-pointer font-[inherit] transition-all hover:-translate-y-0.5"
      style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(8px)', border: '1px solid var(--glass-border)', boxShadow: 'var(--elev-1)' }}
    >
      {children}
    </button>
  )
}
