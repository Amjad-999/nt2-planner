import { get, set, del } from 'idb-keyval'

const IDB_KEY = 'main'

export async function idbGet(): Promise<string | null> {
  try {
    const v = await get(IDB_KEY)
    return typeof v === 'string' ? v : null
  } catch {
    return null
  }
}

export async function idbSet(value: string): Promise<void> {
  try {
    await set(IDB_KEY, value)
  } catch {
    // storage quota — ignore silently
  }
}

export async function idbDel(): Promise<void> {
  try {
    await del(IDB_KEY)
  } catch {}
}
