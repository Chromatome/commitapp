import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Route, Routes } from 'react-router'
import MarketPlace from './pages/Marketplace.tsx'
import CommissionInfo from './pages/Commission.tsx'
import LandingPage from './pages/LandingPage.tsx'
import Login from './pages/Login.tsx'
import PurchaseSuccess from './pages/PurchaseSuccess.tsx'
import Profile from './pages/Profile.tsx'
import Messages from './pages/Messages.tsx'
import Dashboard from './pages/Dashboard.tsx'
import RequireAuth from './components/RequireAuth.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/marketplace"
          element={
            <MarketPlace />
          }
        />
        <Route
          path="/commission"
          element={
            <RequireAuth>
              <CommissionInfo />
            </RequireAuth>
          }
        />
        <Route
          path="/profile"
          element={
            <RequireAuth>
              <Profile />
            </RequireAuth>
          }
        />
        <Route
          path="/messages"
          element={
            <RequireAuth>
              <Messages />
            </RequireAuth>
          }
        />
        <Route
          path="/purchase"
          element={
            <RequireAuth>
              <PurchaseSuccess />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  </StrictMode>,
)
