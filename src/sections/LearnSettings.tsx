import { useState, type ReactNode } from 'react'
import '@/components/obs/obs.css'
import { useAppStore } from '@/store/useAppStore'
import { useObs } from '@/hooks/useObs'
import { useOsReducedMotion } from '@/hooks/useReducedMotion'
import { testAudio } from '@/features/tts/speakDutch'
import type { ObsSettings, MotionPref, SessionLength } from '@/features/observatory/types'
import { StatusStrip } from '@/components/obs/StatusStrip'
import { BackupPanel } from '@/components/obs/settings/BackupPanel'
import { WorkspaceHead, Button, Chip } from '@/components/obs/ui'
import { IGearSix, ISpeakerHigh } from '@/components/obs/icons'

/* ── Settings ───────────────────────────────────────────────────────────────
   Language (target and interface independently), accessibility, motion,
   audio, session length, the evidence rule, demo data, backup. Options
   that are not built yet are shown disabled and labelled — never faked. */

function Radio<T extends string | number>({ name, value, options, onChange, label }: {
  name: string; value: T; label: string; onChange: (v: T) => void
  options: { v: T; label: string; note?: string; disabled?: boolean }[]
}) {
  return (
    <fieldset className="o-set-field">
      <legend className="o-label">{label}</legend>
      <div className="o-seg">
        {options.map((o) => (
          <label key={String(o.v)} title={o.note}>
            <input type="radio" name={name} checked={value === o.v} disabled={o.disabled} onChange={() => onChange(o.v)} />
            <span>{o.label}{o.disabled ? ' (غير متاح بعد)' : ''}</span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section className="o-plane" aria-labelledby={id}>
      <h2 className="o-h3" id={id} style={{ marginBottom: 12 }}>{title}</h2>
      <div className="o-stack" style={{ gap: 16 }}>{children}</div>
    </section>
  )
}

export default function LearnSettings({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const [o, update] = useObs()
  const prefs = useAppStore((s) => s.prefs)
  const theme = useAppStore((s) => s.theme)
  const toggleTheme = useAppStore((s) => s.toggleTheme)
  const saveSettings = useAppStore((s) => s.saveSettings)
  const osReduced = useOsReducedMotion()
  const [audioMsg, setAudioMsg] = useState('')
  const s = o.settings
  const set = (patch: Partial<ObsSettings>) => update((x) => ({ ...x, settings: { ...x.settings, ...patch }, updatedAt: Date.now() }))
  const setRule = (patch: Partial<ObsSettings['activeRule']>) => set({ activeRule: { ...s.activeRule, ...patch } })

  return (
    <div className="o-root">
      <div className="o-page">
        <StatusStrip />
        <WorkspaceHead kicker="INSTELLINGEN" title="الإعدادات" nl="Uw voorkeuren" lede="كل خيار هنا يُحفظ فورًا على هذا الجهاز، ويُزامَن مع حسابك إن كنت مسجّلًا." />
        <div className="o-grid-2">
          <Section id="set-lang" title="اللغة">
            <Radio name="target" label="اللغة التي تتعلّمها" value={s.targetLang} onChange={() => {}}
              options={[{ v: 'nl', label: 'الهولندية' }, { v: 'de' as 'nl', label: 'الألمانية', disabled: true }]} />
            <Radio name="ui" label="لغة الواجهة" value={s.uiLang} onChange={() => {}}
              options={[{ v: 'ar', label: 'العربية' }, { v: 'nl' as 'ar', label: 'Nederlands', disabled: true }, { v: 'en' as 'ar', label: 'English', disabled: true }]} />
            <Radio name="assist" label="الدرجة الأخيرة من المساعدة" value={s.assistLang} onChange={(v) => set({ assistLang: v })}
              options={[{ v: 'ar', label: 'شرح بالعربية' }, { v: 'none', label: 'هولندية فقط' }]} />
            <p className="o-small">اللغتان مستقلتان في البيانات؛ حاليًا المحتوى هولندي والواجهة عربية فقط.</p>
          </Section>

          <Section id="set-a11y" title="القراءة وإمكانية الوصول">
            <div className="o-set-field">
              <span className="o-label">حجم النص: {prefs.fontSize}px</span>
              <div className="o-row">
                <Button size="sm" variant="secondary" onClick={() => saveSettings({ prefs: { fontSize: Math.max(13, prefs.fontSize - 1) } })} disabled={prefs.fontSize <= 13} aria-label="A− تصغير النص">A−</Button>
                <Button size="sm" variant="secondary" onClick={() => saveSettings({ prefs: { fontSize: Math.min(19, prefs.fontSize + 1) } })} disabled={prefs.fontSize >= 19} aria-label="A+ تكبير النص">A+</Button>
              </div>
            </div>
            <Radio name="theme" label="المظهر" value={theme} onChange={(v) => { if (v !== theme) toggleTheme() }}
              options={[{ v: 'light', label: 'فاتح' }, { v: 'dark', label: 'داكن' }]} />
            <Radio name="skin" label="الهوية البصرية" value={s.skin} onChange={(v) => set({ skin: v })}
              options={[{ v: 'observatory', label: 'المرصد (الجديدة)' }, { v: 'classic', label: 'الكلاسيكية البرتقالية' }]} />
          </Section>

          <Section id="set-motion" title="الحركة">
            <Radio<MotionPref> name="motion" label="شدة الحركة" value={s.motion} onChange={(v) => set({ motion: v })}
              options={[{ v: 'system', label: 'حسب النظام' }, { v: 'reduced', label: 'مخفّفة' }, { v: 'standard', label: 'عادية' }, { v: 'expressive', label: 'معبّرة' }]} />
            {osReduced
              ? <Chip tone="warn">نظامك يطلب تقليل الحركة — نحترم ذلك مهما كان الخيار هنا.</Chip>
              : <p className="o-small">المخفّفة: تغييرات فورية أو تلاشٍ قصير. المعبّرة: عمق أكبر وتوقيت أطول قليلًا، بلا حركة مستمرة.</p>}
          </Section>

          <Section id="set-audio" title="الصوت">
            <Radio name="tts" label="محرّك النطق الهولندي" value={prefs.ttsEngine} onChange={(v) => saveSettings({ prefs: { ttsEngine: v } })}
              options={[{ v: 'auto', label: 'تلقائي' }, { v: 'online', label: 'عبر الإنترنت' }, { v: 'browser', label: 'صوت الجهاز' }]} />
            <label className="o-field">
              <span className="o-label">سرعة النطق: {prefs.rate.toFixed(2)}</span>
              <input type="range" min={0.6} max={1.3} step={0.05} value={prefs.rate} onChange={(e) => saveSettings({ prefs: { rate: Number(e.target.value) } })} />
            </label>
            <label className="o-check">
              <input type="checkbox" checked={s.audioAutoplay} onChange={(e) => set({ audioAutoplay: e.target.checked })} />
              <span>تشغيل جمل المحاور تلقائيًا في الحوارات</span>
            </label>
            <div className="o-row">
              <Button size="sm" variant="secondary" icon={ISpeakerHigh} onClick={async () => { setAudioMsg('…'); setAudioMsg(await testAudio()) }}>جرّب الصوت</Button>
              <span className="o-small" role="status">{audioMsg}</span>
            </div>
          </Section>

          <Section id="set-session" title="الجلسة والدليل">
            <Radio<SessionLength> name="len" label="مدة الجلسة اليومية (تقدير)" value={s.sessionMinutes} onChange={(v) => set({ sessionMinutes: v })}
              options={[{ v: 20, label: '20 د' }, { v: 25, label: '25 د' }, { v: 30, label: '30 د' }]} />
            <fieldset className="o-set-field">
              <legend className="o-label">قاعدة «نشِط» للتعبير</legend>
              <div className="o-rule">
                <label>استخدامات مستقلة <input className="o-input" type="number" min={1} max={10} value={s.activeRule.uses} onChange={(e) => setRule({ uses: Math.min(10, Math.max(1, Number(e.target.value) || 1)) })} /></label>
                <label>سياقات مختلفة <input className="o-input" type="number" min={1} max={5} value={s.activeRule.contexts} onChange={(e) => setRule({ contexts: Math.min(5, Math.max(1, Number(e.target.value) || 1)) })} /></label>
                <label>أيام مختلفة <input className="o-input" type="number" min={1} max={7} value={s.activeRule.days} onChange={(e) => setRule({ days: Math.min(7, Math.max(1, Number(e.target.value) || 1)) })} /></label>
              </div>
              <label className="o-check" style={{ marginTop: 8 }}>
                <input type="checkbox" checked={s.activeRule.countSelfReports} onChange={(e) => setRule({ countSelfReports: e.target.checked })} />
                <span>احسب التقارير الذاتية («استخدمتها خارج التطبيق»)</span>
              </label>
              <p className="o-small">النسخ من جملة معروضة أو التكرار الفوري لا يُحسب استخدامًا مستقلًا أبدًا.</p>
            </fieldset>
            <label className="o-check">
              <input type="checkbox" checked={s.showDemo} onChange={(e) => set({ showDemo: e.target.checked })} />
              <span>عرض بيانات تجريبية في «تعلّمي» (مُعلَّمة ومنفصلة عن تقدّمك)</span>
            </label>
          </Section>

          <Section id="set-backup" title="النسخ الاحتياطي">
            <BackupPanel />
          </Section>
        </div>

        {onOpenSettings && (
          <div className="o-plane o-plane--quiet" style={{ marginTop: 24, border: '1px solid var(--o-line)' }}>
            <strong>إعدادات أخرى</strong>
            <p className="o-small">الاسم، تاريخ الامتحان، الحساب والمزامنة السحابية، واختيار الصوت بالتفصيل.</p>
            <Button size="sm" variant="secondary" icon={IGearSix} onClick={onOpenSettings}>افتح الإعدادات العامة</Button>
          </div>
        )}
      </div>
    </div>
  )
}
