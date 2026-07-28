/* قاموس Wiktionary الهولندي — تعميق لنظام المفردات القائم.
   يعطي ما لا يعطيه القاموس المحلّي ولا MyMemory: النطق بالأبجدية الصوتية،
   تقطيع المقاطع، نوع الكلمة، وأمثلة حقيقية من الاستعمال.

   البنية المُستخرَجة (explaintext) نصّ عناوينه بعلامات =:
     == Nederlands ==            ← قسم اللغة (قد تليه لغات أخرى)
     ===== Uitspraak =====       ← النطق، يحوي سطر IPA
     ===== Woordafbreking =====  ← تقطيع المقاطع (lo·pen)
     ===== Woordherkomst =====   ← أصل الكلمة — يُتجاهَل عمدًا: طويل وتاريخي
                                   ولا يفيد متعلّم B1 في شيء
     ==== Werkwoord ====         ← نوع الكلمة، تليه المعاني والأمثلة
   الأمثلة تُسبَق بالرمز ▸ في نصّ ويكاموس. */

import { getJson } from './http'

export interface WordDetail {
  word: string
  ipa?: string
  syllables?: string
  /** نوع الكلمة بالهولندية كما يسمّيه ويكاموس (Werkwoord، Zelfstandig naamwoord…) */
  typeNL?: string
  typeAR?: string
  senses: string[]
  examples: string[]
  url: string
}

interface PagesResponse {
  query?: { pages?: Record<string, { extract?: string; missing?: string }> }
}

const TYPE_AR: Record<string, string> = {
  'Werkwoord': 'فعل',
  'Zelfstandig naamwoord': 'اسم',
  'Bijvoeglijk naamwoord': 'صفة',
  'Bijwoord': 'ظرف',
  'Voorzetsel': 'حرف جرّ',
  'Voornaamwoord': 'ضمير',
  'Telwoord': 'عدد',
  'Voegwoord': 'أداة ربط',
  'Tussenwerpsel': 'أداة تعجّب',
  'Lidwoord': 'أداة تعريف',
}

/** يقصّ قسم اللغة الهولندية وحده — الصفحة قد تحوي لغات أخرى بعده. */
function dutchSection(extract: string): string {
  const start = extract.indexOf('== Nederlands ==')
  if (start === -1) return ''
  const rest = extract.slice(start + '== Nederlands =='.length)
  // أوّل عنوان لغة تالٍ: «== X ==» بمستويين بالضبط
  const next = rest.search(/\n==\s[^=]+\s==\n/)
  return next === -1 ? rest : rest.slice(0, next)
}

/** محتوى عنوان فرعي بعينه داخل نصّ القسم. */
function heading(section: string, name: string): string {
  const re = new RegExp(`={3,5}\\s*${name}\\s*={3,5}\\n([\\s\\S]*?)(?=\\n={3,5}|$)`)
  return re.exec(section)?.[1]?.trim() ?? ''
}

export async function wiktionaryLookup(word: string): Promise<WordDetail | null> {
  const w = word.trim().toLowerCase()
  if (!w) return null

  const u = `https://nl.wiktionary.org/w/api.php?action=query&format=json&origin=*`
    + `&prop=extracts&explaintext=1&redirects=1&titles=${encodeURIComponent(w)}`
  const j = await getJson<PagesResponse>(u)
  const page = Object.values(j?.query?.pages ?? {})[0]
  if (!page || page.missing !== undefined) return null

  const section = dutchSection(page.extract ?? '')
  if (!section) return null

  const uitspraak = heading(section, 'Uitspraak')
  const ipa = /IPA:\s*\/?\s*([^/\n]+?)\s*\//.exec(uitspraak)?.[1]?.trim()
  const syllables = heading(section, 'Woordafbreking').split('\n')[0]?.trim() || undefined

  // نوع الكلمة: أوّل عنوان من المستوى الرابع ليس من الأقسام الوصفية
  const typeNL = Object.keys(TYPE_AR).find((t) => section.includes(`==== ${t} ====`))

  const senses: string[] = []
  const examples: string[] = []
  if (typeNL) {
    for (const raw of heading(section, typeNL).split('\n')) {
      const line = raw.trim()
      // أوّل سطر هو الكلمة نفسها؛ والفارغ لا يعني شيئًا
      if (!line || line.toLowerCase() === w) continue
      if (line.startsWith('▸')) {
        const ex = line.replace(/^▸\s*/, '').trim()
        if (ex.length > 8 && examples.length < 3) examples.push(ex)
        continue
      }
      // جملة مثال بلا رمز: تنتهي بنقطة وتحوي الكلمة
      if (/[.!?]$/.test(line) && line.toLowerCase().includes(w.slice(0, Math.max(3, w.length - 2)))) {
        if (examples.length < 3) examples.push(line)
        continue
      }
      if (senses.length < 3 && line.length < 120) senses.push(line)
    }
  }

  if (senses.length === 0 && examples.length === 0 && !ipa) return null

  return {
    word: w,
    ipa,
    syllables,
    typeNL,
    typeAR: typeNL ? TYPE_AR[typeNL] : undefined,
    senses,
    examples,
    url: `https://nl.wiktionary.org/wiki/${encodeURIComponent(w)}`,
  }
}
