/* عميل Supabase — يُحمَّل ديناميكيًّا، ولا يعمل إلّا عند ضبط متغيّرات البيئة.
   إن لم تُضبَط أو لم تُثبَّت الحزمة، يبقى التطبيق يعمل عاديًّا (السحابة معطّلة فقط). */

export interface CloudUser { id: string; email?: string }
export interface CloudSession { user: CloudUser }
export interface CloudErr { message: string }

interface AuthApi {
  getSession(): Promise<{ data: { session: CloudSession | null } }>
  signInWithPassword(c: { email: string; password: string }): Promise<{ error: CloudErr | null }>
  signUp(c: { email: string; password: string }): Promise<{ error: CloudErr | null }>
  signInWithOAuth(c: { provider: string; options?: { redirectTo?: string } }): Promise<{ error: CloudErr | null }>
  signOut(): Promise<{ error: CloudErr | null }>
  onAuthStateChange(cb: (event: string, session: CloudSession | null) => void): { data: { subscription: { unsubscribe(): void } } }
}
interface SelectChain { eq(col: string, val: string): { maybeSingle(): Promise<{ data: { data: unknown } | null; error: CloudErr | null }> } }
interface DeleteChain { eq(col: string, val: string): Promise<{ error: CloudErr | null }> }
interface QueryApi {
  select(cols: string): SelectChain
  upsert(row: Record<string, unknown>): Promise<{ error: CloudErr | null }>
  delete(): DeleteChain
}
export interface CloudClient {
  auth: AuthApi
  from(table: string): QueryApi
}

export const CLOUD_TABLE = 'nt2_state'

export function cloudConfigured(): boolean {
  return !!(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY)
}

let clientPromise: Promise<CloudClient | null> | null = null

export function getCloud(): Promise<CloudClient | null> {
  if (!cloudConfigured()) return Promise.resolve(null)
  if (!clientPromise) {
    clientPromise = import('@supabase/supabase-js')
      .then(m => (m.createClient(
        import.meta.env.VITE_SUPABASE_URL as string,
        import.meta.env.VITE_SUPABASE_ANON_KEY as string,
        { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } },
      ) as unknown) as CloudClient)
      .catch(() => null)
  }
  return clientPromise
}
