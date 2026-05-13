import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import RoleManager from '../components/admin/RoleManager'
import FundDataForm from '../components/admin/FundDataForm'

function AdminDashboard() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-8">
          <h1 className="mb-8 text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <RoleManager />
          <hr className="my-8 border-gray-200" />
          <FundDataForm />
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard
