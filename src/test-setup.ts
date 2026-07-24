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

// Mock matchMedia (required by useReducedMotion and dnd-kit)
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  }),
})

// Mock ResizeObserver (required by some dnd-kit internals)
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  value: class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  },
})

// Mock IntersectionObserver (required by framer-motion's whileInView, used by Reveal in MotionFx.tsx)
Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  value: class IntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
    takeRecords() { return [] }
  },
})

// jsdom doesn't implement scrollIntoView (used by NavTabs to keep the active tab visible)
Element.prototype.scrollIntoView = function () {}
