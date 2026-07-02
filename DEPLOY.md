# نشر الموقع رسميًّا ومجانًا (Vercel + GitHub)

النتيجة: رابط واحد عامّ مثل `https://nt2-planner.vercel.app` يعمل بـHTTPS ويُحدَّث تلقائيًّا.
المشروع جاهز (vercel.json مضبوط). نفّذ الخطوات في **طرفية ويندوز (PowerShell) — لا WSL**.

> لا تُرفع الأسرار: ملفّ `.env` مُستثنًى من git. ستضع مفاتيح Supabase في إعدادات Vercel لاحقًا.

---

## 1) ثبّت الحزم وتأكّد أنّ البناء يعمل محليًّا

```
npm install
npm run build
```

إن نجح `build` بلا أخطاء، أنت جاهز.

## 2) ارفع المشروع إلى GitHub

أنشئ مستودعًا جديدًا **فارغًا** على https://github.com/new باسم `nt2-planner` (Public أو Private).
ثمّ في مجلّد المشروع:

```
git add -A
git commit -m "NT2 Planner — نشر"
git branch -M main
git remote add origin https://github.com/USERNAME/nt2-planner.git
git push -u origin main
```

(بدّل `USERNAME` باسمك. إن ظهر خطأ `index.lock`، احذف الملفّ `.git/index.lock` ثمّ أعد المحاولة.)

## 3) اربط Vercel

1. ادخل https://vercel.com وسجّل الدخول بحساب **GitHub** (مجاني).
2. **Add New… → Project** ← اختر مستودع `nt2-planner` ← **Import**.
3. سيكتشف Vercel إعداد Vite تلقائيًّا (الأمر `npm run build`، المخرجات `dist`). اترك الإعدادات كما هي.
4. اضغط **Deploy** وانتظر دقيقة أو دقيقتين ← ستحصل على رابطك: `https://nt2-planner.vercel.app`.

## 4) فعّل الحفظ السحابي على الموقع المنشور

بما أنّ `.env` لا يُرفع، أضف المفاتيح في Vercel:

1. Vercel → مشروعك → **Settings → Environment Variables** ← أضف:
   - `VITE_SUPABASE_URL` = رابط مشروع Supabase
   - `VITE_SUPABASE_ANON_KEY` = المفتاح العامّ anon
2. **Deployments → (آخر نشر) → ⋯ → Redeploy** ليأخذ المتغيّرات.

## 5) اسمح بتسجيل الدخول من الرابط الجديد

في Supabase → **Authentication → URL Configuration**:
- أضف رابط Vercel إلى **Site URL** و**Redirect URLs** (مثل `https://nt2-planner.vercel.app`).

(هذا ضروري ليعمل تسجيل الدخول بـGoogle على الموقع المنشور.)

---

## بعد ذلك

- **شارك الرابط** — الموقع رسميّ ويعمل على كل الأجهزة.
- **التحديث تلقائي:** أي `git push` لاحق يُعيد النشر وحده.
- **اسم نطاق خاصّ (اختياري):** Vercel → Settings → Domains (يتطلّب شراء نطاق، لكن رابط vercel.app يبقى مجانيًّا للأبد).

## إن فشل البناء على Vercel

افتح سجلّ البناء (Build Logs)، وانسخ الخطأ لي لأصلحه. غالبًا يكون متغيّر بيئة ناقصًا أو نسخة Node — ويمكن ضبط Node من Settings → General → Node.js Version.
