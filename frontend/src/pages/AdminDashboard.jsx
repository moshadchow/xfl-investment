import { Outlet } from 'react-router-dom'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'

function AdminDashboard() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-8">
          <div className="mb-8 border-b border-gray-200 pb-4">
            <h1 className="text-2xl font-bold text-gray-800">Administration</h1>
            <p className="mt-2 text-sm text-gray-600">
              Manage roles, users, asset management companies, and sub-investment types.
            </p>
          </div>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
