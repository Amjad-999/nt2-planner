/* ── The hero's neural network: geometry and signal timing ───────────────────
   Pure functions, no DOM. The canvas in components/obs/NeuralField.tsx draws
   exactly what this module returns, so "the picture is connected" is a
   property that can be tested rather than eyeballed:

   • buildNetwork  lays out junction nodes across the whole plane, joins them
                   to each other and to the hubs (the word objects), and
                   guarantees ONE connected graph. No two fibres cross, so
                   every visual junction is a real node.
   • planWave      fires a signal from one node and works out, edge by edge,
                   when it leaves and when it arrives. A node passes the
                   signal on at the instant it first receives it.
   • pointOnEdge   is the single curve formula: fibres are stroked with it and
                   signals ride on it, so a signal can never leave its fibre.
   ─────────────────────────────────────────────────────────────────────────── */

export interface Anchor {
  /** Centre of a hub (a word object, a context chip), in plane pixels. */
  x: number
  y: number
}

export interface NNode {
  id: number
  x: number
  y: number
  /** 0 = on the hub plane (never moves), 1 = nearest to the viewer. */
  z: number
  kind: 'hub' | 'junction'
}

export interface NEdge {
  a: number
  b: number
  /** Control-point offset from the chord midpoint, in pixels. */
  bx: number
  by: number
  len: number
  /** A meaning link between two hubs (drawn stronger), not ambient tissue. */
  primary: boolean
}

export interface Network {
  width: number
  height: number
  nodes: NNode[]
  edges: NEdge[]
  /** For each node, the indices of the edges that end on it. */
  adjacency: number[][]
}

export interface Hop {
  edge: number
  from: number
  to: number
  /** Milliseconds after the wave starts. */
  depart: number
  arrive: number
}

export interface Wave {
  hops: Hop[]
  /** When each node fires (ms after the wave starts); Infinity if unreachable. */
  fireAt: number[]
  duration: number
}

interface BuildOptions {
  width: number
  height: number
  anchors: Anchor[]
  /** Pairs of anchor indices that are meaningfully linked. */
  links: [number, number][]
  /** Target distance between junctions, in pixels. */
  spacing?: number
  seed?: number
}

/* mulberry32 — a tiny seeded generator, so a given size always grows the same
   network (no reshuffle on re-render, and the tests are deterministic). */
function rng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y)

/** Do the straight chords p1-p2 and p3-p4 properly cross (shared ends do not count)? */
function crosses(p1: NNode, p2: NNode, p3: NNode, p4: NNode): boolean {
  const o = (a: NNode, b: NNode, c: NNode) => Math.sign((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x))
  return o(p1, p2, p3) !== o(p1, p2, p4) && o(p3, p4, p1) !== o(p3, p4, p2)
}

export function buildNetwork(opts: BuildOptions): Network {
  const { width, height, anchors, links } = opts
  const rand = rng(opts.seed ?? 7)
  const spacing = Math.max(72, opts.spacing ?? 120)
  const nodes: NNode[] = anchors.map((a, id) => ({ id, x: a.x, y: a.y, z: 0, kind: 'hub' as const }))
  const hubCount = nodes.length

  // Junctions: a jittered grid over the WHOLE plane, plus a ring just outside
  // it so fibres run off the frame instead of stopping short of the edge.
  const cols = Math.max(2, Math.round(width / spacing))
  const rows = Math.max(2, Math.round(height / spacing))
  const cw = width / cols
  const ch = height / rows
  for (let r = -1; r <= rows; r++) {
    for (let c = -1; c <= cols; c++) {
      const outside = r < 0 || c < 0 || r === rows || c === cols
      // The outer ring is sparse: every other cell is enough to carry a fibre out.
      if (outside && (r + c) % 2 !== 0) { rand(); rand(); rand(); continue }
      const x = (c + 0.5 + (rand() - 0.5) * 0.62) * cw
      const y = (r + 0.5 + (rand() - 0.5) * 0.62) * ch
      const z = 0.25 + rand() * 0.75
      // A junction sitting under a word object would read as a broken strand.
      if (anchors.some((a) => dist(a, { x, y }) < spacing * 0.5)) continue
      nodes.push({ id: nodes.length, x, y, z, kind: 'junction' })
    }
  }

  const edges: NEdge[] = []
  const seen = new Set<string>()
  const adjacency: number[][] = nodes.map(() => [])
  const key = (a: number, b: number) => (a < b ? `${a}:${b}` : `${b}:${a}`)

  const blocked = (a: number, b: number) =>
    edges.some((e) => e.a !== a && e.a !== b && e.b !== a && e.b !== b && crosses(nodes[a], nodes[b], nodes[e.a], nodes[e.b]))

  const add = (a: number, b: number, primary: boolean, force = false): boolean => {
    if (a === b || seen.has(key(a, b))) return false
    if (!force && blocked(a, b)) return false
    const len = dist(nodes[a], nodes[b])
    // A gentle bow, perpendicular to the chord. Small enough that two fibres
    // whose chords do not cross cannot be bent into crossing.
    const bend = (primary ? 0.1 : 0.05 + rand() * 0.07) * (rand() < 0.5 ? -1 : 1)
    const dx = nodes[b].x - nodes[a].x
    const dy = nodes[b].y - nodes[a].y
    seen.add(key(a, b))
    adjacency[a].push(edges.length)
    adjacency[b].push(edges.length)
    edges.push({ a, b, bx: -dy * bend, by: dx * bend, len, primary })
    return true
  }

  // 1. Meaning links between hubs come first; everything else routes around them.
  for (const [a, b] of links) if (a < hubCount && b < hubCount) add(a, b, true, true)

  const nearest = (from: number, pool: (n: NNode) => boolean) =>
    nodes.filter((n) => n.id !== from && pool(n)).sort((p, q) => dist(nodes[from], p) - dist(nodes[from], q))

  // 2. Every hub grows two fibres into the tissue around it.
  for (let h = 0; h < hubCount; h++) {
    let grown = 0
    for (const n of nearest(h, (m) => m.kind === 'junction')) {
      if (grown === 2) break
      if (add(h, n.id, false)) grown++
    }
  }

  // 3. Each junction joins its nearest neighbours (branching: degree 2 to 4).
  for (let j = hubCount; j < nodes.length; j++) {
    let joined = adjacency[j].length
    for (const n of nearest(j, (m) => m.kind === 'junction')) {
      if (joined >= 3 || dist(nodes[j], n) > spacing * 1.9) break
      if (adjacency[n.id].length >= 4) continue
      if (add(j, n.id, false)) joined++
    }
  }

  // 4. One network, not several: join stray components by their closest pair.
  const parent = nodes.map((_, i) => i)
  const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])))
  const unite = (a: number, b: number) => { parent[find(a)] = find(b) }
  for (const e of edges) unite(e.a, e.b)
  for (let guard = 0; guard < nodes.length; guard++) {
    const root = find(0)
    let best: [number, number, number] | null = null
    let bestAny: [number, number, number] | null = null
    for (const p of nodes) {
      if (find(p.id) !== root) continue
      for (const q of nodes) {
        if (find(q.id) === root) continue
        const d = dist(p, q)
        if (!bestAny || d < bestAny[2]) bestAny = [p.id, q.id, d]
        if ((!best || d < best[2]) && !blocked(p.id, q.id)) best = [p.id, q.id, d]
      }
    }
    const pick = best ?? bestAny
    if (!pick) break
    add(pick[0], pick[1], false, true)
    unite(pick[0], pick[1])
  }

  return { width, height, nodes, edges, adjacency }
}

/** Point at parameter t (0 at edge.a, 1 at edge.b) on the edge's curve. */
export function pointOnEdge(
  e: NEdge, a: { x: number; y: number }, b: { x: number; y: number }, t: number,
): { x: number; y: number } {
  const cx = (a.x + b.x) / 2 + e.bx
  const cy = (a.y + b.y) / 2 + e.by
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * cx + t * t * b.x, y: u * u * a.y + 2 * u * t * cy + t * t * b.y }
}

/**
 * A signal fired from `source`. Each node fires once, at the moment the first
 * signal reaches it, and sends that signal down every edge whose far end has
 * not fired yet. So every edge carries exactly one signal, in one direction,
 * and a signal always departs from a node at the time that node was reached.
 */
export function planWave(net: Network, source: number, speed: number): Wave {
  const fireAt = net.nodes.map(() => Infinity)
  const done = net.nodes.map(() => false)
  const hops: Hop[] = []
  if (!net.nodes[source] || speed <= 0) return { hops, fireAt, duration: 0 }
  fireAt[source] = 0
  for (;;) {
    let u = -1
    for (let i = 0; i < fireAt.length; i++) if (!done[i] && fireAt[i] < Infinity && (u < 0 || fireAt[i] < fireAt[u])) u = i
    if (u < 0) break
    done[u] = true
    for (const ei of net.adjacency[u]) {
      const e = net.edges[ei]
      const v = e.a === u ? e.b : e.a
      if (done[v]) continue // it fired first: its own signal is already on this edge
      const arrive = fireAt[u] + (e.len / speed) * 1000
      hops.push({ edge: ei, from: u, to: v, depart: fireAt[u], arrive })
      if (arrive < fireAt[v]) fireAt[v] = arrive
    }
  }
  const duration = hops.reduce((m, h) => Math.max(m, h.arrive), 0)
  return { hops, fireAt, duration }
}
