import { useAppStore } from '@/store/useAppStore'

export function useFocusMode() {
  const focusMode = useAppStore((s) => s.focusMode)
  const toggleFocusMode = useAppStore((s) => s.toggleFocusMode)
  return { focusMode, toggleFocusMode }
}
