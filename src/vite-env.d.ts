/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/react" />

// Raw Markdown imports via ?raw query
declare module '*.md?raw' {
  const content: string
  export default content
}
