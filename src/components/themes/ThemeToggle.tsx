import { useTheme } from '@/hooks/useTheme'
import { useFocusMode } from '@/hooks/useFocusMode'
import { AppIcon } from '../AppIcon'
import { IconBtn } from '../TopBar'
import { Moon, Sun, Target } from '../icons'

/**
 * Theme + Focus Mode controls, grouped together in the TopBar.
 * There's no separate ThemeProvider/context here on purpose — theme and
 * focus-mode state already live in the Zustand store (useAppStore), synced
 * to `data-theme`/`data-focus` on <html> and persisted automatically via the
 * store's existing persist middleware (see useTheme/useFocusMode). Adding a
 * parallel React Context would just be a second source of truth.
 */
export function ThemeToggle() {
  const { toggleTheme, isDark } = useTheme()
  const { focusMode, toggleFocusMode } = useFocusMode()

  return (
    <>
      <IconBtn
        onClick={toggleFocusMode}
        aria-label="وضع التركيز"
        pressed={focusMode}
        title={focusMode ? 'إيقاف وضع التركيز' : 'تفعيل وضع التركيز — واجهة أبسط بلا تشتيت'}
      >
        {/* A control, so it is an icon in the control colour — the old yoga emoji
            could not take `color`, and was dimmed with opacity to fake "off". */}
        <span style={{ color: focusMode ? 'var(--orange-text)' : undefined }}><AppIcon icon={Target} size={18} /></span>
      </IconBtn>

      <IconBtn onClick={toggleTheme} aria-label="تبديل المظهر" title={isDark ? 'الوضع الفاتح' : 'الوضع الداكن'}>
        <AppIcon icon={isDark ? Sun : Moon} size={18} />
      </IconBtn>
    </>
  )
}
