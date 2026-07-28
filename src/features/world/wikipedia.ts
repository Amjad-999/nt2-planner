/* ويكيبيديا — «اسألي كاتيا عن أي شيء».
   تُستعلَم النسختان العربية والهولندية معًا: العربية تشرح، والهولندية تعطي
   المصطلح والصياغة الأصلية — وهو بالضبط ما يحتاجه امتحان KNM (المعرفة
   بالمجتمع الهولندي) حيث يجب أن تعرف المفهوم وتسمّيه بالهولندية.
   لا مفتاح ولا تسجيل: واجهة MediaWiki العامة تسمح بـ CORS عبر origin=*
   ونقطة REST للملخّص تسمح به افتراضيًّا. */

import { getJson } from './http'

export interface WikiSummary {
  lang: 'nl' | 'ar'
  title: string
  extract: string
  url: string
}

interface SearchResponse {
  query?: { search?: { title?: string }[] }
}

interface SummaryResponse {
  title?: string
  extract?: string
  content_urls?: { desktop?: { page?: string } }
}

/** أفضل عنوان مقالة يطابق نصّ البحث في نسخة لغوية بعينها. */
async function bestTitle(lang: 'nl' | 'ar', query: string): Promise<string | null> {
  const u = `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&origin=*`
    + `&list=search&srlimit=1&srsearch=${encodeURIComponent(query)}`
  const j = await getJson<SearchResponse>(u)
  const t = j?.query?.search?.[0]?.title
  return t ? t : null
}

/** ملخّص المقالة (الفقرة الأولى) لعنوان معروف. */
async function summary(lang: 'nl' | 'ar', title: string): Promise<WikiSummary | null> {
  const u = `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
  const j = await getJson<SummaryResponse>(u)
  const extract = (j?.extract ?? '').trim()
  if (!extract) return null
  return {
    lang,
    title: j?.title ?? title,
    extract,
    url: j?.content_urls?.desktop?.page
      ?? `https://${lang}.wikipedia.org/wiki/${encodeURIComponent(title)}`,
  }
}

/** يبحث في النسختين بالتوازي. أي جانب قد يعود null وحده دون أن يُفشل الآخر. */
export async function wikiLookup(query: string): Promise<{ ar: WikiSummary | null; nl: WikiSummary | null }> {
  const q = query.trim()
  if (!q) return { ar: null, nl: null }

  const [arTitle, nlTitle] = await Promise.all([bestTitle('ar', q), bestTitle('nl', q)])
  const [ar, nl] = await Promise.all([
    arTitle ? summary('ar', arTitle) : Promise.resolve(null),
    nlTitle ? summary('nl', nlTitle) : Promise.resolve(null),
  ])
  return { ar, nl }
}
