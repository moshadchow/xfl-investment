import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function PrivateRoute({ adminOnly = false }) {
  const { user, loading } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (adminOnly && user.role.name !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default PrivateRoute
