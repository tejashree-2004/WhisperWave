import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Transcribe from './pages/Transcribe'
import History from './pages/History'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <div className="min-h-screen bg-void flex items-center justify-center"><Spinner /></div>
  return user ? children : <Navigate to="/login" replace />
}

function Spinner() {
  return (
    <div className="flex gap-1 items-end h-8">
      {[...Array(7)].map((_, i) => (
        <div key={i} className="wave-bar h-8" style={{ animationDelay: `${i * 0.1}s` }} />
      ))}
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/app" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="transcribe" element={<Transcribe />} />
            <Route path="history" element={<History />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
