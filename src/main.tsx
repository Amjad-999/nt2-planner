import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/tajawal/400.css'
import '@fontsource/tajawal/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
/* Observatory type system: Tajawal 800 = Arabic display, Fraunces (variable,
   OFL) = Dutch display, IBM Plex Mono (OFL) = metadata. @font-face only —
   the files download when a glyph actually uses them. */
import '@fontsource/tajawal/800.css'
import '@fontsource-variable/fraunces/index.css'
import '@fontsource/ibm-plex-mono/latin-400.css'
import '@fontsource/ibm-plex-mono/latin-500.css'
import '@/styles/globals.css'
import './scripts/spotlight'
import App from './App'
import { initStore } from '@/store/useAppStore'
import { initVoices } from '@/features/tts/voices'

initStore()
initVoices()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
