import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function Sidebar() {
  const { user } = useAuth()

  if (!user) return null

  return (
    <aside className="w-64 min-h-screen bg-gray-800 p-4 text-white">
      <nav className="flex flex-col gap-2">
        <Link
          to="/dashboard"
          className="rounded px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
        >
          Dashboard
        </Link>
        {user.role.name === 'admin' && (
          <Link
            to="/admin"
            className="rounded px-3 py-2 text-sm text-gray-200 hover:bg-gray-700"
          >
            Admin Panel
          </Link>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar
