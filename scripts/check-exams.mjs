#!/usr/bin/env node
/**
 * Verifies every file referenced in the EXAMS and EXAM_AUDIO manifests
 * exists on disk under public/exams/. Exits 1 if any file is missing.
 *
 * Usage: node scripts/check-exams.mjs
 *        npm run check:exams
 */

import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// ── helpers ──────────────────────────────────────────────────────────────────

function readSrc(rel) {
  return readFileSync(resolve(root, rel), 'utf8')
}

function check(abs, label) {
  if (existsSync(abs)) return true
  console.error(`  MISSING  ${label}`)
  return false
}

// ── PDFs — parse src/data/examPdfs.ts ────────────────────────────────────────

const pdfSrc = readSrc('src/data/examPdfs.ts')
// Matches any single-quoted .pdf filename value, e.g. opgaven: 'nt2-lezen-2023-opgaven.pdf'
const pdfFiles = [...pdfSrc.matchAll(/:\s*'(nt2-[^']+\.pdf)'/g)].map(m => m[1])

// ── Audio — parse src/data/examAudio.ts ──────────────────────────────────────

const audioSrc = readSrc('src/data/examAudio.ts')

const audioEntries = []
let currentId = null
for (const line of audioSrc.split('\n')) {
  const idMatch = line.match(/'((?:luisteren|spreken)-\d{4})':\s*\[/)
  if (idMatch) currentId = idMatch[1]
  const fileMatch = line.match(/file:\s*'([^']+)'/)
  if (fileMatch && currentId) {
    audioEntries.push({ examId: currentId, file: fileMatch[1] })
  }
}

// ── Run checks ────────────────────────────────────────────────────────────────

let failures = 0

console.log(`\n── PDF exams (${pdfFiles.length} files) ──`)
for (const f of pdfFiles) {
  const ok = check(resolve(root, 'public/exams', f), `/exams/${f}`)
  if (!ok) failures++
  else process.stdout.write('.')
}
console.log(failures === 0 ? ' all present' : '')

console.log(`\n── Audio tracks (${audioEntries.length} files) ──`)
let audioFail = 0
for (const { examId, file } of audioEntries) {
  const ok = check(resolve(root, 'public/exams/audio', examId, file), `/exams/audio/${examId}/${file}`)
  if (!ok) { failures++; audioFail++ }
}
if (audioFail === 0) console.log(`  all ${audioEntries.length} tracks present`)

// ── Summary ───────────────────────────────────────────────────────────────────

console.log()
if (failures === 0) {
  console.log(`✓ All ${pdfFiles.length + audioEntries.length} referenced files are present on disk.`)
  process.exit(0)
} else {
  console.error(`✗ ${failures} file(s) missing — fix the paths above or re-copy the source files.`)
  process.exit(1)
}
