import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import RoleManager from '../components/admin/RoleManager'

function AdminDashboard() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-8">
          <h1 className="mb-8 text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <RoleManager />
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
