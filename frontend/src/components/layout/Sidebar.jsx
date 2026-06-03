import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

const adminLinks = [
  { to: '/admin/roles', label: 'Roles Management' },
  { to: '/admin/users', label: 'User Management' },
  { to: '/admin/companies', label: 'Asset Management Companies' },
  { to: '/admin/sub-investment-types', label: 'Sub-Investment Types' },
  { to: '/admin/investments', label: 'Investments' },
  { to: '/admin/investment-details', label: 'Investment Details' },
]

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
          <div className="mt-4 flex flex-col gap-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Administration
            </p>
            {adminLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className={linkClass}>
                {link.label}
              </NavLink>
            ))}
          </div>
        )}
      </nav>
    </aside>
  )
}

export default Sidebar
