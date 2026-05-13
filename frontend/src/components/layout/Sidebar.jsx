import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function Sidebar() {
  const { user } = useAuth()

  if (!user) return null

  const linkClass = ({ isActive }) =>
    isActive
      ? 'rounded px-3 py-2 text-sm bg-gray-700 text-white'
      : 'rounded px-3 py-2 text-sm text-gray-200 hover:bg-gray-700'

  return (
    <aside className="w-64 min-h-screen bg-gray-800 p-4 text-white">
      <nav className="flex flex-col gap-2">
        <NavLink to="/dashboard" className={linkClass}>
          Dashboard
        </NavLink>
        {user.role.name === 'admin' && (
          <NavLink to="/admin" className={linkClass}>
            Admin Panel
          </NavLink>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar
