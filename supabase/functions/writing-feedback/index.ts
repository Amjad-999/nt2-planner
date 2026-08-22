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

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
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
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return json({ error: 'method not allowed' }, 405)

  const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
  if (!apiKey) return json({ error: 'server not configured' }, 500)

  let body: { text?: string; task?: TaskInfo }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid json' }, 400)
  }

  const text = (body.text ?? '').slice(0, MAX_INPUT_CHARS).trim()
  const task = body.task
  if (!text || !task || !Array.isArray(task.points)) {
    return json({ error: 'missing text or task' }, 400)
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
    return json({ error: 'upstream unreachable' }, 502)
  }

  if (upstream.status === 429) return json({ error: 'rate limited' }, 429)
  if (!upstream.ok) return json({ error: 'upstream error', status: upstream.status }, 502)

  let raw: string
  try {
    const data = await upstream.json()
    raw = (data?.content ?? [])
      .filter((b: { type?: string }) => b?.type === 'text')
      .map((b: { text?: string }) => b.text ?? '')
      .join('')
      .trim()
  } catch {
    return json({ error: 'bad upstream body' }, 502)
  }

  // The model is asked for bare JSON, but a fenced block is a common slip.
  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence) raw = fence[1].trim()
  const start = raw.indexOf('{')
  const end = raw.lastIndexOf('}')
  if (start === -1 || end === -1) return json({ error: 'no json in reply' }, 502)

  try {
    return json(JSON.parse(raw.slice(start, end + 1)))
  } catch {
    return json({ error: 'unparsable reply' }, 502)
  }
})
