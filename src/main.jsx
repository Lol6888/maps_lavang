import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import 'leaflet/dist/leaflet.css'
// Roboto self-host (chỉ subset latin + việt, 3 độ đậm) — chạy được offline
import '@fontsource/roboto/latin-400.css'
import '@fontsource/roboto/latin-500.css'
import '@fontsource/roboto/latin-700.css'
import '@fontsource/roboto/vietnamese-400.css'
import '@fontsource/roboto/vietnamese-500.css'
import '@fontsource/roboto/vietnamese-700.css'
// Roboto Slab chỉ dùng cho tiêu đề trang bìa — nạp đúng 1 độ đậm
import '@fontsource/roboto-slab/latin-600.css'
import '@fontsource/roboto-slab/vietnamese-600.css'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
