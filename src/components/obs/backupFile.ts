import { useAppStore } from '@/store/useAppStore'

/** Download the whole learner state as JSON (same format the importer validates). */
export function exportBackup(): void {
  const { activeTab, ...state } = useAppStore.getState()
  void activeTab
  const data = JSON.parse(JSON.stringify({ state, version: 6 })) as unknown
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const d = new Date()
  const stamp = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  a.download = `nt2-planner-backup-${stamp}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
