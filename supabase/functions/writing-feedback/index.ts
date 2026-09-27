/**
 * Supabase Edge Function — writing-feedback
 *
 * الغرض: تصحيح نصّ الكتابة بالذكاء الاصطناعي دون أن يظهر المفتاح في المتصفّح.
 *
 * The browser calls this function; this function calls the model API using a key
 * stored as a Supabase secret. The key is never sent to, or readable by, the client.
 *
 * Deploy and configure once — see DEPLOY_AI.md in the project root.
 *
 * This file runs on Deno inside Supabase, NOT in the Vite app. It is intentionally
 * excluded from the app's TypeScript build (see tsconfig.app.json).
 */

// @ts-nocheck — Deno runtime, not type-checked by the app's tsc build.

const MODEL = 'claude-sonnet-5'
const MAX_INPUT_CHARS = 4000

/* Daily ceiling per caller. The function is reachable by anyone holding the
   anon key — which is public by design and ships in the browser bundle — so
   without a ceiling the model bill is unbounded and nothing would reveal abuse
   until it appeared on an invoice. */
const DAILY_LIMIT = Number(Deno.env.get('AI_DAILY_LIMIT') ?? '40')

/* Optional origin allowlist, comma-separated, e.g.
     supabase secrets set ALLOWED_ORIGINS="https://nt2-planner.vercel.app"
   Left unset it keeps the previous permissive behaviour, so tightening this is
   a deliberate step and never silently breaks an unknown deployment. CORS is
   defence in depth only — it stops other web pages, not a direct client — the
   quota above is what actually bounds the cost. */
const ALLOWED_ORIGINS = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((o: string) => o.trim())
  .filter(Boolean)

function corsFor(origin: string | null): Record<string, string> {
  const allow =
    ALLOWED_ORIGINS.length === 0
      ? '*'
      : origin && ALLOWED_ORIGINS.includes(origin)
        ? origin
        : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }
}

function json(body: unknown, status = 200, cors: Record<string, string> = corsFor(null)): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

/** Identity for quota accounting: the signed-in user when there is one, else
 *  the client address. Guests keep working — the app deliberately supports a
 *  guest mode, so requiring sign-in here would remove a working feature. */
function callerId(req: Request): string {
  const auth = req.headers.get('authorization') ?? ''
  const token = auth.replace(/^Bearer\s+/i, '')
  try {
    // Signature already verified by the platform gateway before this function
    // runs, so reading the payload is enough to identify the caller.
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (payload?.role === 'authenticated' && payload?.sub) return `user:${payload.sub}`
  } catch {
    // anon key, malformed token, or no token — fall through to the address
  }
  const fwd = req.headers.get('x-forwarded-for') ?? ''
  return `ip:${fwd.split(',')[0].trim() || 'unknown'}`
}

/**
 * Counts one call against today's quota.
 *
 * Deliberately FAILS OPEN: this runs against a table that may not exist yet on
 * a project that has not applied the migration, and this file cannot be tested
 * before it is deployed. A quota bug must never take down a feature that works
 * today — so any storage problem allows the request and logs instead.
 *
 * Uses the service-role key so the counter is not reachable, or resettable,
 * from the browser.
 */
async function withinQuota(id: string): Promise<{ ok: boolean; used: number }> {
  const url = Deno.env.get('SUPABASE_URL')
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!url || !key) return { ok: true, used: 0 }

  const day = new Date().toISOString().slice(0, 10)
  const headers = {
    apikey: key,
    Authorization: `Bearer ${key}`,
    'Content-Type': 'application/json',
    Prefer: 'resolution=merge-duplicates,return=representation',
  }

  try {
    const res = await fetch(`${url}/rest/v1/rpc/bump_ai_usage`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ p_caller: id, p_day: day }),
    })
    if (!res.ok) {
      console.warn('[writing-feedback] quota unavailable, allowing request:', res.status)
      return { ok: true, used: 0 }
    }
    const used = Number(await res.json())
    if (!Number.isFinite(used)) return { ok: true, used: 0 }
    return { ok: used <= DAILY_LIMIT, used }
  } catch (e) {
    console.warn('[writing-feedback] quota check failed, allowing request:', e?.message ?? e)
    return { ok: true, used: 0 }
  }
}

interface TaskInfo {
  titleNl: string
  briefNl: string
  kind: string
  register: string
  minWords: number
  maxWords: number
  points: string[]
}

function buildPrompt(text: string, task: TaskInfo): string {
  return [
    'Je bent examinator voor het Nederlandse Staatsexamen NT2, niveau B1.',
    'Beoordeel de onderstaande tekst van een cursist streng maar eerlijk, zoals DUO dat doet.',
    '',
    `Opdracht: ${task.titleNl}`,
    `Soort tekst: ${task.kind}`,
    `Register: ${task.register === 'formeel' ? 'formeel (u/uw verplicht)' : 'informeel mag'}`,
    `Woordenaantal: ${task.minWords} tot ${task.maxWords}`,
    'Verplichte inhoudspunten:',
    ...task.points.map((p, i) => `${i + 1}. ${p}`),
    '',
    'Volledige opdrachtomschrijving:',
    task.briefNl,
    '',
    'Tekst van de cursist:',
    '"""',
    text,
    '"""',
    '',
    'Antwoord met UITSLUITEND geldige JSON, zonder uitleg eromheen, in exact deze vorm:',
    '{',
    '  "scores": { "inhoud": 0-100, "taal": 0-100, "woordenschat": 0-100, "vorm": 0-100 },',
    '  "totaal": 0-100,',
    '  "correctedNl": "de tekst van de cursist, verbeterd, zelfde bedoeling en ongeveer zelfde lengte",',
    '  "issues": [ { "fout": "fragment zoals de cursist het schreef", "goed": "het verbeterde fragment", "uitlegAr": "شرح موجز بالعربية" } ],',
    '  "modelNl": "een sterker voorbeeldantwoord op B1-niveau dat alle punten dekt",',
    '  "samenvattingAr": "حكم موجز بالعربية في سطر أو سطرين"',
    '}',
    '',
    'Regels:',
    '- Alle uitleg in "uitlegAr" en "samenvattingAr" moet in het Arabisch zijn.',
    '- Alle Nederlandse velden blijven in het Nederlands.',
    '- Maximaal 12 items in "issues"; kies de belangrijkste.',
    '- Verzin geen fouten die er niet staan.',
    '- Gebruik geen Arabisch-Indische cijfers.',
  ].join('\n')
}

Deno.serve(async (req: Request) => {
  const cors = corsFor(req.headers.get('origin'))
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405, cors)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'server not configured' }, 500, cors)

  let body: { text?: string; task?: TaskInfo }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400, cors)
  }

  const text = (body.text ?? '').slice(0, MAX_INPUT_CHARS).trim()
  const task = body.task
  if (!text || !task || !Array.isArray(task.points)) {
    return json({ error: 'missing text or task' }, 400, cors)
  }

  /* Charged before the upstream call, not after: a caller who hangs up mid
     request must still consume their allowance, or the ceiling is trivial to
     bypass by aborting. 429 is what the client already treats as "busy, retry
     later", so no client change is needed. */
  const quota = await withinQuota(callerId(req))
  if (!quota.ok) {
    return json({ error: 'daily limit reached', limit: DAILY_LIMIT }, 429, cors)
  }

  let upstream: Response
  try {
    upstream = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 2000,
        messages: [{ role: 'user', content: buildPrompt(text, task) }],
      }),
    })
  } catch {
    return json({ error: 'upstream unreachable' }, 502, cors)
  }

  if (upstream.status === 429) return json({ error: 'rate limited' }, 429, cors)
  if (!upstream.ok) return json({ error: 'upstream error', status: upstream.status }, 502, cors)

  let raw: string
  try {
    const data = await upstream.json()
    raw = (data?.content ?? [])
      .filter((b: { type?: string }) => b?.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('')
      .trim()
  } catch {
    return json({ error: 'bad upstream body' }, 502, cors)
  }

  // The model is asked for bare JSON, but a fenced block is a common slip.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) raw = fence[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return json({ error: 'no json in reply' }, 502, cors)

  try {
    return json(JSON.parse(raw.slice(start, end + 1)), 200, cors)
  } catch {
    return json({ error: 'unparsable reply' }, 502, cors)
  }
})
