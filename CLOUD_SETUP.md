# الحفظ السحابي (Supabase) — دليل الإعداد

يحفظ التطبيق كل تقدّمك سحابيًّا ويزامنه بين أجهزتك **بالدمج فقط — بلا حذف أو نسيان**.
الحذف الوحيد الممكن هو زرّ «حذف بياناتي السحابية» داخل الإعدادات (بتأكيد منك).

> بياناتك تُحفظ محليًّا دائمًا (localStorage + IndexedDB). السحابة طبقة مزامنة إضافية.

---

## 1) تثبيت الحزمة

```
npm install
```

(يجلب `@supabase/supabase-js` المُضاف إلى package.json.)

## 2) إنشاء مشروع Supabase

1. ادخل إلى https://supabase.com وأنشئ مشروعًا مجانيًّا.
2. من **Project Settings → API** انسخ:
   - **Project URL**
   - **anon public key**

## 3) ملفّ البيئة `.env`

أنشئ ملفّ `.env` في جذر المشروع (انسخ من `.env.example`) واملأه:

```
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR-ANON-PUBLIC-KEY
```

## 4) إنشاء الجدول + الحماية (RLS)

من Supabase افتح **SQL Editor** ونفّذ:

```sql
create table if not exists public.nt2_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.nt2_state enable row level security;

create policy "own row select" on public.nt2_state
  for select using (auth.uid() = user_id);
create policy "own row insert" on public.nt2_state
  for insert with check (auth.uid() = user_id);
create policy "own row update" on public.nt2_state
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own row delete" on public.nt2_state
  for delete using (auth.uid() = user_id);
```

> RLS يضمن أن كل مستخدم لا يصل إلّا إلى صفّه الخاصّ.

## 5) تفعيل تسجيل الدخول

- **البريد:** Authentication → Providers → **Email** (مفعّل افتراضيًّا). يمكنك إيقاف تأكيد البريد للتجربة.
- **Google:** Authentication → Providers → **Google** → فعّله وأدخل Client ID/Secret من Google Cloud Console.
  - في **URL Configuration** أضف عنوان موقعك (مثل `http://localhost:5178`) إلى **Site URL** و**Redirect URLs**.

## 6) التشغيل

```
npm run dev
```

(في **طرفية ويندوز: PowerShell أو CMD — لا WSL**.)

ثمّ افتح **الإعدادات ⚙️ → الحفظ السحابي**، وسجّل الدخول. ستُدمج بياناتك تلقائيًّا وتُزامن عند كل تغيير وعند العودة للتبويب.

---

## كيف تعمل المزامنة (لا فقدان)

- عند تسجيل الدخول: **سحب** نسختك السحابية + **دمج** مع المحلّية (اتّحاد لا يُسقط أي عنصر) + **دفع** الناتج.
- المصفوفات (المفردات، الشارات، تقدّم القواعد، أيّام الدراسة): **اتّحاد**.
- العدّادات (الوقت، أفضل نتيجة): **الأقصى**.
- الإعدادات (الاسم، التاريخ، المظهر): **الأحدث**.
- لا يُحذف أي شيء من السحابة إلّا عبر زرّ الحذف الصريح (بتأكيدك).
