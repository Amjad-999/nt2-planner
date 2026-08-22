/* عناوين أخبار هولندية — تدريب قراءة حقيقي يتجدّد يوميًّا.

   تحذير معماري مقصود توثيقه: هذا هو المصدر الوحيد هنا الذي يمرّ بوسيط
   خارجي. سبب ذلك مقيس لا مفترَض — feeds.nos.nl و nu.nl كلاهما يرفض CORS
   من المتصفّح (اختُبرا: TypeError: Failed to fetch)، وويكي‌الأخبار الهولندي
   ميّت فعليًّا (صفر مقالات جديدة). فلا سبيل مجاني بلا مفتاح إلى أخبار طازجة
   من المتصفّح مباشرةً.

   يترتّب على ذلك أن هذه الميزة أهشّ من أخواتها: الوسيط قد يبطئ أو يختفي أو
   يحدّ الطلبات. لذلك يُعامَل فشلها كحالة عادية لا استثنائية — تعود [] ولا
   تعطّل شيئًا. لو أردت متانة كاملة يومًا فالحلّ دالة Supabase تجلب التغذية
   من الخادم، وعندها يصير هذا الملف سطرين. */

import { getText } from './http'

const NOS_FEED = 'https://feeds.nos.nl/nosnieuwsalgemeen'
const PROXY = 'https://corsproxy.io/?url='

export interface NewsItem {
  title: string
  link: string
  /** ISO حين يوفّره المصدر */
  date?: string
}

/** يزيل وسوم CDATA ورموز HTML الشائعة من نصّ عنوان RSS. */
function clean(s: string): string {
  return s
    .replace(/^<!\[CDATA\[/, '')
    .replace(/\]\]>$/, '')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim()
}

export async function dutchNews(limit = 5): Promise<NewsItem[]> {
  const xml = await getText(PROXY + encodeURIComponent(NOS_FEED))
  if (!xml) return []

  try {
    const doc = new DOMParser().parseFromString(xml, 'application/xml')
    if (doc.querySelector('parsererror')) return []
    const out: NewsItem[] = []
    for (const item of Array.from(doc.querySelectorAll('item'))) {
      const title = clean(item.querySelector('title')?.textContent ?? '')
      const link = (item.querySelector('link')?.textContent ?? '').trim()
      if (!title || !link) continue
      const date = item.querySelector('pubDate')?.textContent?.trim()
      out.push({ title, link, ...(date ? { date } : {}) })
      if (out.length >= limit) break
    }
    return out
  } catch {
    return []
  }
}
