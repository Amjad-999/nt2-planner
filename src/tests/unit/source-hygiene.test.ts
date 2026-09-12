import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve, join, sep } from 'node:path'

/**
 * نظافة المصدر: لا محارف تحكّم مخفيّة.
 *
 * A guard in this repo once carried a literal backspace (0x08) where a regex
 * word-boundary escape was meant. It rendered identically in every editor,
 * every `sed` listing and every diff — and matched nothing, so the check sat
 * green while auditing the exact defect it was written for. It cost a long
 * debugging detour, and nothing else in the toolchain looks for it: a control
 * character inside a string or regex literal is valid TypeScript, so the
 * compiler and the linter both pass it through.
 */

const ROOT = process.cwd()
const SRC = resolve(ROOT, 'src')

function sourceFiles(dir: string): string[] {
  const out: string[] = []
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, e.name)
    if (e.isDirectory()) out.push(...sourceFiles(full))
    else if (/\.(tsx?|css|mjs|js)$/.test(e.name)) out.push(full)
  }
  return out
}

/** Tab, newline and carriage return are the only control codes source may hold. */
const ALLOWED = new Set([9, 10, 13])

describe('no invisible control characters in source', () => {
  const FILES = sourceFiles(SRC)

  it('scans the whole tree', () => {
    expect(FILES.length).toBeGreaterThan(100)
  })

  it('finds none in any file', () => {
    const found: string[] = []
    for (const file of FILES) {
      const rel = file.slice(ROOT.length + 1).split(sep).join('/')
      const text = readFileSync(file, 'utf8')
      let line = 1
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i)
        if (code === 10) { line++; continue }
        if (code < 32 && !ALLOWED.has(code)) {
          found.push(`${rel}:${line} contains U+${code.toString(16).toUpperCase().padStart(4, '0')}`)
        }
      }
    }
    expect(
      found,
      'an escape collapsed into a real control character — it looks correct everywhere and behaves like nothing',
    ).toEqual([])
  })

  it('detects one when it is there', () => {
    // Proves the scan works, so a green run means "clean" and not "no-op".
    const withBackspace = `a\u0008b`
    const hit = [...withBackspace].some((c) => c.charCodeAt(0) < 32 && !ALLOWED.has(c.charCodeAt(0)))
    expect(hit, 'the detector itself is broken').toBe(true)
  })
})
