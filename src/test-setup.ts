import '@testing-library/jest-dom'

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = val },
    removeItem: (key: string) => { delete store[key] },
    clear: () => { store = {} },
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

// Mock speechSynthesis
Object.defineProperty(window, 'speechSynthesis', { value: { getVoices: () => [], speak: () => {}, cancel: () => {}, onvoiceschanged: null }, writable: true })

// Mock indexedDB
Object.defineProperty(window, 'indexedDB', { value: null, writable: true })
