import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { useAuth } from './hooks/useAuth'
import ErrorBoundary from './components/layout/ErrorBoundary'
import PrivateRoute from './components/layout/PrivateRoute'
import Login from './pages/Login'
import AdminDashboard from './pages/AdminDashboard'
import AdminCompaniesPage from './pages/AdminCompaniesPage'
import AdminInvestmentDetailsPage from './pages/AdminInvestmentDetailsPage'
import AdminInvestmentTypesPage from './pages/AdminInvestmentTypesPage'
import AdminInvestmentsPage from './pages/AdminInvestmentsPage'
import AdminRolesPage from './pages/AdminRolesPage'
import AdminUsersPage from './pages/AdminUsersPage'
import UserDashboard from './pages/UserDashboard'

const adminRoutePermissions = [
  { path: '/admin/roles', permission: 'roles.view' },
  { path: '/admin/users', permission: 'users.view' },
  { path: '/admin/companies', permission: 'companies.view' },
  { path: '/admin/investment-types', permission: 'investment_types.view' },
  { path: '/admin/investments', permission: 'investments.view' },
  { path: '/admin/investment-details', permission: 'investment_details.view' },
]

function firstAdminPath(hasPermission) {
  return adminRoutePermissions.find((route) => hasPermission(route.permission))?.path
}

function LoginGuard() {
  const { user, loading, hasPermission } = useAuth()
  if (loading) return null
  if (user) {
    return <Navigate to={firstAdminPath(hasPermission) ?? '/dashboard'} replace />
  }
  return <Login />
}

function AdminIndexRedirect() {
  const { hasPermission } = useAuth()
  return <Navigate to={firstAdminPath(hasPermission) ?? '/dashboard'} replace />
}

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<LoginGuard />} />

            <Route element={<PrivateRoute anyPermissions={adminRoutePermissions.map((route) => route.permission)} />}>
              <Route path="/admin" element={<AdminDashboard />}>
                <Route index element={<AdminIndexRedirect />} />
              </Route>
            </Route>
            <Route element={<PrivateRoute permission="roles.view" />}>
              <Route path="/admin/roles" element={<AdminDashboard />}>
                <Route index element={<AdminRolesPage />} />
              </Route>
            </Route>
            <Route element={<PrivateRoute permission="users.view" />}>
              <Route path="/admin/users" element={<AdminDashboard />}>
                <Route index element={<AdminUsersPage />} />
              </Route>
            </Route>
            <Route element={<PrivateRoute permission="companies.view" />}>
              <Route path="/admin/companies" element={<AdminDashboard />}>
                <Route index element={<AdminCompaniesPage />} />
              </Route>
            </Route>
            <Route element={<PrivateRoute permission="investment_types.view" />}>
              <Route path="/admin/investment-types" element={<AdminDashboard />}>
                <Route index element={<AdminInvestmentTypesPage />} />
              </Route>
            </Route>
            <Route element={<PrivateRoute permission="investments.view" />}>
              <Route path="/admin/investments" element={<AdminDashboard />}>
                <Route index element={<AdminInvestmentsPage />} />
              </Route>
            </Route>
            <Route element={<PrivateRoute permission="investment_details.view" />}>
              <Route path="/admin/investment-details" element={<AdminDashboard />}>
                <Route index element={<AdminInvestmentDetailsPage />} />
              </Route>
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
