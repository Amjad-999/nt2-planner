import { useRef, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { validateBackup, BACKUP_PROBLEM_AR, type BackupSummary } from '@/features/observatory/backup'
import { exportBackup } from '../backupFile'
import { Button, Notice } from '../ui'
import { IDownloadSimple, IUploadSimple, IArrowCounterClockwise, IShieldCheck } from '../icons'

/* Backup and restore, safely: export everything as JSON; import runs the
   validator FIRST and shows what the file contains before anything is
   replaced. An invalid file is rejected with a specific reason and the
   current data is untouched. A successful import can be undone. */

type Pending = { raw: string; name: string; summary: BackupSummary }

export function BackupPanel() {
  const importData = useAppStore((s) => s.importData)
  const undoImport = useAppStore((s) => s.undoImport)
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [error, setError] = useState('')
  const [done, setDone] = useState<'' | 'imported' | 'undone' | 'failed'>('')

  const pick = (f: File | undefined) => {
    setError(''); setDone(''); setPending(null)
    if (!f) return
    const r = new FileReader()
    r.onload = () => {
      const raw = String(r.result ?? '')
      const check = validateBackup(raw)
      if (!check.ok) { setError(BACKUP_PROBLEM_AR[check.problem]); return }
      setPending({ raw, name: f.name, summary: check.summary })
    }
    r.onerror = () => setError('تعذّرت قراءة الملف.')
    r.readAsText(f)
    if (input.current) input.current.value = ''
  }

  const confirm = () => {
    if (!pending) return
    const ok = importData(pending.raw)
    setPending(null)
    setDone(ok ? 'imported' : 'failed')
  }

  return (
    <div className="o-stack" style={{ gap: 12 }}>
      <p className="o-small">النسخة تشمل كل شيء: الجلسات، الأدلة، الملاحظات، الإعدادات، والكلمات. التسجيلات الصوتية لا تُضمَّن (تبقى على هذا الجهاز).</p>
      <div className="o-row">
        <Button variant="secondary" icon={IDownloadSimple} onClick={exportBackup}>نزّل نسخة احتياطية (JSON)</Button>
        <Button variant="secondary" icon={IUploadSimple} onClick={() => input.current?.click()}>استعد من ملف…</Button>
        <input ref={input} type="file" accept="application/json,.json" hidden onChange={(e) => pick(e.target.files?.[0])} aria-label="اختر ملف النسخة الاحتياطية" data-testid="backup-file" />
      </div>

      {error && <Notice tone="error" live="assertive" title="لم يُستورد شيء.">{error} بياناتك الحالية لم تتغيّر.</Notice>}

      {pending && (
        <div className="o-plane o-plane--raised" role="group" aria-labelledby="import-title">
          <h3 className="o-h3 o-row" id="import-title" style={{ gap: 8 }}><IShieldCheck size={20} />الملف صالح: {pending.name}</h3>
          <ul className="o-small" style={{ margin: '8px 0', paddingInlineStart: 18, lineHeight: 1.9 }}>
            <li>{pending.summary.sessions} جلسات · {pending.summary.expressions} تعابير · {pending.summary.notes} ملاحظات</li>
            <li>{pending.summary.vocab} كلمة في قائمة المفردات · {pending.summary.days} يومًا من السجل اليومي</li>
            {pending.summary.savedAt > 0 && <li>حُفظت في: {new Date(pending.summary.savedAt).toLocaleString('ar-u-nu-latn')}</li>}
          </ul>
          <Notice tone="warn" title="سيحلّ هذا محلّ بياناتك الحالية.">يمكنك التراجع مباشرة بعد الاستيراد.</Notice>
          <div className="o-row" style={{ marginTop: 10 }}>
            <Button variant="primary" onClick={confirm}>استبدل بياناتي بهذا الملف</Button>
            <Button variant="ghost" onClick={() => setPending(null)}>إلغاء</Button>
          </div>
        </div>
      )}

      {done === 'imported' && (
        <Notice tone="success" live="polite" title="تمّ الاستيراد."
          actions={<Button size="sm" variant="secondary" icon={IArrowCounterClockwise} onClick={() => setDone(undoImport() ? 'undone' : 'failed')}>تراجع عن الاستيراد</Button>}>
          إن كان هذا ملفًا خاطئًا فبياناتك السابقة ما زالت محفوظة للتراجع.
        </Notice>
      )}
      {done === 'undone' && <Notice tone="success" live="polite" title="أُعيدت بياناتك السابقة." />}
      {done === 'failed' && <Notice tone="error" live="assertive" title="لم تنجح العملية.">بياناتك الحالية لم تتغيّر.</Notice>}
    </div>
  )
}
