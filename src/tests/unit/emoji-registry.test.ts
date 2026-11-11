import { describe, it, expect } from 'vitest'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import registry from '@/data/emoji/registry.json'

/* The emoji system is only deterministic while three things stay in step:
   what the source uses, what the registry names, and what the local font can
   draw. An emoji added to the source without the other two would quietly fall
   back to the device's own emoji set — the inconsistency this replaced. */

const ROOT = process.cwd()
const SRC = resolve(ROOT, 'src')
const EMOJI = /(?:\p{Regional_Indicator}{2}|\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|\p{Emoji_Modifier})?)*|[0-9#*]\uFE0F?\u20E3)/gu

function sources(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) {
      if (e.name !== 'tests' && e.name !== 'assets') out.push(...sources(full))
    } else if (/\.(tsx?|css)$/.test(e.name)) out.push(full)
  }
  return out
}

const FILES = sources(SRC).map((f) => ({ rel: f.slice(ROOT.length + 1).split('\\').join('/'), text: readFileSync(f, 'utf8') }))
const used = new Map<string, string[]>()
for (const f of FILES) for (const m of f.text.matchAll(EMOJI)) used.set(m[0], [...(used.get(m[0]) ?? []), f.rel])

const entries = registry.emoji
const known = new Set(entries.map((e) => e.char))

describe('emoji registry', () => {
  it('names every emoji the source uses', () => {
    const unregistered = [...used.keys()].filter((c) => !known.has(c)).map((c) => `${c} in ${used.get(c)![0]}`)
    expect(unregistered, 'add it to src/data/emoji/registry.json and rebuild with scripts/build-emoji.py').toEqual([])
  })

  it('lists nothing the source no longer uses', () => {
    expect(entries.filter((e) => !used.has(e.char)).map((e) => e.char)).toEqual([])
  })

  it('gives every entry a unique id, a role, a label and a vector asset that exists', () => {
    expect(new Set(entries.map((e) => e.id)).size).toBe(entries.length)
    for (const e of entries) {
      expect(e.label.trim().length, `${e.char} has no label`).toBeGreaterThan(1)
      expect(e.role.length).toBeGreaterThan(0)
      expect(existsSync(resolve(ROOT, e.asset)), `${e.asset} is missing`).toBe(true)
    }
  })

  it('records where each emoji is used, and those references resolve', () => {
    for (const e of entries) {
      expect(e.usedIn.length, `${e.char} has no recorded use`).toBeGreaterThan(0)
      for (const file of e.usedIn) {
        const hit = FILES.find((f) => f.rel === file)
        expect(hit, `${file} (listed for ${e.char}) does not exist`).toBeDefined()
        expect(hit!.text.includes(e.char), `${file} no longer contains ${e.char}`).toBe(true)
      }
    }
  })

  it('never leaves half of a flag sequence in the source', () => {
    // A single regional-indicator letter is not an emoji; it was once used as a "G" logo.
    const lone = FILES.filter((f) => /(?<!\p{Regional_Indicator})\p{Regional_Indicator}(?!\p{Regional_Indicator})/u.test(f.text)).map((f) => f.rel)
    expect(lone).toEqual([])
  })

  it('never uses a bare symbol where the registry holds its emoji form', () => {
    // "⚠" and "⚠️" are different sequences: without the variation selector a
    // device may draw a thin text glyph instead of the emoji.
    const bare = [...used.keys()].filter((c) => !c.includes('\uFE0F') && known.has(`${c}\uFE0F`))
    expect(bare).toEqual([])
  })
})

describe('the local emoji face', () => {
  const css = readFileSync(resolve(SRC, 'styles/emoji.css'), 'utf8')
  const range = new Set([...css.matchAll(/U\+([0-9A-F]+)/g)].map((m) => parseInt(m[1], 16)))

  it('ships the font file the stylesheet points to', () => {
    expect(existsSync(resolve(SRC, 'assets/emoji/nt2-emoji.woff2'))).toBe(true)
    expect(css).toContain("url('../assets/emoji/nt2-emoji.woff2')")
  })

  it('covers every pictograph in the registry', () => {
    const missing: string[] = []
    for (const e of entries) {
      for (const ch of e.char) {
        const cp = ch.codePointAt(0)!
        if (cp !== 0xfe0f && cp !== 0x200d && !range.has(cp)) missing.push(`${e.char} U+${cp.toString(16)}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('can never capture a letter, a digit or punctuation', () => {
    expect([...range].filter((cp) => cp < 0x2000)).toEqual([])
  })

  it('leads every font stack, so no emoji is left to the device', () => {
    const tokens = readFileSync(resolve(SRC, 'styles/tokens.css'), 'utf8')
    for (const name of ['--font-latin', '--font-arabic', '--o-font-display', '--o-font-display-ar', '--o-font-mono']) {
      const at = tokens.indexOf(`${name}:`)
      expect(at, `${name} missing`).toBeGreaterThan(-1)
      expect(tokens.slice(at, tokens.indexOf(';', at)), `${name} does not start with the emoji face`).toMatch(/:\s*'NT2 Emoji'/)
    }
  })
})
