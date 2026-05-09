import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { Sidebar } from './components/Sidebar'
import LandingPage from './pages/LandingPage'
import Login from './pages/Login'
import AuthCallback from './pages/AuthCallback'
import Dashboard from './pages/Dashboard'
import Drafts from './pages/Drafts'
import DraftReview from './pages/DraftReview'
import Settings from './pages/Settings'
import Logs from './pages/Logs'
import './index.css'

// Guard — redirect to login if not authenticated
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-base)' }}>
      <div className="spinner" style={{ width: 32, height: 32 }} />
    </div>
  )

  return user ? children : <Navigate to="/login" replace />
}

// Main app layout with sidebar
const AppLayout = ({ children }) => (
  <div style={{ display: 'flex', minHeight: '100vh' }}>
    <Sidebar />
    <main style={{ marginLeft: 240, flex: 1, padding: '32px', overflowY: 'auto', minHeight: '100vh' }}>
      {children}
    </main>
  </div>
)

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/auth/callback" element={<AuthCallback />} />

            {/* Protected */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <AppLayout><Dashboard /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/drafts" element={
              <ProtectedRoute>
                <AppLayout><Drafts /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/drafts/:id" element={
              <ProtectedRoute>
                <AppLayout><DraftReview /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/logs" element={
              <ProtectedRoute>
                <AppLayout><Logs /></AppLayout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <AppLayout><Settings /></AppLayout>
              </ProtectedRoute>
            } />

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  )
}
