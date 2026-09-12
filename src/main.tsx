import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/tajawal/400.css'
/* 500 = the medium step. 19 call sites already ask for font-weight 500;
   without this import every one of them silently fell back to 400 and the
   app rendered in two weights instead of four. Tajawal has no 600 face,
   so --fw-heading (600) resolves upward to 700 by design. */
import '@fontsource/tajawal/500.css'
import '@fontsource/tajawal/700.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
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
