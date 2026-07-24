/* Auth "configuration" — pure validation helpers used by LoginForm/SignupForm.
   The actual auth client/session logic lives in @/lib/supabase.ts (the
   Supabase client) and @/features/cloud/cloudStore.ts (the Zustand store
   that drives it) — this file doesn't duplicate that, it only adds the one
   thing that was missing: form-level validation. */

export function validateEmail(email: string): string | null {
  const trimmed = email.trim()
  if (!trimmed) return 'البريد الإلكتروني مطلوب'
  // Deliberately simple — real validation happens server-side (Supabase
  // rejects malformed addresses); this just catches obvious typos early.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return 'صيغة البريد الإلكتروني غير صحيحة'
  return null
}

export interface PasswordCheck { valid: boolean; message: string | null }

export function validatePassword(password: string): PasswordCheck {
  if (password.length < 8) return { valid: false, message: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }
  if (!/[a-zA-Z]/.test(password)) return { valid: false, message: 'أضف حرفًا واحدًا على الأقل' }
  if (!/[0-9]/.test(password)) return { valid: false, message: 'أضف رقمًا واحدًا على الأقل' }
  return { valid: true, message: null }
}
