import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface Props {
  markdown: string
}

// Custom renderers that apply app design tokens
// Using inline styles so they pick up CSS vars from both light + dark themes
const components: Components = {
  h1: ({ children }) => (
    <h1 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-xl)',
      fontWeight: 'var(--fw-heading)',
      color: 'var(--text)',
      borderBottom: '2px solid var(--orange-m)',
      paddingBottom: '0.4em',
      marginBottom: '1em',
      marginTop: 0,
      lineHeight: 'var(--lh-heading)',
    }}>{children}</h1>
  ),
  h2: ({ children }) => (
    <h2 style={{
      fontFamily: 'var(--font-display)',
      fontSize: 'var(--text-lg)',
      fontWeight: 'var(--fw-heading)',
      color: 'var(--text)',
      margin: '1.6em 0 0.6em',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-2)',
    }}>{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 style={{
      fontSize: 'var(--text-base)',
      fontWeight: 'var(--fw-heading)',
      color: 'var(--text2)',
      margin: '1.2em 0 0.4em',
    }}>{children}</h3>
  ),
  p: ({ children }) => (
    <p style={{
      color: 'var(--text2)',
      lineHeight: 'var(--lh-arabic)',
      margin: '0.6em 0',
      fontSize: 'var(--text-sm)',
    }}>{children}</p>
  ),
  strong: ({ children }) => (
    <strong style={{ color: 'var(--text)', fontWeight: 'var(--fw-cta)' }}>{children}</strong>
  ),
  em: ({ children }) => (
    <em style={{ color: 'var(--text)', fontStyle: 'italic' }}>{children}</em>
  ),
  ul: ({ children }) => (
    <ul style={{
      paddingInlineStart: '1.4em',
      margin: '0.5em 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-1)',
    }}>{children}</ul>
  ),
  ol: ({ children }) => (
    <ol style={{
      paddingInlineStart: '1.4em',
      margin: '0.5em 0',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--sp-1)',
    }}>{children}</ol>
  ),
  li: ({ children }) => (
    <li style={{ color: 'var(--text2)', fontSize: 'var(--text-sm)', lineHeight: 'var(--lh-arabic)' }}>{children}</li>
  ),
  blockquote: ({ children }) => (
    <blockquote style={{
      borderInlineStart: '3px solid var(--orange)',
      background: 'var(--orange-l)',
      margin: '1em 0',
      padding: '10px 14px',
      borderRadius: '0 var(--r-sm) var(--r-sm) 0',
      color: 'var(--text2)',
      fontSize: 'var(--text-sm)',
    }}>{children}</blockquote>
  ),
  code: ({ children, className }) => {
    // Block code (inside pre)
    if (className) {
      return (
        <code style={{
          fontFamily: 'ui-monospace, Consolas, monospace',
          fontSize: 'var(--text-sm)',
          color: 'var(--text)',
          direction: 'ltr',
          display: 'block',
        }}>{children}</code>
      )
    }
    // Inline code
    return (
      <code style={{
        fontFamily: 'ui-monospace, Consolas, monospace',
        fontSize: '.84em',
        background: 'var(--surface3)',
        color: 'var(--orange-text)',
        padding: '1px 5px',
        borderRadius: 'var(--r-2xs)',
        border: '1px solid var(--border)',
      }}>{children}</code>
    )
  },
  pre: ({ children }) => (
    <pre style={{
      background: 'var(--surface3)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-sm)',
      padding: '12px 16px',
      margin: '0.8em 0',
      overflowX: 'auto',
      direction: 'ltr',
      textAlign: 'left',
      lineHeight: 'var(--lh-arabic)',
    }}>{children}</pre>
  ),
  table: ({ children }) => (
    <div style={{ overflowX: 'auto', margin: '1em 0' }}>
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: 'var(--text-sm)',
      }}>{children}</table>
    </div>
  ),
  thead: ({ children }) => (
    <thead style={{ background: 'var(--surface3)' }}>{children}</thead>
  ),
  th: ({ children }) => (
    <th style={{
      padding: '8px 12px',
      borderBottom: '2px solid var(--border2)',
      color: 'var(--text)',
      fontWeight: 'var(--fw-cta)',
      textAlign: 'start',
      whiteSpace: 'nowrap',
    }}>{children}</th>
  ),
  td: ({ children }) => (
    <td style={{
      padding: '7px 12px',
      borderBottom: '1px solid var(--border)',
      color: 'var(--text2)',
      verticalAlign: 'top',
    }}>{children}</td>
  ),
  tr: ({ children }) => (
    <tr style={{ transition: 'background .12s' }}
      onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface2)')}
      onMouseLeave={e => (e.currentTarget.style.background = '')}
    >{children}</tr>
  ),
  hr: () => (
    <hr style={{ border: 'none', borderTop: '1px solid var(--border)', margin: '1.4em 0' }} />
  ),
  // Disable raw HTML entirely — no anchor override needed for lesson content
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noopener noreferrer"
      style={{ color: 'var(--orange-text)', textDecoration: 'underline', textUnderlineOffset: 3 }}>
      {children}
    </a>
  ),
}

/**
 * Safe Markdown renderer.
 * - skipHtml: true   → strips all raw HTML, no XSS vector
 * - remark-gfm       → tables, strikethrough, task lists
 * - Custom components apply the app's CSS variable design tokens
 */
export function Lesson({ markdown }: Props) {
  return (
    <div dir="rtl" style={{ lineHeight: 'var(--lh-arabic)' }}>
      <Markdown
        remarkPlugins={[remarkGfm]}
        skipHtml
        components={components}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
