import { describe, it, expect } from 'vitest'

/**
 * Regression guard for the Windows drive-letter trap.
 *
 * Vite keys its module graph by absolute path, so "c:\project" and
 * "C:\project" are two different modules to it. When the suite is started
 * from a shell that reports a lowercase drive letter (Git Bash does; cmd and
 * PowerShell do not), the test file and the runner load separate copies of
 * "vitest" and every single file fails to collect with
 * "Cannot read properties of undefined (reading 'config')".
 *
 * scripts/run-vitest.mjs normalises the drive letter before Vitest starts.
 * This test fails if a future change to that launcher stops doing so.
 *
 * On non-Windows platforms there is no drive letter and nothing to check.
 */
describe('test runner working directory', () => {
  it('runs from a normalised drive letter on Windows', () => {
    if (process.platform !== 'win32') {
      expect(process.cwd().startsWith('/')).toBe(true)
      return
    }
    expect(process.cwd()).toMatch(/^[A-Z]:/)
  })
})
