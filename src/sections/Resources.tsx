import { lazy, Suspense, useState } from 'react'
import { RESOURCE_GROUPS } from '@/data/resources'
import { EXAM_PDFS, SKILL_ICON } from '@/data/examPdfs'
import type { ExamPdfEntry } from '@/data/examPdfs'

// Code-split: react-pdf + pdf.js worker stay out of the initial bundle
const ExamPdfViewer = lazy(() =>
  import('@/components/ExamPdfViewer').then((m) => ({ default: m.ExamPdfViewer })),
)

const PdfLoader = () => (
  <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text2)', fontSize: '.9rem' }}>
    ⏳ جارٍ تحميل عارض PDF…
  </div>
)

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export default function Resources(_: {}) {
  const [activeEntry, setActiveEntry] = useState<ExamPdfEntry | null>(null)

  const openPdf = (entry: ExamPdfEntry) => {
    if (!entry.available) return
    setActiveEntry((prev) => (prev?.id === entry.id ? null : entry))
  }

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--orange)' }}>🔗</span> مصادر رسمية وعلى الإنترنت
      </h2>

      <div style={{ background: 'var(--blue-l)', border: '1px solid var(--glass-border)', borderInlineStart: '3px solid var(--blue)', borderRadius: 'var(--r-sm)', padding: '14px 18px', marginBottom: 18, fontSize: '.9rem', color: 'var(--text2)', lineHeight: 1.65 }}>
        <strong style={{ color: 'var(--text)' }}>أهم نصيحة:</strong> ملفّات الامتحانات الرسمية (Lezen / Luisteren / Schrijven / Spreken لسنوات ٢٠٢٣ و٢٠٢٤ و٢٠٢٥) محفوظة لديك في مجلّد <em>NT</em>. استخدمها كمعيار حقيقي للصعوبة بعد أن تُكمل المحاكاة هنا.
      </div>

      {/* ─── DUO PDF exam panel ─── */}
      <section aria-labelledby="pdf-heading">
        <h3 id="pdf-heading" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          📄 نماذج امتحانات DUO (PDF)
        </h3>

        <div style={{ background: 'var(--orange-l)', border: '1px solid var(--glass-border)', borderInlineStart: '3px solid var(--orange)', borderRadius: 'var(--r-sm)', padding: '12px 16px', marginBottom: 14, fontSize: '.85rem', color: 'var(--text2)', lineHeight: 1.6 }}>
          📁 انسخ ملفّات PDF الرسمية من DUO إلى مجلّد <code style={{ background: 'var(--surface3)', padding: '1px 5px', borderRadius: 4, fontFamily: 'monospace' }}>public/exams/</code> بنفس أسماء الملفّات الموضّحة أدناه لتفعيل العرض المدمج.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(200px,1fr))', gap: 10, marginBottom: 16 }}>
          {EXAM_PDFS.map((entry) => {
            const isActive = activeEntry?.id === entry.id
            const icon = SKILL_ICON[entry.skill] ?? '📋'
            return (
              <button
                key={entry.id}
                onClick={() => openPdf(entry)}
                disabled={!entry.available}
                aria-pressed={isActive}
                aria-label={`${entry.available ? 'افتح' : 'غير متوفّر:'} ${entry.title}`}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: 4,
                  padding: '12px 14px',
                  background: isActive ? 'var(--orange-l)' : 'var(--glass-bg-strong)',
                  backdropFilter: 'blur(8px)',
                  WebkitBackdropFilter: 'blur(8px)',
                  border: `1px solid ${isActive ? 'var(--orange)' : 'var(--glass-border)'}`,
                  borderRadius: 'var(--r-sm)',
                  cursor: entry.available ? 'pointer' : 'not-allowed',
                  opacity: entry.available ? 1 : 0.55,
                  textAlign: 'start',
                  fontFamily: 'inherit',
                  transition: 'border-color .15s, background .15s',
                  boxShadow: isActive ? 'var(--elev-1)' : 'none',
                }}
              >
                <span style={{ fontSize: '1.2rem' }}>{icon}</span>
                <span style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)' }}>{entry.title}</span>
                <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>
                  {entry.skillAr} — {entry.year}
                  {!entry.available && ' (غير متوفّر)'}
                </span>
                {entry.available && (
                  <span style={{ fontSize: '.72rem', color: isActive ? 'var(--orange)' : 'var(--blue)' }}>
                    {isActive ? '▲ إغلاق' : '▼ فتح'}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Inline PDF viewer (lazy-loaded) */}
        {activeEntry && (
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontSize: '.9rem', fontWeight: 600, color: 'var(--text)' }}>
                {SKILL_ICON[activeEntry.skill]} {activeEntry.title}
              </span>
              <button
                onClick={() => setActiveEntry(null)}
                aria-label="إغلاق عارض PDF"
                style={{ background: 'transparent', border: '1px solid var(--border2)', borderRadius: 8, padding: '5px 10px', cursor: 'pointer', fontSize: '.8rem', color: 'var(--text2)', fontFamily: 'inherit' }}
              >
                ✕ إغلاق
              </button>
            </div>
            <Suspense fallback={<PdfLoader />}>
              <ExamPdfViewer
                src={`/exams/${activeEntry.file}`}
                title={activeEntry.title}
              />
            </Suspense>
          </div>
        )}
      </section>

      {/* ─── Link groups ─── */}
      {RESOURCE_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: '18px 0 10px' }}>{group.title}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            {group.links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                style={{ background: 'var(--glass-bg)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)', border: '1px solid var(--glass-border)', borderRadius: 'var(--r-sm)', padding: 14, textDecoration: 'none', color: 'inherit', display: 'block', boxShadow: 'var(--elev-1)', transition: '.18s' }}
                onMouseEnter={(e) => { const a = e.currentTarget; a.style.transform = 'translateY(-4px)'; a.style.boxShadow = 'var(--elev-3)'; a.style.borderColor = 'var(--orange-m)' }}
                onMouseLeave={(e) => { const a = e.currentTarget; a.style.transform = ''; a.style.boxShadow = 'var(--elev-1)'; a.style.borderColor = 'var(--glass-border)' }}
              >
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>{link.title}</div>
                <div style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.5 }}>{link.desc}</div>
              </a>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
