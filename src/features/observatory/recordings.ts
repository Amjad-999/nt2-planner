import { createStore, get, set, del, keys } from 'idb-keyval'

/* ── Learner recordings (audio blobs) ──────────────────────────────────────
   Kept in their own IndexedDB store, on this device only: they are large,
   personal, and the cloud sync carries one JSON blob per user. The synced
   state stores only the recording id + duration, and the UI says plainly
   that the audio itself stays on this device. */

let store: ReturnType<typeof createStore> | null = null
function recStore() {
  if (!store) store = createStore('nt2-obs-recordings', 'blobs')
  return store
}

export const MAX_RECORDINGS = 40

export async function saveRecording(id: string, blob: Blob): Promise<boolean> {
  try {
    await set(id, blob, recStore())
    return true
  } catch {
    return false
  }
}

export async function loadRecording(id: string): Promise<Blob | null> {
  if (!id) return null
  try {
    const b = await get(id, recStore())
    return b instanceof Blob ? b : null
  } catch {
    return null
  }
}

export async function deleteRecording(id: string): Promise<void> {
  try { await del(id, recStore()) } catch { /* already gone or IDB unavailable */ }
}

/** Drop the oldest recordings beyond the cap, keeping any id still referenced. */
export async function pruneRecordings(referenced: Set<string>): Promise<void> {
  try {
    const all = (await keys(recStore())).map(String).sort()
    const excess = all.filter((k) => !referenced.has(k)).slice(0, Math.max(0, all.length - MAX_RECORDINGS))
    await Promise.all(excess.map((k) => del(k, recStore())))
  } catch { /* best-effort housekeeping */ }
}
