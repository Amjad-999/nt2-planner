/**
 * Confetti helper — always checks prefers-reduced-motion before firing.
 * canvas-confetti is lazily imported so it stays out of the initial bundle.
 */

export type CelebType = 'word' | 'tasks' | 'streak' | 'exam' | 'badge'

function reduced(): boolean {
  return typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export async function celebrate(type: CelebType = 'badge'): Promise<void> {
  if (typeof window === 'undefined' || reduced()) return

  const { default: confetti } = await import('canvas-confetti')

  // Shared brand palette from app tokens — tangerine · leaf green · gold
  const teal   = ['#F58F20', '#F9A23F', '#FBC07A', '#467434']
  const bright = ['#F58F20', '#467434', '#D98A2B', '#6FA84F', '#F9A23F']

  switch (type) {
    case 'word':
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.65 },
        colors: teal, disableForReducedMotion: true })
      break

    case 'tasks':
      // Two-cannon burst
      confetti({ particleCount: 80, angle: 60,  spread: 55, origin: { x: 0, y: 0.6 },
        colors: bright, disableForReducedMotion: true })
      setTimeout(() =>
        confetti({ particleCount: 80, angle: 120, spread: 55, origin: { x: 1, y: 0.6 },
          colors: bright, disableForReducedMotion: true }), 150)
      break

    case 'streak':
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 },
        colors: bright, startVelocity: 35, disableForReducedMotion: true })
      setTimeout(() =>
        confetti({ particleCount: 60, spread: 50, origin: { y: 0.4 },
          colors: teal, startVelocity: 20, disableForReducedMotion: true }), 300)
      break

    case 'exam':
      // Big celebration — three sequential bursts
      confetti({ particleCount: 100, angle: 60,  spread: 60, origin: { x: 0,   y: 0.55 },
        colors: bright, disableForReducedMotion: true })
      setTimeout(() =>
        confetti({ particleCount: 100, angle: 90,  spread: 80, origin: { x: 0.5, y: 0.4 },
          colors: teal,  disableForReducedMotion: true }), 200)
      setTimeout(() =>
        confetti({ particleCount: 100, angle: 120, spread: 60, origin: { x: 1,   y: 0.55 },
          colors: bright, disableForReducedMotion: true }), 400)
      break

    case 'badge':
      confetti({ particleCount: 55, spread: 65, origin: { y: 0.55 },
        shapes: ['star'], colors: teal, disableForReducedMotion: true })
      break
  }
}
