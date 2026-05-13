import { useState, useEffect } from 'react'
import client from '../../api/client'

function RoleManager() {
  const [roles, setRoles] = useState([])
  const [newName, setNewName] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    client.get('/roles').then((res) => setRoles(res.data))
  }, [])

  async function handleSubmit(e) {
    e.preventDefault()
    const name = newName.trim()
    if (!name) {
      setError('Name is required')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      const res = await client.post('/roles', { name })
      setRoles((prev) => [...prev, res.data])
      setNewName('')
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to create role')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Roles</h2>

      <table className="mb-8 w-full max-w-sm border-collapse rounded border border-gray-200 bg-white text-sm">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-4 py-2 font-medium">ID</th>
            <th className="px-4 py-2 font-medium">Name</th>
          </tr>
        </thead>
        <tbody>
          {roles.map((role) => (
            <tr key={role.id} className="border-t border-gray-200">
              <td className="px-4 py-2 text-gray-500">{role.id}</td>
              <td className="px-4 py-2 text-gray-800">{role.name}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <form onSubmit={handleSubmit} className="flex max-w-sm flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700">Add New Role</h3>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Role name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Add
          </button>
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>
    </div>
  )
}

export default RoleManager
