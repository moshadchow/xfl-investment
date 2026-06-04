import { useState, useEffect } from 'react'
import client from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_FORM = { name: '', is_active: true }

function CompanyManager() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('companies.create')
  const canUpdate = hasPermission('companies.update')
  const canDelete = hasPermission('companies.delete')
  const [companies, setCompanies] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [error, setError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    client.get('/companies').then((res) => setCompanies(res.data))
  }, [])

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleEdit(company) {
    setEditingId(company.id)
    setForm({ name: company.name, is_active: company.is_active })
    setFormError(null)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
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
    try {
      if (editingId) {
        const res = await client.put(`/companies/${editingId}`, { name, is_active: form.is_active })
        setCompanies((prev) => prev.map((c) => (c.id === editingId ? res.data : c)))
        setEditingId(null)
      } else {
        const res = await client.post('/companies', { name, is_active: form.is_active })
        setCompanies((prev) => [...prev, res.data])
      }
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to save company')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(id) {
    if (!confirm('Delete this company?')) return
    try {
      await client.delete(`/companies/${id}`)
      setCompanies((prev) => prev.filter((c) => c.id !== id))
    } catch (err) {
      setError(err.response?.data?.detail ?? 'Failed to delete company')
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Asset Management Companies</h2>

      {error && (
        <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">
          {error}
          <button onClick={() => setError(null)} className="ml-2 underline">Dismiss</button>
        </div>
      )}

      <table className="mb-6 w-full max-w-lg border-collapse rounded border border-gray-200 bg-white text-sm">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-4 py-2 font-medium">ID</th>
            <th className="px-4 py-2 font-medium">Name</th>
            <th className="px-4 py-2 font-medium">Status</th>
            <th className="px-4 py-2 font-medium">Actions</th>
          </tr>
        </thead>
        <tbody>
          {companies.length === 0 ? (
            <tr>
              <td colSpan={4} className="px-4 py-4 text-center text-gray-400">
                No companies yet.
              </td>
            </tr>
          ) : (
            companies.map((company) => (
              <tr key={company.id} className="border-t border-gray-200">
                <td className="px-4 py-2 text-gray-500">{company.id}</td>
                <td className="px-4 py-2 text-gray-800">{company.name}</td>
                <td className="px-4 py-2 text-gray-600">{company.is_active ? 'Active' : 'Inactive'}</td>
                <td className="px-4 py-2">
                  {canUpdate && (
                    <button
                      onClick={() => handleEdit(company)}
                      className="mr-2 text-blue-600 hover:underline"
                    >
                      Edit
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(company.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      {(canCreate || (canUpdate && editingId)) && (
        <form onSubmit={handleSubmit} className="flex max-w-lg flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700">
          {editingId ? 'Edit Company' : 'Add New Company'}
        </h3>
        <div className="flex gap-2">
          <input
            name="name"
            type="text"
            placeholder="Company name"
            value={form.name}
            onChange={handleFormChange}
            className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} />
            Active
          </label>
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
    </div>
  )
}

export default CompanyManager
