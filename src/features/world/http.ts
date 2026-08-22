/* ناقل الشبكة المشترك لمصادر كاتيا الحيّة.
   قاعدتان تحكمان كل هذه الوحدة:
   1) لا شيء هنا يُسقِط الواجهة أبدًا — كل فشل يعود null والمستدعي يعرض بديلًا.
   2) لا انتظار مفتوح — مهلة صريحة، وإلّا علّق قرصُ كاتيا على "جارٍ التحميل"
      إلى الأبد على اتصال رديء (وهو الحال الشائع على الجوّال). */

const TIMEOUT_MS = 7000

/** GET يعود بـ JSON، أو null عند أي فشل/انقطاع/مهلة. لا يرمي استثناءً أبدًا. */
export async function getJson<T>(url: string, timeoutMs = TIMEOUT_MS): Promise<T | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) return null
    return (await r.json()) as T
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** نفس العقد لكن للنصّ الخام (RSS مثلًا). */
export async function getText(url: string, timeoutMs = TIMEOUT_MS): Promise<string | null> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return null
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), timeoutMs)
  try {
    const r = await fetch(url, { signal: ctrl.signal })
    if (!r.ok) return null
    return await r.text()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}
