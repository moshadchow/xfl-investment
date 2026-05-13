import { useState, useEffect } from 'react'
import client from '../../api/client'

const EMPTY_FORM = { username: '', password: '', role_id: '' }

function UserManager() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [actionError, setActionError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    Promise.all([client.get('/users'), client.get('/roles')])
      .then(([usersRes, rolesRes]) => {
        setUsers(usersRes.data)
        setRoles(rolesRes.data)
      })
      .catch(() => setActionError('Failed to load data'))
  }, [])

  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]))

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  async function handleToggleActive(user) {
    setActionError(null)
    try {
      const res = await client.patch(`/users/${user.id}`, { is_active: !user.is_active })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)))
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to update user')
    }
  }

  async function handleDelete(user) {
    setActionError(null)
    try {
      await client.delete(`/users/${user.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to delete user')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    try {
      const res = await client.post('/users', {
        username: form.username,
        password: form.password,
        role_id: Number(form.role_id),
      })
      setUsers((prev) => [res.data, ...prev])
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to create user')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded bg-red-50 px-4 py-2 text-sm text-red-700">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="ml-4 font-bold">x</button>
        </div>
      )}

      <div className="mb-8 overflow-x-auto">
        <table className="w-full border-collapse rounded border border-gray-200 bg-white text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600">
              <th className="px-4 py-2 font-medium">Username</th>
              <th className="px-4 py-2 font-medium">Role</th>
              <th className="px-4 py-2 font-medium">Active</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-800">{user.username}</td>
                  <td className="px-4 py-2 text-gray-600">{roleMap[user.role_id] ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{user.is_active ? 'Yes' : 'No'}</td>
                  <td className="flex gap-2 px-4 py-2">
                    <button
                      onClick={() => handleToggleActive(user)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                    >
                      {user.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button
                      onClick={() => handleDelete(user)}
                      className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700">Add User</h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Username</label>
            <input
              type="text"
              name="username"
              required
              value={form.username}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Password</label>
            <input
              type="password"
              name="password"
              required
              value={form.password}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Role</label>
            <select
              name="role_id"
              required
              value={form.role_id}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select role…</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <div>
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? 'Creating…' : 'Add User'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default UserManager
