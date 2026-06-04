import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function Navbar() {
  const { user, logout, hasAnyPermission } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  const isAdminAreaUser = hasAnyPermission([
    'roles.view',
    'users.view',
    'companies.view',
    'investment_types.view',
    'investments.view',
    'investment_details.view',
  ])

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="flex items-center justify-between bg-white px-6 py-3 shadow">
      <span className="font-semibold text-gray-800">XFL Investment</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user.username}</span>
        <span
          className={
            isAdminAreaUser
              ? 'rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700'
              : 'rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600'
          }
        >
          {user.role?.name ?? (isAdminAreaUser ? 'Admin' : 'User')}
        </span>
        <button
          onClick={handleLogout}
          className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
        >
          Logout
        </button>
      </div>
    </nav>
  )
}

export default Navbar
