import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

export const adminLinks = [
  { to: '/admin/roles', label: 'Roles Management', permission: 'roles.view' },
  { to: '/admin/users', label: 'User Management', permission: 'users.view' },
  { to: '/admin/companies', label: 'Asset Management Companies', permission: 'companies.view' },
  { to: '/admin/investment-types', label: 'Investment Types', permission: 'investment_types.view' },
  { to: '/admin/investments', label: 'Investments', permission: 'investments.view' },
  { to: '/admin/investment-details', label: 'Investment Details', permission: 'investment_details.view' },
]

function Sidebar() {
  const { user, hasPermission } = useAuth()

  if (!user) return null

  const visibleAdminLinks = adminLinks.filter((link) => hasPermission(link.permission))

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
        {visibleAdminLinks.length > 0 && (
          <div className="mt-4 flex flex-col gap-2">
            <p className="px-3 text-xs font-semibold uppercase tracking-wide text-gray-400">
              Administration
            </p>
            {visibleAdminLinks.map((link) => (
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
