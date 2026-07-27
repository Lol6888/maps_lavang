import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css'
// Bộ font theo dự án giolelavang (self-host, subset latin + việt) — chạy offline.
// Be Vietnam Pro: thân; Playfair Display: tiêu đề; Montserrat: nhãn/số.
import '@fontsource/be-vietnam-pro/latin-400.css'
import '@fontsource/be-vietnam-pro/latin-500.css'
import '@fontsource/be-vietnam-pro/latin-600.css'
import '@fontsource/be-vietnam-pro/vietnamese-400.css'
import '@fontsource/be-vietnam-pro/vietnamese-500.css'
import '@fontsource/be-vietnam-pro/vietnamese-600.css'
import '@fontsource/playfair-display/latin-600.css'
import '@fontsource/playfair-display/latin-700.css'
import '@fontsource/playfair-display/vietnamese-600.css'
import '@fontsource/playfair-display/vietnamese-700.css'
import '@fontsource/montserrat/latin-600.css'
import '@fontsource/montserrat/latin-700.css'
import '@fontsource/montserrat/vietnamese-600.css'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
