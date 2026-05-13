import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  if (!user) return null

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="flex items-center justify-between bg-white px-6 py-3 shadow">
      <span className="font-semibold text-gray-800">XFL Investment</span>
      <div className="flex items-center gap-4">
        <span className="text-sm text-gray-600">{user.username}</span>
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
