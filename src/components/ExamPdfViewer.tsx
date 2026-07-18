import '@/lib/pdfWorker'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Document, Page } from 'react-pdf'
import 'react-pdf/dist/Page/AnnotationLayer.css'
import 'react-pdf/dist/Page/TextLayer.css'
import type { PDFDocumentProxy } from 'pdfjs-dist'

interface Props {
  /** Path or URL to the PDF file */
  src: string
  /** Display title (for aria-label) */
  title?: string
}

const MIN_SCALE = 0.5
const MAX_SCALE = 3.0
const SCALE_STEP = 0.25

export function ExamPdfViewer({ src, title }: Props) {
  const [numPages, setNumPages] = useState<number>(0)
  const [page, setPage] = useState(1)
  const [scale, setScale] = useState(1.0)
  const [fitWidth, setFitWidth] = useState(true)
  const [containerW, setContainerW] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)

  // Observe container width for fit-to-width mode
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0
      setContainerW(w)
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Only handle when the viewer has focus somewhere in it
      if (!containerRef.current?.contains(document.activeElement) &&
          document.activeElement !== document.body) return
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault()
        setPage((p) => Math.min(numPages, p + 1))
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault()
        setPage((p) => Math.max(1, p - 1))
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault()
        setFitWidth(false)
        setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2)))
      } else if (e.key === '-') {
        e.preventDefault()
        setFitWidth(false)
        setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2)))
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [numPages])

  const onDocumentLoad = useCallback((doc: PDFDocumentProxy) => {
    setNumPages(doc.numPages)
    setPage(1)
    setLoading(false)
    setError(null)
  }, [])

  const onDocumentError = useCallback(() => {
    setLoading(false)
    setError('تعذّر تحميل الملف. تحقّق من المسار أو حاول مجدّدًا.')
  }, [])

  const prev = () => setPage((p) => Math.max(1, p - 1))
  const next = () => setPage((p) => Math.min(numPages, p + 1))

  const zoomIn = () => { setFitWidth(false); setScale((s) => Math.min(MAX_SCALE, +(s + SCALE_STEP).toFixed(2))) }
  const zoomOut = () => { setFitWidth(false); setScale((s) => Math.max(MIN_SCALE, +(s - SCALE_STEP).toFixed(2))) }
  const toggleFit = () => setFitWidth((v) => !v)

  const pageWidth = fitWidth && containerW > 0 ? containerW - 4 : undefined
  const pageScale = fitWidth ? undefined : scale

  return (
    <div
      ref={containerRef}
      dir="ltr"
      aria-label={title ? `PDF: ${title}` : 'PDF viewer'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--glass-bg)',
        border: '1px solid var(--glass-border)',
        borderRadius: 'var(--r)',
        overflow: 'hidden',
        boxShadow: 'var(--elev-1)',
      }}
    >
      {/* ── Toolbar ── */}
      <div
        role="toolbar"
        aria-label="PDF navigation"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          padding: '8px 10px',
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)',
          borderBottom: '1px solid var(--glass-border)',
          flexWrap: 'wrap',
        }}
      >
        {/* Page navigation */}
        <TbBtn onClick={prev} disabled={page <= 1} aria-label="الصفحة السابقة" title="السابقة (←)">‹</TbBtn>
        <span
          aria-live="polite"
          aria-atomic="true"
          style={{ fontSize: '.82rem', color: 'var(--text2)', minWidth: 64, textAlign: 'center', fontVariantNumeric: 'tabular-nums' }}
        >
          {numPages > 0 ? `${page} / ${numPages}` : '—'}
        </span>
        <TbBtn onClick={next} disabled={page >= numPages} aria-label="الصفحة التالية" title="التالية (→)">›</TbBtn>

        <div style={{ flex: 1 }} />

        {/* Zoom controls */}
        <TbBtn onClick={zoomOut} disabled={!fitWidth && scale <= MIN_SCALE} aria-label="تصغير" title="تصغير (-)">−</TbBtn>
        <span style={{ fontSize: '.78rem', color: 'var(--text2)', minWidth: 40, textAlign: 'center' }}>
          {fitWidth ? 'عرض' : `${Math.round(scale * 100)}%`}
        </span>
        <TbBtn onClick={zoomIn} disabled={!fitWidth && scale >= MAX_SCALE} aria-label="تكبير" title="تكبير (+)">+</TbBtn>
        <TbBtn
          onClick={toggleFit}
          aria-label={fitWidth ? 'التكبير اليدوي' : 'ملاءمة العرض'}
          title={fitWidth ? 'التكبير اليدوي' : 'ملاءمة العرض'}
          style={{ fontSize: '.72rem', padding: '5px 8px' }}
        >
          {fitWidth ? '↔' : '⊡'}
        </TbBtn>
      </div>

      {/* ── Page canvas area ── */}
      <div
        tabIndex={0}
        aria-label="منطقة عرض PDF — استخدم الأسهم للتنقّل بين الصفحات"
        style={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          justifyContent: 'center',
          padding: '12px 8px',
          minHeight: 400,
          maxHeight: 'calc(100dvh - 260px)',
          background: 'var(--surface3)',
          outline: 'none',
        }}
      >
        {error ? (
          <div role="alert" style={msgStyle('var(--red-l)', 'var(--red)')}>{error}</div>
        ) : (
          <Document
            file={src}
            onLoadSuccess={onDocumentLoad}
            onLoadError={onDocumentError}
            loading={
              <div style={msgStyle('transparent', 'transparent', 'var(--text2)')}>
                ⏳ جارٍ تحميل الملف…
              </div>
            }
            error={
              <div role="alert" style={msgStyle('var(--red-l)', 'var(--red)')}>
                تعذّر تحميل الملف.
              </div>
            }
          >
            {!loading && numPages > 0 && (
              <Page
                key={`page_${page}`}
                pageNumber={page}
                width={pageWidth}
                scale={pageScale}
                renderTextLayer={true}
                renderAnnotationLayer={true}
                loading={
                  <div style={msgStyle('transparent', 'transparent', 'var(--text2)')}>
                    ⏳ جارٍ تحميل الصفحة…
                  </div>
                }
              />
            )}
          </Document>
        )}
      </div>

      {/* ── Bottom page indicator (mobile-friendly) ── */}
      {numPages > 0 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 8,
            padding: '8px',
            borderTop: '1px solid var(--glass-border)',
            background: 'var(--glass-bg)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <TbBtn onClick={prev} disabled={page <= 1} aria-label="الصفحة السابقة"
            style={{ padding: '7px 18px', fontSize: '.85rem' }}>
            ‹ السابقة
          </TbBtn>
          <TbBtn onClick={next} disabled={page >= numPages} aria-label="الصفحة التالية"
            style={{ padding: '7px 18px', fontSize: '.85rem' }}>
            التالية ›
          </TbBtn>
        </div>
      )}
    </div>
  )
}

/* ── Toolbar button ── */
function TbBtn({
  children, onClick, disabled, 'aria-label': ariaLabel, title, style,
}: {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  'aria-label': string
  title?: string
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      title={title}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 32,
        minHeight: 32,
        padding: '5px 9px',
        border: '1px solid var(--btn-border)',
        borderRadius: 7,
        background: 'var(--btn-bg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        color: 'var(--text2)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        fontSize: '1rem',
        fontFamily: 'inherit',
        fontWeight: 600,
        transition: 'background .12s, border-color .12s',
        ...style,
      }}
    >
      {children}
    </button>
  )
}

function msgStyle(bg: string, border: string, color = 'var(--red)'): React.CSSProperties {
  return {
    alignSelf: 'center',
    padding: '12px 18px',
    background: bg,
    border: border !== 'transparent' ? `1px solid ${border}` : 'none',
    borderRadius: 8,
    fontSize: '.9rem',
    color,
    textAlign: 'center',
  }
}
