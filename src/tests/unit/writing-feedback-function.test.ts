import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

/**
 * Tests the real edge function source, not a copy of it.
 *
 * supabase/functions/writing-feedback/index.ts runs on Deno in production and
 * is excluded from the app's tsc build, so nothing used to exercise it before
 * a deploy — the one file in the project that spends money and holds a secret.
 * Stubbing globalThis.Deno lets the actual handler run here.
 *
 * The focus is the cost ceiling: a public endpoint that calls a paid model.
 */

type Handler = (req: Request) => Promise<Response>

interface Harness {
  handler: Handler
  fetchMock: ReturnType<typeof vi.fn>
  rpcCalls: { caller: string; day: string }[]
}

const MODEL_REPLY = {
  content: [{
    type: 'text',
    text: JSON.stringify({
      scores: { inhoud: 80, taal: 70, woordenschat: 75, vorm: 90 },
      totaal: 79,
      correctedNl: 'Verbeterde tekst.',
      issues: [],
      modelNl: 'Voorbeeld.',
      samenvattingAr: 'جيّد.',
    }),
  }],
}

async function load(opts: {
  env?: Record<string, string>
  /** running total the quota RPC reports back, or 'fail' to break the call */
  quota?: number | 'fail'
} = {}): Promise<Harness> {
  vi.resetModules()

  const env: Record<string, string> = {
    ANTHROPIC_API_KEY: 'test-key',
    SUPABASE_URL: 'https://stub.supabase.co',
    SUPABASE_SERVICE_ROLE_KEY: 'service-key',
    ...opts.env,
  }

  let captured: Handler | null = null
  vi.stubGlobal('Deno', {
    env: { get: (k: string) => env[k] },
    serve: (fn: Handler) => { captured = fn },
  })

  const rpcCalls: { caller: string; day: string }[] = []
  const fetchMock = vi.fn(async (url: string, init: RequestInit) => {
    if (String(url).includes('bump_ai_usage')) {
      const body = JSON.parse(String(init.body))
      rpcCalls.push({ caller: body.p_caller, day: body.p_day })
      if (opts.quota === 'fail') return new Response('boom', { status: 500 })
      return new Response(JSON.stringify(opts.quota ?? 1), { status: 200 })
    }
    return new Response(JSON.stringify(MODEL_REPLY), { status: 200 })
  })
  vi.stubGlobal('fetch', fetchMock)

  await import('../../../supabase/functions/writing-feedback/index.ts')
  if (!captured) throw new Error('the function never registered a handler')
  return { handler: captured, fetchMock, rpcCalls }
}

const TASK = {
  titleNl: 'Klacht', briefNl: 'Schrijf een klacht.', kind: 'brief',
  register: 'formeel', minWords: 50, maxWords: 100, points: ['reden'],
}

function post(body: unknown, headers: Record<string, string> = {}) {
  return new Request('https://fn.test/writing-feedback', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

/** A token shaped like a signed-in user's, as the gateway would have verified. */
function userJwt(sub: string) {
  const payload = btoa(JSON.stringify({ role: 'authenticated', sub }))
  return `header.${payload}.signature`
}

afterEach(() => {
  vi.unstubAllGlobals()
  vi.resetModules()
})

beforeEach(() => {
  vi.resetModules()
})

describe('writing-feedback edge function', () => {
  it('answers a well-formed request', async () => {
    const { handler } = await load()
    const res = await handler(post({ text: 'Beste meneer, ik schrijf u.', task: TASK }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.totaal).toBe(79)
  })

  it('refuses a caller past the daily ceiling', async () => {
    const { handler } = await load({ env: { AI_DAILY_LIMIT: '5' }, quota: 6 })
    const res = await handler(post({ text: 'Hallo.', task: TASK }))
    expect(res.status).toBe(429)
    expect((await res.json()).limit).toBe(5)
  })

  it('allows the call that lands exactly on the ceiling', async () => {
    const { handler } = await load({ env: { AI_DAILY_LIMIT: '5' }, quota: 5 })
    const res = await handler(post({ text: 'Hallo.', task: TASK }))
    expect(res.status).toBe(200)
  })

  it('charges the quota BEFORE calling the paid model', async () => {
    const { handler, fetchMock } = await load({ env: { AI_DAILY_LIMIT: '1' }, quota: 2 })
    await handler(post({ text: 'Hallo.', task: TASK }))
    const targets = fetchMock.mock.calls.map((c) => String(c[0]))
    expect(targets.some((u) => u.includes('bump_ai_usage'))).toBe(true)
    // The whole point of the ceiling: no spend once it is exceeded.
    expect(targets.some((u) => u.includes('api.anthropic.com'))).toBe(false)
  })

  it('fails OPEN when the quota store is unavailable — never takes the feature down', async () => {
    const { handler } = await load({ quota: 'fail' })
    const res = await handler(post({ text: 'Hallo.', task: TASK }))
    expect(res.status).toBe(200)
  })

  it('counts a signed-in user by identity, not by address', async () => {
    const { rpcCalls, handler } = await load()
    await handler(post({ text: 'Hallo.', task: TASK }, { authorization: `Bearer ${userJwt('user-42')}` }))
    expect(rpcCalls[0].caller).toBe('user:user-42')
  })

  it('falls back to the client address for an anonymous caller', async () => {
    const { rpcCalls, handler } = await load()
    await handler(post({ text: 'Hallo.', task: TASK }, { 'x-forwarded-for': '203.0.113.9, 10.0.0.1' }))
    expect(rpcCalls[0].caller).toBe('ip:203.0.113.9')
  })

  it('rejects a non-POST request', async () => {
    const { handler } = await load()
    const res = await handler(new Request('https://fn.test/x', { method: 'GET' }))
    expect(res.status).toBe(405)
  })

  it('rejects a request with no text or task', async () => {
    const { handler } = await load()
    expect((await handler(post({ task: TASK }))).status).toBe(400)
    expect((await handler(post({ text: 'Hallo.' }))).status).toBe(400)
  })

  it('echoes an allowed origin back instead of a wildcard once configured', async () => {
    const { handler } = await load({ env: { ALLOWED_ORIGINS: 'https://nt2-planner.vercel.app' } })
    const res = await handler(post({ text: 'Hallo.', task: TASK }, { origin: 'https://nt2-planner.vercel.app' }))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('https://nt2-planner.vercel.app')
  })

  it('keeps the wildcard while no allowlist is configured — no silent breakage', async () => {
    const { handler } = await load()
    const res = await handler(post({ text: 'Hallo.', task: TASK }, { origin: 'https://elsewhere.test' }))
    expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
  })

  it('answers the CORS preflight', async () => {
    const { handler } = await load()
    const res = await handler(new Request('https://fn.test/x', { method: 'OPTIONS' }))
    expect(res.status).toBe(200)
    expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
  })
})
