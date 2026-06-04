import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_FORM = {
  asset_management_company_id: '',
  investment_type_name: '',
  description: '',
  is_active: true,
}

const EMPTY_FILTERS = {
  search: '',
  asset_management_company_id: '',
  is_active: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function InvestmentTypeManager() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('investment_types.create')
  const canUpdate = hasPermission('investment_types.update')
  const canDelete = hasPermission('investment_types.delete')
  const [items, setItems] = useState([])
  const [companies, setCompanies] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editingId, setEditingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sortBy, setSortBy] = useState('investment_type_name')
  const [sortDir, setSortDir] = useState('asc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(Math.ceil(total / pageSize), 1)

  const fetchItems = useCallback(async () => {
    setLoading(true)
    setActionError(null)
    try {
      const params = {
        page,
        page_size: pageSize,
        sort_by: sortBy,
        sort_dir: sortDir,
      }
      if (filters.search.trim()) params.search = filters.search.trim()
      if (filters.asset_management_company_id) params.asset_management_company_id = Number(filters.asset_management_company_id)
      if (filters.is_active !== '') params.is_active = filters.is_active === 'true'

      const res = await client.get('/investment-types', { params })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to load investment types')
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize, sortBy, sortDir])

  useEffect(() => {
    client.get('/companies/list')
      .then((res) => setCompanies(res.data))
      .catch(() => setActionError('Failed to load companies'))
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  function handleFormChange(e) {
    const { name, value, type, checked } = e.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
  }

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
  }

  function handleSort(column) {
    setPage(1)
    if (sortBy === column) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
  }

  function handleEdit(item) {
    setEditingId(item.id)
    setForm({
      asset_management_company_id: String(item.asset_management_company_id),
      investment_type_name: item.investment_type_name,
      description: item.description ?? '',
      is_active: item.is_active,
    })
    setFormError(null)
    setActionError(null)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleToggleActive(item) {
    const nextState = !item.is_active
    const actionLabel = nextState ? 'activate' : 'deactivate'
    if (!confirm(`Are you sure you want to ${actionLabel} ${item.investment_type_name}?`)) return

    setActionError(null)
    try {
      const res = await client.patch(`/investment-types/${item.id}/status`, { is_active: nextState })
      setItems((current) => current.map((row) => (row.id === item.id ? res.data : row)))
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to update status')
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Delete investment type "${item.investment_type_name}"?`)) return

    setActionError(null)
    try {
      await client.delete(`/investment-types/${item.id}`)
      setItems((current) => current.filter((row) => row.id !== item.id))
      setTotal((current) => Math.max(current - 1, 0))
      if (editingId === item.id) handleCancelEdit()
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to delete investment type')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const companyId = Number(form.asset_management_company_id)
    const investmentTypeName = form.investment_type_name.trim()
    const description = form.description.trim()

    if (!companyId) {
      setFormError('Asset management company is required')
      return
    }
    if (!investmentTypeName) {
      setFormError('Investment type name is required')
      return
    }
    if (investmentTypeName.length > 100) {
      setFormError('Investment type name must be 100 characters or fewer')
      return
    }
    if (description.length > 500) {
      setFormError('Description must be 500 characters or fewer')
      return
    }

    const payload = {
      investment_type_name: investmentTypeName,
      description: description || null,
      is_active: form.is_active,
    }
    const createPayload = {
      ...payload,
      asset_management_company_id: companyId,
    }

    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        const res = await client.put(`/investment-types/${editingId}`, payload)
        setItems((current) => current.map((row) => (row.id === editingId ? res.data : row)))
        setEditingId(null)
      } else {
        await client.post('/investment-types', createPayload)
        await fetchItems()
      }
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to save investment type')
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

      <div className="mb-4 grid gap-3 rounded border border-gray-200 bg-white p-4 md:grid-cols-4">
        <div>
          <label className="mb-1 block text-xs text-gray-600">Search</label>
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Investment type name or description"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">AMC</label>
          <select
            name="asset_management_company_id"
            value={filters.asset_management_company_id}
            onChange={handleFilterChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All AMCs</option>
            {companies.map((company) => (
              <option key={company.id} value={company.id}>{company.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Status</label>
          <select
            name="is_active"
            value={filters.is_active}
            onChange={handleFilterChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Page size</label>
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <table className="w-full border-collapse rounded border border-gray-200 bg-white text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600">
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('investment_type_name')}>Investment Type</button>
              </th>
              <th className="px-4 py-2 font-medium">Asset Management Company</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('created_at')}>Created Date</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('updated_at')}>Last Updated</button>
              </th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-400">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-400">No investment types found.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-800">{item.investment_type_name}</td>
                  <td className="px-4 py-2 text-gray-600">{item.asset_management_company_name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{item.description ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{item.is_active ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.updated_at)}</td>
                  <td className="flex gap-2 px-4 py-2">
                    {canUpdate && (
                      <button onClick={() => handleEdit(item)} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100">
                        View / Edit
                      </button>
                    )}
                    {canUpdate && (
                      <button onClick={() => handleToggleActive(item)} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200">
                        {item.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(item)} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mb-8 flex items-center justify-between text-sm text-gray-600">
        <span>Page {page} of {totalPages} ({total} records)</span>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            className="rounded bg-gray-100 px-3 py-1 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage((current) => current + 1)}
            className="rounded bg-gray-100 px-3 py-1 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {(canCreate || (canUpdate && editingId)) && (
        <form onSubmit={handleSubmit} className="flex max-w-4xl flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700">
          {editingId ? 'Edit Investment Type' : 'Add Investment Type'}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Asset Management Company</label>
            <select
              name="asset_management_company_id"
              required
              value={form.asset_management_company_id}
              onChange={handleFormChange}
              disabled={Boolean(editingId)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select AMC…</option>
              {companies.filter((company) => company.is_active).map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Investment Type Name</label>
            <input
              name="investment_type_name"
              required
              maxLength={100}
              value={form.investment_type_name}
              onChange={handleFormChange}
              placeholder="e.g. Mutual Fund"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Description</label>
            <textarea
              name="description"
              maxLength={500}
              value={form.description}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input type="checkbox" name="is_active" checked={form.is_active} onChange={handleFormChange} />
            Active
          </label>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (editingId ? 'Updating…' : 'Creating…') : editingId ? 'Update Investment Type' : 'Add Investment Type'}
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
      )}
    </div>
  )
}

export default InvestmentTypeManager
