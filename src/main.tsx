import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/tajawal/400.css'
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
