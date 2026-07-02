// Global cursor spotlight — event delegation, single RAF loop.
// Finds the nearest .glow-card ancestor and sets --mx / --my so the CSS
// radial-gradient glow follows the cursor at full speed.
let raf = 0

document.addEventListener('mousemove', (e: MouseEvent) => {
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    const card = (e.target as Element | null)?.closest<HTMLElement>('.glow-card')
    if (!card) return
    const r = card.getBoundingClientRect()
    card.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`)
    card.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`)
  })
}, { passive: true })
