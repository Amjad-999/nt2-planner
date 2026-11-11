import { describe, it, expect } from 'vitest'
import { buildNetwork, planWave, pointOnEdge, type Network } from '@/features/observatory/neural'

/* The hero's network has to be ONE connected structure whose signals follow
   its real wiring. These are the properties the old picture lacked: its lines
   were independent strokes, some of them pointing at labels that were not
   there. */

const HUBS = [{ x: 300, y: 250 }, { x: 150, y: 120 }, { x: 460, y: 110 }, { x: 140, y: 390 }, { x: 470, y: 400 }, { x: 300, y: 40 }]
const LINKS: [number, number][] = [[1, 0], [2, 0], [3, 0], [4, 0], [1, 5], [2, 5]]
const SIZES = [[1130, 490], [760, 620], [356, 700], [288, 640]] as const

const nets: [string, Network][] = SIZES.map(([width, height]) => [
  `${width}x${height}`,
  buildNetwork({ width, height, anchors: HUBS.map((h) => ({ x: (h.x / 600) * width * 0.5, y: (h.y / 500) * height * 0.6 })), links: LINKS, seed: 11 }),
])

function reachable(net: Network, from: number): Set<number> {
  const seen = new Set([from])
  const queue = [from]
  while (queue.length) {
    const u = queue.pop()!
    for (const ei of net.adjacency[u]) {
      const e = net.edges[ei]
      const v = e.a === u ? e.b : e.a
      if (!seen.has(v)) { seen.add(v); queue.push(v) }
    }
  }
  return seen
}

describe.each(nets)('neural network at %s', (_size, net) => {
  it('is a single connected graph that includes every hub', () => {
    expect(reachable(net, 0).size).toBe(net.nodes.length)
  })

  it('ends every fibre on two real, distinct nodes and never duplicates one', () => {
    const keys = new Set<string>()
    for (const e of net.edges) {
      expect(net.nodes[e.a]).toBeDefined()
      expect(net.nodes[e.b]).toBeDefined()
      expect(e.a).not.toBe(e.b)
      keys.add([Math.min(e.a, e.b), Math.max(e.a, e.b)].join(':'))
    }
    expect(keys.size).toBe(net.edges.length)
  })

  it('draws each fibre from its first node exactly to its second', () => {
    for (const e of net.edges) {
      const a = net.nodes[e.a], b = net.nodes[e.b]
      expect(pointOnEdge(e, a, b, 0)).toEqual({ x: a.x, y: a.y })
      const end = pointOnEdge(e, a, b, 1)
      expect(end.x).toBeCloseTo(b.x, 6)
      expect(end.y).toBeCloseTo(b.y, 6)
    }
  })

  it('keeps the hubs fixed on their plane and carries every meaning link', () => {
    net.nodes.filter((n) => n.kind === 'hub').forEach((n) => expect(n.z).toBe(0))
    for (const [a, b] of LINKS) {
      expect(net.edges.some((e) => e.primary && ((e.a === a && e.b === b) || (e.a === b && e.b === a)))).toBe(true)
    }
  })

  it('spreads across the plane and grows longer than the hub-to-hub links alone', () => {
    const xs = net.nodes.map((n) => n.x), ys = net.nodes.map((n) => n.y)
    expect(Math.min(...xs)).toBeLessThan(net.width * 0.15)
    expect(Math.max(...xs)).toBeGreaterThan(net.width * 0.85)
    expect(Math.min(...ys)).toBeLessThan(net.height * 0.15)
    expect(Math.max(...ys)).toBeGreaterThan(net.height * 0.85)
    const total = net.edges.reduce((s, e) => s + e.len, 0)
    const primary = net.edges.filter((e) => e.primary).reduce((s, e) => s + e.len, 0)
    expect(total).toBeGreaterThan(primary * 3)
  })

  it('has no crossing between ambient fibres, so every visual junction is a node', () => {
    const o = (p: { x: number; y: number }, q: { x: number; y: number }, r: { x: number; y: number }) =>
      Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x))
    const ambient = net.edges.filter((e) => !e.primary)
    let crossings = 0
    for (let i = 0; i < ambient.length; i++) {
      for (let j = i + 1; j < ambient.length; j++) {
        const e = ambient[i], f = ambient[j]
        if (e.a === f.a || e.a === f.b || e.b === f.a || e.b === f.b) continue
        const [p1, p2, p3, p4] = [net.nodes[e.a], net.nodes[e.b], net.nodes[f.a], net.nodes[f.b]]
        if (o(p1, p2, p3) !== o(p1, p2, p4) && o(p3, p4, p1) !== o(p3, p4, p2)) crossings++
      }
    }
    // Joining a stray component may force one fibre across another; nothing else may.
    expect(crossings).toBeLessThanOrEqual(1)
  })

  describe('a signal fired from the topic', () => {
    const SPEED = 230
    const wave = planWave(net, 0, SPEED)

    it('reaches every node, starting at the source', () => {
      expect(wave.fireAt[0]).toBe(0)
      expect(wave.fireAt.every((t) => Number.isFinite(t))).toBe(true)
    })

    it('uses every fibre exactly once, in one direction', () => {
      expect(wave.hops.map((h) => h.edge).sort((a, b) => a - b)).toEqual(net.edges.map((_, i) => i))
    })

    it('leaves a junction at the instant the junction was reached, never before', () => {
      for (const h of wave.hops) {
        expect(h.depart).toBe(wave.fireAt[h.from])
        // nothing departs from a node that no earlier hop (or the source) has lit
        if (h.from !== 0) expect(wave.hops.some((p) => p.to === h.from && p.arrive === h.depart)).toBe(true)
      }
    })

    it('travels each fibre at the same speed, so longer fibres take longer', () => {
      for (const h of wave.hops) {
        expect(h.arrive - h.depart).toBeCloseTo((net.edges[h.edge].len / SPEED) * 1000, 6)
      }
      expect(wave.duration).toBe(Math.max(...wave.hops.map((h) => h.arrive)))
    })

    it('only ever moves between nodes that share the fibre it is on', () => {
      for (const h of wave.hops) {
        const e = net.edges[h.edge]
        expect([e.a, e.b].sort()).toEqual([h.from, h.to].sort())
      }
    })
  })
})

describe('network construction is deterministic', () => {
  it('grows the same network for the same size and seed', () => {
    const make = () => buildNetwork({ width: 900, height: 500, anchors: HUBS, links: LINKS, seed: 11 })
    expect(make()).toEqual(make())
  })

  it('survives having no hubs at all', () => {
    const net = buildNetwork({ width: 400, height: 300, anchors: [], links: [] })
    expect(net.nodes.length).toBeGreaterThan(3)
    expect(reachable(net, 0).size).toBe(net.nodes.length)
    expect(planWave(net, 99, 200).hops).toEqual([])
  })
})
