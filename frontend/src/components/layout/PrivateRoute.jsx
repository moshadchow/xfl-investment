import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function PrivateRoute({ permission, anyPermissions }) {
  const { user, loading, hasPermission, hasAnyPermission } = useAuth()

  if (loading) return null

  if (!user) return <Navigate to="/login" replace />

  if (permission && !hasPermission(permission)) {
    return <Navigate to="/dashboard" replace />
  }

  if (anyPermissions?.length && !hasAnyPermission(anyPermissions)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}

export default PrivateRoute
