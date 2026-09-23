import { useOnline, useSaveHealth } from '@/hooks/useObs'
import { useAppStore } from '@/store/useAppStore'
import { Notice, Button } from './ui'
import { IArrowsClockwise, IDownloadSimple } from './icons'
import { exportBackup } from './backupFile'

/* Two honest signals shown at the top of every workspace, only when true:
   • offline — everything local still works; generated online speech doesn't
   • save failed — the last change is in memory but not on disk; offer a
     retry and a way to get the data out right now */

export function StatusStrip() {
  const online = useOnline()
  const saved = useSaveHealth()
  const save = useAppStore((s) => s.save)
  if (online && saved) return null
  return (
    <div className="o-status">
      {!saved && (
        <Notice tone="error" live="assertive" title="لم يُحفظ آخر تغيير على هذا الجهاز."
          actions={<>
            <Button size="sm" variant="secondary" icon={IArrowsClockwise} onClick={() => save()}>حاول الحفظ مجددًا</Button>
            <Button size="sm" variant="secondary" icon={IDownloadSimple} onClick={exportBackup}>نزّل نسخة احتياطية الآن</Button>
          </>}>
          مساحة التخزين ممتلئة أو محجوبة (مثل التصفّح الخاص). عملك ما زال مفتوحًا هنا ولن يضيع ما دامت الصفحة مفتوحة.
        </Notice>
      )}
      {!online && (
        <Notice tone="offline" live="polite" title="أنت غير متصل.">
          الدروس والكلمات والتسجيلات تعمل محليًا. الصوت المولَّد عبر الإنترنت غير متاح؛ يُستخدم صوت جهازك الهولندي إن وُجد.
        </Notice>
      )}
    </div>
  )
}
