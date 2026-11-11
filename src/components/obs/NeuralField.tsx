import { useEffect, useRef } from 'react'
import { buildNetwork, planWave, pointOnEdge, type Network, type Wave } from '@/features/observatory/neural'

/* ── Neural field ────────────────────────────────────────────────────────────
   The living background of the Today hero: one connected network that spans
   the whole plane. The word objects are its hubs — every element carrying
   `data-neural-id` is measured and becomes a node, and `data-neural-to` names
   the hubs it is linked to — so fibres end exactly where the objects are and
   follow them when the layout changes.

   Signals start at the topic (the first hub) and travel through the real
   connectivity: geometry and timing both come from features/observatory/
   neural.ts, and the fibre and the signal use the same curve.

   Cost control: one canvas, no blur filters, capped at 2x density; the loop
   stops while the hero is off-screen or the tab is hidden, and never starts
   when motion is reduced (a single still frame is drawn instead).
   Decorative: the same words are real text in the hero. */

interface Props {
  /** false = draw one still frame, no loop. */
  animate: boolean
  /** Element (by selector, inside the same parent) whose area stays calm so text keeps its contrast. */
  quietSelector?: string
}

const SPEED = 230        // px per second
const REST = 1400        // ms between waves
const TRAIL = 0.22       // fraction of an edge the signal's tail covers

interface Palette { fibre: string; link: string; node: string; far: string; signal: string; spark: string }

function readPalette(el: Element): Palette {
  const css = getComputedStyle(el)
  const v = (name: string) => css.getPropertyValue(name).trim()
  return {
    fibre: v('--o-on-night-2'), link: v('--o-night-cobalt'), node: v('--o-on-night'), far: v('--o-night-coral'),
    signal: v('--o-night-mint'), spark: v('--o-night-lime'),
  }
}

export function NeuralField({ animate, quietSelector = '.o-hero__text' }: Props) {
  const ref = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    const canvas = ref.current
    const host = canvas?.parentElement
    // No observers = not a real browser (the test DOM): nothing to draw on.
    if (!canvas || !host || typeof ResizeObserver === 'undefined' || typeof IntersectionObserver === 'undefined') return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    let alive = true

    let net: Network | null = null
    let wave: Wave | null = null
    let waveStart = 0
    let waveNo = 0
    let hubs = 0
    let quiet: DOMRect | null = null
    let origin = { x: 0, y: 0 }
    let palette = readPalette(host)
    let raf = 0
    let visible = true
    let seeds: number[] = []
    const pointer = { x: 0, y: 0, tx: 0, ty: 0 }
    const fine = window.matchMedia('(pointer: fine)').matches

    const layout = () => {
      const box = host.getBoundingClientRect()
      if (box.width < 40 || box.height < 40) return
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(box.width * dpr)
      canvas.height = Math.round(box.height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      origin = { x: box.left, y: box.top }
      palette = readPalette(host)

      const els = Array.from(host.querySelectorAll<HTMLElement>('[data-neural-id]'))
      const ids = els.map((el) => el.dataset.neuralId ?? '')
      const anchors = els.map((el) => {
        const r = el.getBoundingClientRect()
        return { x: r.left + r.width / 2 - box.left, y: r.top + r.height / 2 - box.top }
      })
      const links: [number, number][] = []
      els.forEach((el, i) => {
        for (const to of (el.dataset.neuralTo ?? '').split(' ').filter(Boolean)) {
          const j = ids.indexOf(to)
          if (j >= 0) links.push([i, j])
        }
      })
      hubs = anchors.length
      quiet = host.querySelector(quietSelector)?.getBoundingClientRect() ?? null
      // Denser tissue on large planes, never fewer than a handful of junctions on a phone.
      const spacing = Math.max(84, Math.min(132, Math.sqrt((box.width * box.height) / 46)))
      net = buildNetwork({ width: box.width, height: box.height, anchors, links, spacing, seed: 11 })
      seeds = net.nodes.map((_, i) => (i * 2654435761 % 1000) / 1000)
      wave = null
    }

    const startWave = (now: number) => {
      if (!net || net.nodes.length === 0) return
      // The topic speaks first; then each word object answers in turn.
      const source = hubs > 0 ? waveNo % hubs : 0
      wave = planWave(net, source, SPEED)
      waveStart = now
      waveNo++
    }

    const draw = (now: number, still: boolean) => {
      if (!net) return
      const { nodes, edges } = net
      ctx.clearRect(0, 0, net.width, net.height)
      pointer.x += (pointer.tx - pointer.x) * 0.06
      pointer.y += (pointer.ty - pointer.y) * 0.06

      // Where each node is this frame. Hubs (z = 0) never move, so a fibre's
      // end stays on its word object; junctions drift and answer the pointer
      // by depth, and the fibres are re-stroked from those same positions.
      const pos = nodes.map((n, i) => {
        if (still || n.z === 0) return { x: n.x, y: n.y }
        const ph = seeds[i] * Math.PI * 2
        const amp = 1.5 + n.z * 3.5
        const t = now / (7000 + seeds[i] * 4000)
        return {
          x: n.x + Math.cos(t * Math.PI * 2 + ph) * amp + pointer.x * n.z * 12,
          y: n.y + Math.sin(t * Math.PI * 2 + ph * 1.7) * amp + pointer.y * n.z * 9,
        }
      })
      const calm = (x: number, y: number) => {
        if (!quiet) return 1
        const qx = x + origin.x, qy = y + origin.y
        return qx > quiet.left - 12 && qx < quiet.right + 12 && qy > quiet.top - 12 && qy < quiet.bottom + 12 ? 0.3 : 1
      }

      ctx.lineCap = 'round'
      for (const e of edges) {
        const a = pos[e.a], b = pos[e.b]
        const depth = (nodes[e.a].z + nodes[e.b].z) / 2
        const k = calm((a.x + b.x) / 2, (a.y + b.y) / 2)
        ctx.beginPath()
        ctx.moveTo(a.x, a.y)
        ctx.quadraticCurveTo((a.x + b.x) / 2 + e.bx, (a.y + b.y) / 2 + e.by, b.x, b.y)
        ctx.strokeStyle = e.primary ? palette.link : palette.fibre
        ctx.globalAlpha = (e.primary ? 0.62 : 0.14 + depth * 0.3) * k
        ctx.lineWidth = e.primary ? 1.6 : 0.7 + depth * 0.9
        ctx.stroke()
      }

      const t = wave ? now - waveStart : -1
      nodes.forEach((n, i) => {
        if (n.kind === 'hub') return
        const p = pos[i]
        const k = calm(p.x, p.y)
        const since = wave && t >= wave.fireAt[i] ? t - wave.fireAt[i] : Infinity
        const flash = since < 520 ? 1 - since / 520 : 0
        if (flash > 0) {
          ctx.globalAlpha = 0.22 * flash * k
          ctx.fillStyle = palette.signal
          ctx.beginPath(); ctx.arc(p.x, p.y, 5 + n.z * 5 + (1 - flash) * 5, 0, Math.PI * 2); ctx.fill()
        }
        ctx.globalAlpha = (0.3 + n.z * 0.5 + flash * 0.4) * k
        // Depth by temperature as well as size: far junctions sit warm and dim, near ones cool and bright.
        ctx.fillStyle = flash > 0 ? palette.signal : n.z < 0.5 ? palette.far : palette.node
        ctx.beginPath(); ctx.arc(p.x, p.y, 1.2 + n.z * 1.5 + flash, 0, Math.PI * 2); ctx.fill()
      })

      if (wave && !still) {
        for (const h of wave.hops) {
          if (t < h.depart) continue
          const span = h.arrive - h.depart
          const s = (t - h.depart) / span
          if (s > 1 + TRAIL) continue
          const e = edges[h.edge]
          // Parameter runs from the firing node to the receiving one, on the edge's own curve.
          const at = (q: number) => pointOnEdge(e, pos[e.a], pos[e.b], h.from === e.a ? q : 1 - q)
          const head = Math.min(1, s)
          const tail = Math.max(0, s - TRAIL)
          const hp = at(head)
          const k = calm(hp.x, hp.y)
          const steps = 7
          for (let i = 0; i < steps; i++) {
            const q0 = tail + ((head - tail) * i) / steps
            const q1 = tail + ((head - tail) * (i + 1)) / steps
            const p0 = at(q0), p1 = at(q1)
            ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y)
            ctx.strokeStyle = e.primary ? palette.spark : palette.signal
            ctx.globalAlpha = ((i + 1) / steps) * 0.85 * k
            ctx.lineWidth = 1 + ((i + 1) / steps) * 1.4
            ctx.stroke()
          }
          if (s <= 1) {
            ctx.fillStyle = e.primary ? palette.spark : palette.signal
            ctx.globalAlpha = 0.2 * k
            ctx.beginPath(); ctx.arc(hp.x, hp.y, 6.5, 0, Math.PI * 2); ctx.fill()
            ctx.globalAlpha = 0.95 * k
            ctx.beginPath(); ctx.arc(hp.x, hp.y, 2.3, 0, Math.PI * 2); ctx.fill()
          }
        }
      }
      ctx.globalAlpha = 1
    }

    const frame = (now: number) => {
      raf = 0
      if (!wave || now - waveStart > wave.duration + REST) startWave(now)
      draw(now, false)
      if (visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const kick = () => {
      if (!animate) { draw(0, true); return }
      if (!raf && visible && !document.hidden) raf = requestAnimationFrame(frame)
    }
    const relayout = () => { layout(); kick() }

    relayout()
    // The word objects settle into place over their entrance; measure again once they have.
    const settle = window.setTimeout(relayout, 1100)
    const ro = new ResizeObserver(relayout)
    ro.observe(host)
    const io = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; kick() })
    io.observe(host)
    const onVisibility = () => kick()
    document.addEventListener('visibilitychange', onVisibility)
    const onMove = (ev: PointerEvent) => {
      const box = host.getBoundingClientRect()
      pointer.tx = ((ev.clientX - box.left) / box.width - 0.5) * 2
      pointer.ty = ((ev.clientY - box.top) / box.height - 0.5) * 2
    }
    const onLeave = () => { pointer.tx = 0; pointer.ty = 0 }
    if (animate && fine) {
      host.addEventListener('pointermove', onMove)
      host.addEventListener('pointerleave', onLeave)
    }
    void document.fonts?.ready.then(() => { if (alive) relayout() }).catch(() => undefined)

    return () => {
      alive = false
      if (raf) cancelAnimationFrame(raf)
      window.clearTimeout(settle)
      ro.disconnect()
      io.disconnect()
      document.removeEventListener('visibilitychange', onVisibility)
      host.removeEventListener('pointermove', onMove)
      host.removeEventListener('pointerleave', onLeave)
    }
  }, [animate, quietSelector])

  return <canvas ref={ref} className="o-neural" aria-hidden="true" />
}
