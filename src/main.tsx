import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import LandingPage from './pages/LandingPage.tsx'
import { BrowserRouter, Route, Routes } from 'react-router'
import MarketPlace from './pages/Marketplace.tsx'
import ArtistProfile from './pages/ArtistProfile.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/marketplace" element={<MarketPlace />} />
        <Route path="/profile" element={<ArtistProfile />} />
        
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
