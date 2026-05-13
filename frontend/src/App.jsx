import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import ErrorBoundary from './components/layout/ErrorBoundary'
import PrivateRoute from './components/layout/PrivateRoute'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import UserDashboard from './pages/UserDashboard'

function LoginGuard() {
  const { user, loading } = useAuth()
  if (loading) return null
  if (user) {
    return <Navigate to={user.role.name === 'admin' ? '/admin' : '/dashboard'} replace />
  }
  return <Login />
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginGuard />} />

            <Route element={<PrivateRoute adminOnly />}>
              <Route path="/admin" element={<AdminDashboard />} />
            </Route>

            <Route element={<PrivateRoute />}>
              <Route path="/dashboard" element={<UserDashboard />} />
            </Route>

            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  )
}

export default App
