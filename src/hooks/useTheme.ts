import { useAppStore } from '@/store/useAppStore'

export function useTheme() {
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  return { theme, toggleTheme, isDark: theme === 'dark' }
}
