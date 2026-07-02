import { create } from 'zustand'
import { getCloud, cloudConfigured, CLOUD_TABLE, type CloudUser } from '@/lib/supabase'
import { useAppStore } from '@/store/useAppStore'
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
  init: () => void
  signInEmail: (email: string, password: string) => Promise<void>
  signUpEmail: (email: string, password: string) => Promise<void>
  signInGoogle: () => Promise<void>
  signOut: () => Promise<void>
  syncNow: () => Promise<void>
  deleteCloud: () => Promise<void>
}

function snapshot(): State {
  const s = applyState(useAppStore.getState())
  s._savedAt = Date.now()
  return s
}
function hydrate(merged: State): void {
  useAppStore.getState().importData(JSON.stringify(merged))
}

let inited = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export const useCloud = create<CloudState>((set, get) => ({
  configured: cloudConfigured(),
  user: null,
  status: cloudConfigured() ? 'idle' : 'offline',
  message: '',
  lastSyncedAt: null,

  init: () => {
    if (inited || !cloudConfigured()) return
    inited = true
    getCloud().then(async (cloud) => {
      if (!cloud) return
      const { data } = await cloud.auth.getSession()
      if (data.session) { set({ user: data.session.user }); get().syncNow() }
      cloud.auth.onAuthStateChange((evt, session) => { void evt; set({ user: session ? session.user : null }) })
      // مزامنة مؤجّلة عند أي تغيير محلّي
      useAppStore.subscribe(() => {
        if (!get().user) return
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

  signOut: async () => {
    const cloud = await getCloud(); if (!cloud) return
    await cloud.auth.signOut()
    set({ user: null, status: 'idle', message: '' })
  },

  syncNow: async () => {
    const cloud = await getCloud(); const user = get().user
    if (!cloud || !user) return
    set({ status: 'syncing', message: '' })
    try {
      const local = snapshot()
      const res = await cloud.from(CLOUD_TABLE).select('data').eq('user_id', user.id).maybeSingle()
      if (res.error) throw new Error(res.error.message)
      const remoteRaw = res.data ? res.data.data : null
      const merged = remoteRaw ? mergeStates(local, applyState(remoteRaw)) : local
      merged._savedAt = Date.now()
      hydrate(merged)
      const up = await cloud.from(CLOUD_TABLE).upsert({ user_id: user.id, data: merged, updated_at: new Date().toISOString() })
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
    const { error } = await cloud.from(CLOUD_TABLE).delete().eq('user_id', user.id)
    set({ status: error ? 'error' : 'idle', message: error ? error.message : 'حُذفت بياناتك السحابية (البيانات المحلّية باقية).' })
  },
}))
