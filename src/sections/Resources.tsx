import { useEffect, useRef, useState } from 'react'
import { ExamPdfViewer } from '@/components/ExamPdfViewer'
import { RESOURCE_GROUPS } from '@/data/resources'
import type { ResourceLink } from '@/data/resources'
import { EXAMS, SKILL_ICON } from '@/data/examPdfs'
import type { ExamEntry } from '@/data/examPdfs'
import { EXAM_AUDIO } from '@/data/examAudio'
import type { AudioTrack } from '@/data/examAudio'

// Check which files actually exist on the server (HEAD request)
async function checkAvail(filename: string): Promise<boolean> {
  try {
    const r = await fetch(`/exams/${filename}`, { method: 'HEAD' })
    return r.ok
  } catch {
    return false
  }
}

type ModalState = { src: string; title: string } | null

function PdfModal({ state, onClose }: { state: ModalState; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!state) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [state, onClose])

  if (!state) return null

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,.65)', backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div style={{
        background: 'var(--surface2)', borderRadius: 'var(--r)',
        border: '1px solid var(--glass-border)', boxShadow: 'var(--elev-3)',
        width: '100%', maxWidth: 860, height: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
      }}>
        {/* Modal header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 16px', borderBottom: '1px solid var(--glass-border)',
          gap: 12,
        }}>
          <span style={{ fontWeight: 600, fontSize: '.9rem', color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {state.title}
          </span>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <a
              href={state.src}
              target="_blank"
              rel="noopener noreferrer"
              style={{ fontSize: '.8rem', padding: '5px 12px', borderRadius: 8, border: '1px solid var(--blue)', color: 'var(--blue)', background: 'transparent', textDecoration: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              ↗ فتح في نافذة جديدة
            </a>
            <a
              href={state.src}
              download
              style={{ fontSize: '.8rem', padding: '5px 12px', borderRadius: 8, border: '1px solid var(--green, #4caf50)', color: 'var(--green, #4caf50)', background: 'transparent', textDecoration: 'none', fontFamily: 'inherit', cursor: 'pointer' }}
            >
              ⬇ تنزيل
            </a>
            <button
              onClick={onClose}
              style={{ fontSize: '.8rem', padding: '5px 10px', borderRadius: 8, border: '1px solid var(--border2)', color: 'var(--text2)', background: 'transparent', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              ✕
            </button>
          </div>
        </div>
        {/* In-app viewer (react-pdf renders pages to canvas) — mobile
            browsers can't display PDFs inside an <iframe> at all */}
        <div style={{ flex: 1, overflow: 'auto', minHeight: 0, padding: 8 }}>
          <ExamPdfViewer src={state.src} title={state.title} />
        </div>
      </div>
    </div>
  )
}

export default function Resources() {
  // avail[filename] = true|false|undefined (undefined = still checking)
  const [avail, setAvail] = useState<Record<string, boolean | undefined>>({})
  const [modal, setModal] = useState<ModalState>(null)
  const [audioOpen, setAudioOpen] = useState<Set<string>>(new Set())

  const toggleAudio = (examId: string) =>
    setAudioOpen(prev => {
      const next = new Set(prev)
      if (next.has(examId)) { next.delete(examId) } else { next.add(examId) }
      return next
    })

  useEffect(() => {
    const allFiles = EXAMS.flatMap(e => [e.opgaven, e.antwoorden])
    allFiles.forEach(async (file) => {
      const ok = await checkAvail(file)
      setAvail(prev => ({ ...prev, [file]: ok }))
    })
  }, [])

  const openModal = (filename: string, title: string) => {
    setModal({ src: `/exams/${filename}`, title })
  }

  return (
    <div style={{ padding: '24px 28px 60px', maxWidth: 1100, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 700, color: 'var(--text)', margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ color: 'var(--orange)' }}>🔗</span> مصادر رسمية وعلى الإنترنت
      </h2>

      <div style={{ background: 'var(--blue-l)', border: '1px solid var(--glass-border)', borderInlineStart: '3px solid var(--blue)', borderRadius: 'var(--r-sm)', padding: '14px 18px', marginBottom: 18, fontSize: '.9rem', color: 'var(--text2)', lineHeight: 1.65 }}>
        <strong style={{ color: 'var(--text)' }}>أهم نصيحة:</strong> ملفّات الامتحانات الرسمية (Lezen / Luisteren / Schrijven / Spreken لسنوات 2023 و2024 و2025) محفوظة لديك في مجلّد <em>NT</em>. استخدمها كمعيار حقيقي للصعوبة بعد أن تُكمل المحاكاة هنا.
      </div>

      {/* ─── DUO PDF exam panel ─── */}
      <section aria-labelledby="pdf-heading">
        <h3 id="pdf-heading" style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: '0 0 14px', display: 'flex', alignItems: 'center', gap: 8 }}>
          📄 نماذج امتحانات DUO (PDF)
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 12, marginBottom: 24 }}>
          {EXAMS.map((exam) => (
            <ExamCard
              key={exam.id}
              exam={exam}
              opgavenOk={avail[exam.opgaven]}
              antwoordenOk={avail[exam.antwoorden]}
              audioOpen={audioOpen.has(exam.id)}
              openModal={openModal}
              onToggleAudio={() => toggleAudio(exam.id)}
            />
          ))}
        </div>
      </section>

      {/* ─── Link groups ─── */}
      {RESOURCE_GROUPS.map((group) => (
        <div key={group.title}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--text)', margin: '18px 0 10px' }}>{group.title}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 12 }}>
            {group.links.map((link) => (
              <ResourceLinkCard key={link.href} link={link} />
            ))}
          </div>
        </div>
      ))}

      <PdfModal state={modal} onClose={() => setModal(null)} />
    </div>
  )
}

// ─── ExamCard ─────────────────────────────────────────────────────────────────

function ExamCard({
  exam, opgavenOk, antwoordenOk, audioOpen, openModal, onToggleAudio,
}: {
  exam: ExamEntry
  opgavenOk: boolean | undefined
  antwoordenOk: boolean | undefined
  audioOpen: boolean
  openModal: (filename: string, title: string) => void
  onToggleAudio: () => void
}) {
  const icon = SKILL_ICON[exam.skill] ?? '📋'
  const checking = opgavenOk === undefined || antwoordenOk === undefined

  return (
    <div
      className="relative overflow-hidden glow-card"
      style={{
        background: 'var(--glass-bg-strong)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--r-sm)',
        padding: '14px 14px 12px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="card-icon" style={{ fontSize: '1.25rem' }}>{icon}</span>
        <div>
          <div className="card-value" style={{ fontWeight: 600, fontSize: '.88rem', color: 'var(--text)' }}>
            {exam.skillAr} — {exam.year}
          </div>
          <div style={{ fontSize: '.75rem', color: 'var(--muted)' }}>{exam.skill}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <ExamActionButton
          label="الأسئلة"
          sublabel="Opgaven"
          filename={exam.opgaven}
          available={opgavenOk}
          checking={checking}
          onOpen={() => openModal(exam.opgaven, `${exam.skillAr} ${exam.year} — الأسئلة`)}
        />
        <ExamActionButton
          label="نموذج الإجابة"
          sublabel="Antwoorden"
          filename={exam.antwoorden}
          available={antwoordenOk}
          checking={checking}
          onOpen={() => openModal(exam.antwoorden, `${exam.skillAr} ${exam.year} — نموذج الإجابة`)}
        />
      </div>

      {EXAM_AUDIO[exam.id] && (
        <ExamAudioPanel
          examId={exam.id}
          tracks={EXAM_AUDIO[exam.id]}
          open={audioOpen}
          onToggle={onToggleAudio}
        />
      )}
    </div>
  )
}

// ─── ResourceLinkCard ─────────────────────────────────────────────────────────

function ResourceLinkCard({ link }: { link: ResourceLink }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      className="relative overflow-hidden glow-card"
      style={{
        background: link.highlight ? 'var(--orange-l)' : 'var(--glass-bg)',
        backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        border: `1px ${link.warn ? 'dashed' : 'solid'} ${link.highlight ? 'var(--orange)' : 'var(--glass-border)'}`,
        borderRadius: 'var(--r-sm)', padding: 14, textDecoration: 'none',
        color: 'inherit', display: 'block',
        boxShadow: link.highlight ? 'var(--elev-2)' : 'var(--elev-1)',
        opacity: link.warn ? 0.65 : 1,
      }}
    >
      <div className="card-value" style={{ fontWeight: 600, color: link.highlight ? 'var(--orange)' : 'var(--text)', marginBottom: 4 }}>{link.title}</div>
      <div style={{ fontSize: '.8rem', color: 'var(--text2)', lineHeight: 1.5 }}>{link.desc}</div>
    </a>
  )
}

// ─── ExamAudioPanel ───────────────────────────────────────────────────────────

function ExamAudioPanel({
  examId, tracks, open, onToggle,
}: {
  examId: string
  tracks: AudioTrack[]
  open: boolean
  onToggle: () => void
}) {
  const videoCount = tracks.filter(t => t.isVideo).length
  const audioCount = tracks.length - videoCount

  return (
    <div>
      <button
        onClick={onToggle}
        style={{
          width: '100%', textAlign: 'start', fontSize: '.8rem', fontWeight: 500,
          padding: '7px 10px', borderRadius: 6,
          border: '1px solid var(--glass-border)', color: 'var(--text2)',
          background: open ? 'var(--surface3)' : 'transparent',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'background .12s',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}
      >
        <span>🎵 مقاطع الصوت ({audioCount}{videoCount > 0 ? ` + ${videoCount} فيديو` : ''})</span>
        <span style={{ fontSize: '.7rem' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{
          marginTop: 6, maxHeight: 340, overflowY: 'auto',
          border: '1px solid var(--glass-border)', borderRadius: 6,
          background: 'var(--surface2)',
        }}>
          {tracks.map((track) => {
            const src = `/exams/audio/${examId}/${track.file}`
            return (
              <div
                key={track.file}
                style={{
                  padding: '8px 10px',
                  borderBottom: '1px solid var(--glass-border)',
                }}
              >
                <div style={{ fontSize: '.75rem', color: 'var(--muted)', marginBottom: 4 }}>
                  {track.isVideo ? '🎬' : '🔊'} {track.label}
                </div>
                {track.isVideo ? (
                  <video
                    controls
                    preload="none"
                    src={src}
                    style={{ width: '100%', maxHeight: 180, borderRadius: 4, background: '#000' }}
                  />
                ) : (
                  <audio
                    controls
                    preload="none"
                    src={src}
                    style={{ width: '100%', height: 32 }}
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ExamActionButton({
  label, sublabel, filename, available, checking, onOpen,
}: {
  label: string
  sublabel: string
  filename: string
  available: boolean | undefined
  checking: boolean
  onOpen: () => void
}) {
  if (checking) {
    return (
      <div style={{ fontSize: '.78rem', color: 'var(--muted)', padding: '6px 10px', borderRadius: 6, border: '1px solid var(--glass-border)', opacity: 0.6 }}>
        ⏳ {label}
      </div>
    )
  }

  if (!available) {
    return (
      <div
        title={`المسار المتوقع: /exams/${filename}`}
        style={{ fontSize: '.78rem', color: 'var(--muted)', padding: '6px 10px', borderRadius: 6, border: '1px dashed var(--glass-border)', display: 'flex', flexDirection: 'column', gap: 2 }}
      >
        <span>⛔ {label} — غير متوفر</span>
        <code style={{ fontSize: '.7rem', opacity: .7, fontFamily: 'monospace' }}>{filename}</code>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: 6 }}>
      <button
        onClick={onOpen}
        style={{
          flex: 1, fontSize: '.8rem', fontWeight: 500,
          padding: '7px 10px', borderRadius: 6,
          border: '1px solid var(--orange)', color: 'var(--orange)',
          background: 'transparent', cursor: 'pointer', fontFamily: 'inherit',
          textAlign: 'start', transition: 'background .12s',
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--orange-l)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent' }}
      >
        📄 {label}
        <span style={{ display: 'block', fontSize: '.7rem', color: 'var(--muted)', fontWeight: 400 }}>{sublabel}</span>
      </button>
      <a
        href={`/exams/${filename}`}
        target="_blank"
        rel="noopener noreferrer"
        title="فتح في نافذة جديدة"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, borderRadius: 6, border: '1px solid var(--glass-border)', color: 'var(--text2)', textDecoration: 'none', fontSize: '.85rem', flexShrink: 0, transition: 'border-color .12s' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--blue)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--glass-border)' }}
      >
        ↗
      </a>
      <a
        href={`/exams/${filename}`}
        download
        title="تنزيل"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, borderRadius: 6, border: '1px solid var(--glass-border)', color: 'var(--text2)', textDecoration: 'none', fontSize: '.85rem', flexShrink: 0, transition: 'border-color .12s' }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--green, #4caf50)' }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = 'var(--glass-border)' }}
      >
        ⬇
      </a>
    </div>
  )
}
