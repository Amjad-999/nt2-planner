import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'

/**
 * التجاوب والوصوليّة — مقيسان على المصدر.
 *
 * Every rule here exists because a real instance shipped:
 *  · a grid floor of minmax(300px, …) inside a 288px container, i.e. a
 *    horizontal overflow on the narrowest common phone;
 *  · a table inside <details> with no scroll wrapper, while its identical
 *    twin twelve lines above had one;
 *  · a fixed 302px panel in a container inset 18px from the viewport edge;
 *  · form controls whose only "label" was a placeholder.
 */

const SRC = resolve(process.cwd(), 'src')

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !/^\s*(\/\/|\*)/.test(l))
    .join('\n')
}

function tsxFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'tests') out.push(...tsxFiles(full))
    } else if (e.name.endsWith('.tsx')) out.push(full)
  }
  return out
}

const FILES = tsxFiles(SRC).map((f) => ({
  rel: f.slice(SRC.length + 1).split(sep).join('/'),
  code: stripComments(readFileSync(f, 'utf8')),
}))

describe('the scan covers the app', () => {
  it('reads a realistic number of components', () => {
    expect(FILES.length).toBeGreaterThan(40)
  })
})

describe('nothing can overflow a narrow viewport', () => {
  it('wraps every grid floor in min(), so a column never exceeds its track', () => {
    // `minmax(300px, 1fr)` in a 288px container forces a 300px column and
    // pushes the page sideways. `minmax(min(300px, 100%), 1fr)` cannot.
    const bad: string[] = []
    for (const { rel, code } of FILES) {
      code.split('\n').forEach((line, i) => {
        for (const m of line.matchAll(/minmax\(\s*(\d+)px/g)) {
          bad.push(`src/${rel}:${i + 1} minmax(${m[1]}px …)`)
        }
      })
    }
    expect(bad, 'use minmax(min(Npx, 100%), 1fr)').toEqual([])
  })

  it('gives every wide table a horizontal scroll container', () => {
    const bad: string[] = []
    for (const { rel, code } of FILES) {
      const lines = code.split('\n')
      lines.forEach((line, i) => {
        if (!line.includes('<table')) return
        // the wrapper is on one of the few lines above
        const above = lines.slice(Math.max(0, i - 4), i).join('\n')
        if (!/overflowX\s*:\s*['"]auto['"]/.test(above)) bad.push(`src/${rel}:${i + 1}`)
      })
    }
    expect(bad, 'wrap the table in a div with overflowX: auto').toEqual([])
  })

  it('has no viewport-sized fixed width on a floating panel', () => {
    const panel = FILES.find((f) => f.rel === 'components/mascot/MascotPanel.tsx')!
    expect(panel.code, 'a fixed px width can exceed a small screen').not.toMatch(/width:\s*\d{3},/)
    expect(panel.code).toContain('min(302px, calc(100vw - 36px))')
  })
})

describe('every form control has an accessible name', () => {
  it('finds no input, select or textarea without one', () => {
    const bad: string[] = []
    for (const { rel, code } of FILES) {
      const lines = code.split('\n')
      for (const m of code.matchAll(/<(input|select|textarea)\b/g)) {
        let depth = 0
        let end = m.index!
        for (let k = m.index!; k < code.length; k++) {
          if (code[k] === '{') depth++
          else if (code[k] === '}') depth--
          else if (code[k] === '>' && depth === 0) { end = k; break }
        }
        const tag = code.slice(m.index!, end + 1)
        const lineNo = code.slice(0, m.index!).split('\n').length
        if (/aria-label|aria-labelledby/.test(tag)) continue
        if (/type=['"]hidden['"]/.test(tag)) continue
        // display:none removes it from the accessibility tree entirely
        if (/display\s*:\s*['"]none['"]/.test(tag)) continue
        const above = lines.slice(Math.max(0, lineNo - 4), lineNo).join('\n')
        if (/<label|<Field\s+label=|htmlFor=/.test(above)) continue
        const id = tag.match(/\bid=['"]([^'"]+)['"]/)
        if (id && code.includes(`htmlFor="${id[1]}"`)) continue
        bad.push(`src/${rel}:${lineNo} ${tag.replace(/\s+/g, ' ').slice(0, 70)}`)
      }
    }
    expect(bad, 'a placeholder is not an accessible name — add aria-label or a <label>').toEqual([])
  })
})

describe('dialogs are usable from the keyboard', () => {
  it('closes each dialog on Escape', () => {
    /* Every modal in the app goes through the shared Overlay in
       SettingsModal, so this scan finds the Overlay itself plus the one panel
       that builds its own (MascotPanel). It used to find a third — the
       flashcard shortcut popover — which is not modal and is now a region. */
    const dialogs = FILES.filter((f) => f.code.includes('role="dialog"'))
    expect(dialogs.length).toBeGreaterThanOrEqual(2)
    const bad = dialogs
      .filter((f) => !/['"]Escape['"]|useHotkeys\(\s*['"]escape/.test(f.code))
      .map((f) => `src/${f.rel}`)
    expect(bad, 'every dialog must close on Escape').toEqual([])
  })

  it('moves focus into the panels that open over the page', () => {
    for (const rel of ['components/SettingsModal.tsx', 'components/mascot/MascotPanel.tsx']) {
      const f = FILES.find((x) => x.rel === rel)!
      expect(f.code, `${rel} must take focus when it opens`).toMatch(/\.focus\(\)/)
    }
  })
})
