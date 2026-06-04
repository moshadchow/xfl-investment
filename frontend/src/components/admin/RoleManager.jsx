import { useEffect, useState } from 'react'
import client from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_FORM = { name: '' }
const PROTECTED_ROLE_NAMES = new Set(['admin', 'user'])

function RoleManager() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('roles.create')
  const canUpdate = hasPermission('roles.update')
  const canDelete = hasPermission('roles.delete')
  const [roles, setRoles] = useState([])
  const [permissionGroups, setPermissionGroups] = useState([])
  const [selectedRole, setSelectedRole] = useState(null)
  const [selectedPermissionIds, setSelectedPermissionIds] = useState(new Set())
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [permissionError, setPermissionError] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [savingPermissions, setSavingPermissions] = useState(false)

  useEffect(() => {
    client.get('/roles').then((res) => setRoles(res.data))
    if (canUpdate) {
      client.get('/roles/permissions').then((res) => setPermissionGroups(res.data))
    }
  }, [canUpdate])

  function handleFormChange(e) {
    setForm({ name: e.target.value })
  }

  function handleEdit(role) {
    setEditingId(role.id)
    setForm({ name: role.name })
    setError(null)
    setFormError(null)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handlePermissionEdit(role) {
    setSelectedRole(role)
    setPermissionError(null)
    try {
      const res = await client.get(`/roles/${role.id}/permissions`)
      setSelectedPermissionIds(new Set(res.data.permissions.map((permission) => permission.id)))
    } catch (err) {
      setSelectedRole(null)
      setPermissionError(err.response?.data?.detail ?? 'Failed to load role permissions')
    }
  }

  function handlePermissionToggle(permissionId) {
    setSelectedPermissionIds((current) => {
      const next = new Set(current)
      if (next.has(permissionId)) next.delete(permissionId)
      else next.add(permissionId)
      return next
    })
  }

  async function handlePermissionSave() {
    if (!selectedRole) return
    setSavingPermissions(true)
    setPermissionError(null)
    try {
      await client.put(`/roles/${selectedRole.id}/permissions`, {
        permission_ids: Array.from(selectedPermissionIds),
      })
      setSelectedRole(null)
      setSelectedPermissionIds(new Set())
    } catch (err) {
      setPermissionError(err.response?.data?.detail ?? 'Failed to save role permissions')
    } finally {
      setSavingPermissions(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const name = form.name.trim()
    if (!name) {
      setFormError('Name is required')
      return
    }

    setSubmitting(true)
    setFormError(null)
    setError(null)
    try {
      if (editingId) {
        const res = await client.put(`/roles/${editingId}`, { name })
        setRoles((prev) => prev.map((role) => (role.id === editingId ? res.data : role)))
        setEditingId(null)
      } else {
        const res = await client.post('/roles', { name })
        setRoles((prev) => [...prev, res.data])
      }
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to save role')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(role) {
    if (!confirm(`Delete role "${role.name}"?`)) return

    setError(null)
    try {
      await client.delete(`/roles/${role.id}`)
      setRoles((prev) => prev.filter((item) => item.id !== role.id))
      if (editingId === role.id) {
        handleCancelEdit()
      }
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to delete role')
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Roles Management</h2>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}
      {permissionError && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{permissionError}</div>}

      <table className="mb-6 w-full border-collapse rounded border border-gray-200 bg-white text-sm">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-4 py-2 font-medium">ID</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {roles.length === 0 ? (
            <tr>
              <td colSpan={3} className="px-4 py-4 text-center text-gray-400">
                No roles yet.
              </td>
            </tr>
          ) : (
            roles.map((role) => {
              const isProtected = PROTECTED_ROLE_NAMES.has(role.name)
              return (
                <tr key={role.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-500">{role.id}</td>
                  <td className="px-4 py-2 text-gray-800">{role.name}</td>
                  <td className="px-4 py-2">
                    {canUpdate && (
                      <button
                        onClick={() => handleEdit(role)}
                        disabled={isProtected}
                        className="mr-2 text-blue-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                      >
                        Edit
                      </button>
                    )}
                    {canUpdate && (
                      <button
                        onClick={() => handlePermissionEdit(role)}
                        className="mr-2 text-indigo-600 hover:underline"
                      >
                        Permissions
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(role)}
                        disabled={isProtected}
                        className="text-red-600 hover:underline disabled:cursor-not-allowed disabled:text-gray-400 disabled:no-underline"
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>

      {(canCreate || (canUpdate && editingId)) && (
        <form onSubmit={handleSubmit} className="mb-6 flex max-w-lg flex-col gap-3">
          <h3 className="text-sm font-medium text-gray-700">
            {editingId ? 'Edit Role' : 'Add New Role'}
          </h3>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Role name"
              value={form.name}
              onChange={handleFormChange}
              className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              disabled={submitting}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {editingId ? 'Update' : 'Add'}
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
          {formError && <p className="text-sm text-red-600">{formError}</p>}
        </form>
      )}

      {selectedRole && (
        <div className="rounded border border-gray-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-800">Permissions for {selectedRole.name}</h3>
            <button
              type="button"
              onClick={() => setSelectedRole(null)}
              className="text-sm text-gray-600 hover:underline"
            >
              Close
            </button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {permissionGroups.map((group) => (
              <div key={group.menu_key} className="rounded border border-gray-100 p-3">
                <h4 className="mb-2 text-sm font-medium text-gray-700">{group.label}</h4>
                <div className="space-y-2">
                  {group.permissions.map((permission) => (
                    <label key={permission.id} className="flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={selectedPermissionIds.has(permission.id)}
                        onChange={() => handlePermissionToggle(permission.id)}
                        className="rounded border-gray-300"
                      />
                      {permission.action}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={handlePermissionSave}
            disabled={savingPermissions}
            className="mt-4 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            Save Permissions
          </button>
        </div>
      )}
    </div>
  )
}

export default RoleManager
