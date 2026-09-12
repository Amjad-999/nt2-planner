import { create } from 'zustand'
import { getCloud, cloudConfigured, CLOUD_TABLE, type CloudUser } from '@/lib/supabase'
import { useAppStore, type AppStore } from '@/store/useAppStore'
import { applyState } from '@/store/migration'
import { mergeStates } from './merge'
import type { State } from '@/store/types'

type CloudStatus = 'offline' | 'idle' | 'syncing' | 'synced' | 'error'

interface CloudState {
  configured: boolean
  user: CloudUser | null
  status: CloudStatus
  message: string
  lastSyncedAt: number | null
  // False until the initial getSession() call resolves — lets callers (the
  // first-run auth gate) avoid flashing a login screen at a returning,
  // already-signed-in user before we've had a chance to check.
  sessionChecked: boolean
  init: () => void
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signInMagicLink: (email: string) => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  deleteCloud: () => Promise<void>
}

function snapshot(): State {
  const s = applyState(useAppStore.getState())
  s._savedAt = Date.now()
  return s
}

/* hydrate() rewrites the app store, which fires the subscription below.
   Without this flag every sync scheduled the next one 4 s later — an endless
   self-sync loop that hammered Supabase even with the app idle. */
let applyingRemote = false
function hydrate(merged: State): void {
  applyingRemote = true
  try { useAppStore.getState().importData(JSON.stringify(merged)) }
  finally { applyingRemote = false }
}

let inited = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/* activeTab is the app store's one view-only field — save() and the persist
   partialize both strip it. The sync subscription has to apply the same rule:
   without it, simply pressing a tab scheduled a full read-merge-write of the
   entire state blob to the backend, which on a phone is real traffic bought
   for nothing.
   A shallow reference scan is the right comparison here: Zustand's set()
   builds a new top-level object but keeps the reference of every slice it did
   not touch, so anything that genuinely changed compares unequal. */
function isSyncRelevantChange(next: AppStore, prev: AppStore): boolean {
  for (const key of Object.keys(next) as (keyof AppStore)[]) {
    if (key === 'activeTab') continue
    if (typeof next[key] === 'function') continue
    if (next[key] !== prev[key]) return true
  }
  return false
}

/* Ceiling for a single cloud round-trip.
   The re-entrancy guard below refuses to start a sync while one is already
   running, so a request that never settles — a stalled connection, a captive
   portal, a blocked tunnel — used to leave `status` on 'syncing' forever and
   silently disabled syncing until the page was reloaded.
   Supabase's query builder exposes no abort signal, so the only way to bound
   it is to race it. Discarding a late result is safe here: nothing is applied
   after the race is lost, the merge is loss-less, and the upsert is keyed by
   user_id, so the next sync converges anyway. Same contract the live sources
   in features/world/http.ts already follow. */
const SYNC_TIMEOUT_MS = 20000
const TIMEOUT_MESSAGE = 'انتهت مهلة المزامنة. تحقّق من الاتصال ثمّ أعِد المحاولة.'

function withTimeout<T>(work: Promise<T>, ms = SYNC_TIMEOUT_MS): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(TIMEOUT_MESSAGE)), ms)
    work.then(
      (value) => { clearTimeout(timer); resolve(value) },
      (err) => { clearTimeout(timer); reject(err) },
    )
  })
}

export const useCloud = create<CloudState>((set, get) => ({
  configured: cloudConfigured(),
  user: null,
  status: cloudConfigured() ? 'idle' : 'offline',
  message: '',
  lastSyncedAt: null,
  // Nothing to check when cloud isn't configured at all — resolved immediately.
  sessionChecked: !cloudConfigured(),

  init: () => {
    if (inited || !cloudConfigured()) return
    inited = true
    getCloud().then(async (cloud) => {
      if (!cloud) { set({ sessionChecked: true }); return }
      const { data } = await cloud.auth.getSession()
      if (data.session) { set({ user: data.session.user }); get().syncNow() }
      set({ sessionChecked: true })
      cloud.auth.onAuthStateChange((evt, session) => { void evt; set({ user: session ? session.user : null }) })
      // مزامنة مؤجّلة عند أي تغيير محلّي (وليس التغييرات القادمة من السحابة نفسها)
      useAppStore.subscribe((state, prev) => {
        if (!get().user || applyingRemote) return
        if (!isSyncRelevantChange(state, prev)) return
        if (debounceTimer) clearTimeout(debounceTimer)
        debounceTimer = setTimeout(() => { get().syncNow() }, 4000)
      })
      // مزامنة عند العودة إلى التبويب
      document.addEventListener('visibilitychange', () => {
        if (get().user && document.visibilityState === 'visible') get().syncNow()
      })
    })
  },

  signInEmail: async (email, password) => {
    set({ status: 'syncing', message: '' })
    const cloud = await getCloud(); if (!cloud) return
    const { error } = await cloud.auth.signInWithPassword({ email, password })
    if (error) { set({ status: 'error', message: error.message }); return }
    const { data } = await cloud.auth.getSession()
    set({ user: data.session ? data.session.user : null, status: 'idle' })
    await get().syncNow()
  },

  signUpEmail: async (email, password) => {
    set({ status: 'syncing', message: '' })
    const cloud = await getCloud(); if (!cloud) return
    const { error } = await cloud.auth.signUp({ email, password })
    if (error) { set({ status: 'error', message: error.message }); return }
    const { data } = await cloud.auth.getSession()
    if (data.session) { set({ user: data.session.user, status: 'idle' }); await get().syncNow() }
    else set({ status: 'idle', message: 'أُرسل بريد تأكيد — فعّل حسابك ثمّ سجّل الدخول.' })
  },

  signInGoogle: async () => {
    const cloud = await getCloud(); if (!cloud) return
    await cloud.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: window.location.origin } })
  },

  signInMagicLink: async (email) => {
    set({ status: 'syncing', message: '' })
    const cloud = await getCloud(); if (!cloud) return
    const { error } = await cloud.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } })
    if (error) { set({ status: 'error', message: error.message }); return }
    set({ status: 'idle', message: 'أُرسل رابط الدخول — افتحه من بريدك الإلكتروني على هذا الجهاز.' })
  },

  signOut: async () => {
    const cloud = await getCloud(); if (!cloud) return
    await cloud.auth.signOut()
    set({ user: null, status: 'idle', message: '' })
  },

  syncNow: async () => {
    // Re-entrancy guard: the 4 s debounce and the visibilitychange handler can
    // both fire — overlapping read/merge/write cycles race each other. The
    // claim must happen synchronously, before any await, or both pass it.
    if (!get().user || get().status === 'syncing') return
    set({ status: 'syncing', message: '' })
    const cloud = await getCloud(); const user = get().user
    if (!cloud || !user) { set({ status: cloud ? 'idle' : 'offline' }); return }
    try {
      const local = snapshot()
      const res = await withTimeout(
        Promise.resolve(cloud.from(CLOUD_TABLE).select('data').eq('user_id', user.id).maybeSingle()),
      )
      if (res.error) throw new Error(res.error.message)
      const remoteRaw = res.data ? res.data.data : null
      const merged = remoteRaw ? mergeStates(local, applyState(remoteRaw)) : local
      merged._savedAt = Date.now()
      hydrate(merged)
      const up = await withTimeout(
        Promise.resolve(cloud.from(CLOUD_TABLE).upsert({ user_id: user.id, data: merged, updated_at: new Date().toISOString() })),
      )
      if (up.error) throw new Error(up.error.message)
      set({ status: 'synced', lastSyncedAt: Date.now(), message: '' })
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : 'تعذّرت المزامنة' })
    }
  },

  deleteCloud: async () => {
    const cloud = await getCloud(); const user = get().user
    if (!cloud || !user) return
    set({ status: 'syncing', message: '' })
    /* Also bounded: this sets the same 'syncing' status that gates syncNow, so
       a hung delete would wedge syncing exactly like an unbounded read did. */
    try {
      const { error } = await withTimeout(
        Promise.resolve(cloud.from(CLOUD_TABLE).delete().eq('user_id', user.id)),
      )
      set({ status: error ? 'error' : 'idle', message: error ? error.message : 'حُذفت بياناتك السحابية (البيانات المحلّية باقية).' })
    } catch (e) {
      set({ status: 'error', message: e instanceof Error ? e.message : 'تعذّر الحذف' })
    }
  },
}))
