import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pct } from '@/lib/utils'

/* Guards for the defects repaired in the interface-refinement pass. Each one
   failed against the code as it was before the fix. */

const ROOT = process.cwd()
const SRC = resolve(ROOT, 'src')

function sources(dir: string, ext: RegExp): { rel: string; text: string }[] {
  const out: { rel: string; text: string }[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'tests') out.push(...sources(full, ext))
    } else if (ext.test(e.name)) out.push({ rel: full.slice(ROOT.length + 1), text: readFileSync(full, 'utf8') })
  }
  return out
}

const TSX = sources(SRC, /\.tsx$/)
const CSS = sources(SRC, /\.css$/)
const lines = (files: { rel: string; text: string }[], re: RegExp) =>
  files.flatMap((f) => f.text.split('\n').map((l, i) => (re.test(l) ? `${f.rel}:${i + 1}` : '')).filter(Boolean))

describe('upright type', () => {
  it('asks for no italic anywhere — no italic face is loaded, so it would be a synthetic slant', () => {
    expect(lines(TSX, /fontStyle:\s*'(italic|oblique)'|className="[^"]*\bitalic\b/)).toEqual([])
    expect(lines(CSS, /font-style:\s*(italic|oblique)/)).toEqual([])
  })

  it('switches off style synthesis at the root', () => {
    const globals = readFileSync(resolve(SRC, 'styles/globals.css'), 'utf8')
    expect(globals).toContain('font-synthesis-style: none')
    expect(globals).toMatch(/font-variant-numeric:\s*var\(--num-features\)/)
  })

  it('loads the families it names in upright faces only', () => {
    const main = readFileSync(resolve(SRC, 'main.tsx'), 'utf8')
    expect(main).not.toMatch(/italic/i)
  })
})

describe('one glass material system', () => {
  it('has no hand-written backdrop blur left in a component', () => {
    expect(lines(TSX, /[bB]ackdropFilter:[^,\n]*blur\(/)).toEqual([])
  })

  it('defines the four materials, a touch variant and a reduced-transparency fallback', () => {
    const tokens = readFileSync(resolve(SRC, 'styles/tokens.css'), 'utf8')
    for (const m of ['control', 'panel', 'bar', 'float']) expect(tokens).toContain(`--glass-fx-${m}:`)
    expect(tokens).toContain('@media (pointer: coarse)')
    expect(tokens).toContain('@media (prefers-reduced-transparency: reduce)')
  })

  it('aims the no-backdrop-filter fallback at the skin that is actually active', () => {
    // The old fallback targeted a bare :root, which the skin selector outranks,
    // so it never applied.
    const globals = readFileSync(resolve(SRC, 'styles/globals.css'), 'utf8')
    const block = globals.slice(globals.indexOf('@supports not ((backdrop-filter'))
    expect(block.slice(0, block.indexOf('\n}\n'))).toContain(':root[data-skin="observatory"][data-theme="dark"]')
  })

  it('gives a bare glass button a shape, at zero specificity', () => {
    const globals = readFileSync(resolve(SRC, 'styles/globals.css'), 'utf8')
    const at = globals.indexOf(':where(.btn-glass)')
    expect(at).toBeGreaterThan(-1)
    const rule = globals.slice(at, globals.indexOf('}', at))
    for (const prop of ['padding:', 'border-radius:', 'min-block-size:']) expect(rule).toContain(prop)
  })
})

describe('numbers keep their order in right-to-left text', () => {
  it('wraps a percentage in a left-to-right isolate', () => {
    expect(pct(90)).toBe('\u206690%\u2069')
    expect(pct(0)).toContain('0%')
    expect(pct('12.5')).toContain('12.5%')
  })
})

describe('Katja never blocks the page beneath her', () => {
  const mascot = readFileSync(resolve(SRC, 'components/mascot/Mascot.tsx'), 'utf8')

  it('lets taps through the wrapper and takes them only on its own controls', () => {
    const wrapper = mascot.slice(mascot.indexOf('className="floating-assistant"'), mascot.indexOf('{panelOpen && ('))
    expect(wrapper).toContain("pointerEvents: 'none'")
    expect(mascot.slice(mascot.indexOf('data-testid="mascot-stage"'))).toContain("pointerEvents: 'auto'")
    for (const part of ['MascotBubble', 'MascotPanel']) {
      expect(readFileSync(resolve(SRC, `components/mascot/${part}.tsx`), 'utf8')).toContain("pointerEvents: 'auto'")
    }
  })
})

describe('brand assets', () => {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8')
  const vite = readFileSync(resolve(ROOT, 'vite.config.ts'), 'utf8')

  it('resolves every icon the page and the manifest reference', () => {
    const refs = [...html.matchAll(/href="(\/(?:icons\/[^"]+|favicon\.svg))"/g), ...vite.matchAll(/src:\s*'(\/icons\/[^']+)'/g)].map((m) => m[1])
    expect(refs.length).toBeGreaterThanOrEqual(5)
    for (const r of refs) expect(existsSync(resolve(ROOT, `public${r}`)), `${r} is missing`).toBe(true)
  })

  it('uses a dedicated maskable icon rather than reusing the plain one', () => {
    const maskable = /src:\s*'([^']+)'[^}]*purpose:\s*'maskable'/.exec(vite)?.[1]
    const any = /src:\s*'([^']+)'[^}]*purpose:\s*'any'/.exec(vite)?.[1]
    expect(maskable).toBeDefined()
    expect(maskable).not.toBe(any)
  })

  it('ships the vector master with its light, dark and one-colour variants', () => {
    for (const f of ['logo-mark.svg', 'logo-mark-light.svg', 'logo-mark-dark.svg', 'logo-mark-mono.svg', 'app-icon.svg', 'app-icon-maskable.svg']) {
      expect(existsSync(resolve(ROOT, 'public/brand', f)), f).toBe(true)
    }
  })

  it('no longer carries the retired orange brand colour in the manifest', () => {
    expect(vite).not.toContain('#E07A3E')
  })

  it('keeps the startup mark and the in-app logo on the same geometry', () => {
    const logo = readFileSync(resolve(SRC, 'components/brand/Logo.tsx'), 'utf8')
    const d = /const BUBBLE = '([^']+)'/.exec(logo)?.[1]
    expect(d).toBeDefined()
    expect(html).toContain(d!)
    expect(readFileSync(resolve(ROOT, 'public/brand/logo-mark.svg'), 'utf8')).toContain(d!)
  })
})
