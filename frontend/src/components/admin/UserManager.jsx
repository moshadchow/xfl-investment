import { useEffect, useState } from 'react'
import client from '../../api/client'

const EMPTY_FORM = { username: '', password: '', role_id: '' }

function UserManager() {
  const [users, setUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([client.get('/users'), client.get('/roles')])
      .then(([usersRes, rolesRes]) => {
        setUsers(usersRes.data)
        setRoles(rolesRes.data)
      })
      .catch(() => setActionError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [])

  const roleMap = Object.fromEntries(roles.map((r) => [r.id, r.name]))

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleEdit(user) {
    setEditingId(user.id)
    setForm({
      username: user.username,
      password: '',
      role_id: String(user.role_id),
    })
    setFormError(null)
    setActionError(null)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleToggleActive(user) {
    const nextState = !user.is_active
    const actionLabel = nextState ? 'activate' : 'deactivate'
    if (!confirm(`Are you sure you want to ${actionLabel} ${user.username}?`)) return

    setActionError(null)
    try {
      const res = await client.patch(`/users/${user.id}`, { is_active: nextState })
      setUsers((prev) => prev.map((u) => (u.id === user.id ? res.data : u)))
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to update user')
    }
  }

  async function handleDelete(user) {
    if (!confirm(`Delete user "${user.username}"?`)) return

    setActionError(null)
    try {
      await client.delete(`/users/${user.id}`)
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      if (editingId === user.id) {
        handleCancelEdit()
      }
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to delete user')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const username = form.username.trim()
    const roleId = Number(form.role_id)

    if (!username) {
      setFormError('Username is required')
      return
    }

    if (!roleId) {
      setFormError('Role is required')
      return
    }

    if (!editingId && !form.password) {
      setFormError('Password is required')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        const payload = {
          username,
          role_id: roleId,
          is_active: users.find((user) => user.id === editingId)?.is_active ?? true,
        }
        if (form.password) payload.password = form.password

        const res = await client.put(`/users/${editingId}`, payload)
        setUsers((prev) => prev.map((user) => (user.id === editingId ? res.data : user)))
        setEditingId(null)
      } else {
        const res = await client.post('/users', {
          username,
          password: form.password,
          role_id: roleId,
        })
        setUsers((prev) => [res.data, ...prev])
      }
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to save user')
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
            {loading ? (
              <tr>
                <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                  Loading…
                </td>
              </tr>
            ) : users.length === 0 ? (
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
                      onClick={() => handleEdit(user)}
                      className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100"
                    >
                      View / Edit
                    </button>
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
        <h3 className="text-sm font-medium text-gray-700">
          {editingId ? 'Edit User' : 'Add User'}
        </h3>
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
            <label className="mb-1 block text-xs text-gray-600">
              {editingId ? 'New Password (optional)' : 'Password'}
            </label>
            <input
              type="password"
              name="password"
              required={!editingId}
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
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (editingId ? 'Updating…' : 'Creating…') : editingId ? 'Update User' : 'Add User'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default UserManager
