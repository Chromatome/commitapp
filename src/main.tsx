import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Route, Routes } from 'react-router'
import MarketPlace from './pages/Marketplace.tsx'
import CommissionInfo from './pages/Commission.tsx'
import LandingPage from './pages/LandingPage.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketplace" element={<MarketPlace />} />
        <Route path="/commission" element={<CommissionInfo />} />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
