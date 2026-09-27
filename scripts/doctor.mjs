#!/usr/bin/env node
/**
 * فحص شامل بلغة مفهومة — `npm run doctor`
 *
 * Written for the owner, who is not a developer. Every other script in this
 * folder reports to a machine or to someone who already knows what a lockfile
 * is; this one reports to a person, in Arabic, and always ends with the single
 * next thing to do.
 *
 * It never changes anything. Running it is always safe.
 */
import { execSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import dns from 'node:dns/promises'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

const G = '\x1b[32m', R = '\x1b[31m', Y = '\x1b[33m', D = '\x1b[2m', O = '\x1b[0m'
const OK = `${G}[ سليم ]${O}`
const NO = `${R}[ خطأ  ]${O}`
const WARN = `${Y}[ تنبيه ]${O}`

const todo = []
const line = (mark, label, note = '') => console.log(`${mark} ${label}${note ? `  ${D}${note}${O}` : ''}`)

console.log('\nفحص مشروع NT2 Planner\n' + '─'.repeat(46) + '\n')

/* ── 1. الأدوات الأساسية ── */
const major = Number(process.versions.node.split('.')[0])
if (major >= 20) line(OK, 'إصدار Node', `v${process.versions.node}`)
else {
  line(NO, 'إصدار Node قديم', `v${process.versions.node}`)
  todo.push('ثبّت أحدث إصدار من Node من nodejs.org ثم أعد تشغيل هذا الفحص.')
}

if (existsSync(resolve(root, 'node_modules'))) line(OK, 'الحزم مثبَّتة')
else {
  line(NO, 'الحزم غير مثبَّتة')
  todo.push('شغّل هذا الأمر مرّة واحدة:  npm install')
}

/* ── 2. بوّابات الجودة ── */
console.log('')
const gates = [
  ['typecheck', 'فحص الأنواع'],
  ['lint', 'تدقيق الكود'],
  ['test', 'الاختبارات'],
  ['check:digits', 'الأرقام الإنجليزية فقط'],
  ['check:exams', 'ملفّات الامتحانات موجودة'],
  ['check:docs', 'ملفّات الإرشاد دقيقة'],
  ['build', 'بناء النسخة النهائية'],
]

let broken = 0
for (const [script, label] of gates) {
  const cmd = script === 'test' ? 'npm test' : `npm run ${script}`
  try {
    execSync(cmd, { cwd: root, stdio: 'pipe' })
    line(OK, label)
  } catch {
    line(NO, label, cmd)
    broken++
  }
}
if (broken > 0) {
  todo.push(`${broken} فحصًا أخفق. شغّل الأمر المكتوب بجانب كل سطر أحمر لترى التفصيل، ولا ترفع تغييراتك قبل أن تصير كلّها خضراء.`)
}

/* ── 3. الاتصال بالخدمة السحابية ── */
console.log('')
function readEnv(name) {
  const file = resolve(root, name)
  if (!existsSync(file)) return {}
  const out = {}
  for (const raw of readFileSync(file, 'utf8').split('\n')) {
    const t = raw.trim()
    if (!t || t.startsWith('#')) continue
    const eq = t.indexOf('=')
    if (eq > 0) out[t.slice(0, eq).trim()] = t.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
  return out
}

const env = { ...readEnv('.env.production'), ...readEnv('.env') }
const url = process.env.VITE_SUPABASE_URL || env.VITE_SUPABASE_URL

if (!url) {
  line(WARN, 'الخدمة السحابية غير مضبوطة', 'التطبيق يعمل محلّيًّا بلا مزامنة')
} else {
  let host = null
  try { host = new URL(url).hostname } catch { /* شكل غير صالح */ }
  if (!host) {
    line(NO, 'عنوان الخدمة السحابية غير صالح')
    todo.push('القيمة في ملفّ .env.production ليست عنوانًا صحيحًا. انسخها من لوحة Supabase من جديد.')
  } else {
    try {
      await dns.lookup(host)
      line(OK, 'عنوان الخدمة السحابية موجود')
      try {
        execSync('npm run check:rls', { cwd: root, stdio: 'pipe' })
        line(OK, 'حماية البيانات مفعَّلة', 'لا أحد يقرأ بياناتك دون تسجيل دخول')
      } catch {
        line(NO, 'تعذّر تأكيد حماية البيانات', 'npm run check:rls')
        todo.push('شغّل  npm run check:rls  واقرأ رسالته. إن قال SECURITY فبياناتك مكشوفة وعليك تطبيق ملفّ supabase/migrations فورًا.')
      }
    } catch {
      line(NO, 'عنوان الخدمة السحابية لا وجود له', host.replace(/^[^.]+/, '<اسم-مشروعك>'))
      todo.push(
        'المشروع السحابي المذكور في ملفّ .env.production غير موجود — غالبًا حُذف أو أُوقف.\n' +
        '     النتيجة: المزامنة بين الأجهزة والتصحيح الذكي لا يعملان.\n' +
        '     افتح supabase.com وتحقّق من مشروعك، وانسخ العنوان والمفتاح الصحيحين إلى الملفّ.',
      )
    }
  }
}

/* ── الخلاصة ── */
console.log('\n' + '─'.repeat(46))
if (todo.length === 0) {
  console.log(`${G}كل شيء سليم. لا يوجد ما تفعله.${O}\n`)
  process.exit(0)
}
console.log(`\nما عليك فعله (${todo.length}):\n`)
todo.forEach((t, i) => console.log(`  ${i + 1}. ${t}\n`))
process.exit(1)
