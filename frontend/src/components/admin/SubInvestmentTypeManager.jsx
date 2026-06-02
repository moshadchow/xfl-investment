import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'

const EMPTY_FORM = {
  asset_management_company_id: '',
  investment_type: '',
  name: '',
  code: '',
  description: '',
  is_active: true,
}

const EMPTY_FILTERS = {
  search: '',
  asset_management_company_id: '',
  investment_type: '',
  is_active: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function SubInvestmentTypeManager() {
  const [items, setItems] = useState([])
  const [companies, setCompanies] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editingId, setEditingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sortBy, setSortBy] = useState('name')
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
      if (filters.investment_type.trim()) params.investment_type = filters.investment_type.trim()
      if (filters.is_active !== '') params.is_active = filters.is_active === 'true'

      const res = await client.get('/sub-investment-types', { params })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to load sub-investment types')
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize, sortBy, sortDir])

  useEffect(() => {
    client.get('/companies')
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
      investment_type: item.investment_type,
      name: item.name,
      code: item.code,
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
    if (!confirm(`Are you sure you want to ${actionLabel} ${item.name}?`)) return

    setActionError(null)
    try {
      const res = await client.patch(`/sub-investment-types/${item.id}/status`, { is_active: nextState })
      setItems((current) => current.map((row) => (row.id === item.id ? res.data : row)))
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to update status')
    }
  }

  async function handleDelete(item) {
    if (!confirm(`Delete sub-investment type "${item.name}"?`)) return

    setActionError(null)
    try {
      await client.delete(`/sub-investment-types/${item.id}`)
      setItems((current) => current.filter((row) => row.id !== item.id))
      setTotal((current) => Math.max(current - 1, 0))
      if (editingId === item.id) handleCancelEdit()
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to delete sub-investment type')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const companyId = Number(form.asset_management_company_id)
    const investmentType = form.investment_type.trim()
    const name = form.name.trim()
    const code = form.code.trim()

    if (!companyId) {
      setFormError('Asset management company is required')
      return
    }
    if (!investmentType) {
      setFormError('Investment type is required')
      return
    }
    if (!name) {
      setFormError('Sub-investment type name is required')
      return
    }
    if (!code) {
      setFormError('Code is required')
      return
    }

    const payload = {
      asset_management_company_id: companyId,
      investment_type: investmentType,
      name,
      code,
      description: form.description.trim() || null,
      is_active: form.is_active,
    }

    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        const res = await client.put(`/sub-investment-types/${editingId}`, payload)
        setItems((current) => current.map((row) => (row.id === editingId ? res.data : row)))
        setEditingId(null)
      } else {
        await client.post('/sub-investment-types', payload)
        await fetchItems()
      }
      setForm(EMPTY_FORM)
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to save sub-investment type')
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

      <div className="mb-4 grid gap-3 rounded border border-gray-200 bg-white p-4 md:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs text-gray-600">Search</label>
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Name, code, or investment type"
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
          <label className="mb-1 block text-xs text-gray-600">Investment Type</label>
          <input
            name="investment_type"
            value={filters.investment_type}
            onChange={handleFilterChange}
            placeholder="Filter by type"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
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
                <button type="button" onClick={() => handleSort('name')}>Sub-Investment Type</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('code')}>Code</button>
              </th>
              <th className="px-4 py-2 font-medium">Asset Management Company</th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('investment_type')}>Investment Type</button>
              </th>
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
                <td colSpan={8} className="px-4 py-4 text-center text-gray-400">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-4 text-center text-gray-400">No sub-investment types found.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-800">{item.name}</td>
                  <td className="px-4 py-2 text-gray-600">{item.code}</td>
                  <td className="px-4 py-2 text-gray-600">{item.asset_management_company_name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{item.investment_type}</td>
                  <td className="px-4 py-2 text-gray-600">{item.is_active ? 'Active' : 'Inactive'}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.created_at)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.updated_at)}</td>
                  <td className="flex gap-2 px-4 py-2">
                    <button onClick={() => handleEdit(item)} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100">
                      View / Edit
                    </button>
                    <button onClick={() => handleToggleActive(item)} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200">
                      {item.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onClick={() => handleDelete(item)} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">
                      Delete
                    </button>
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

      <form onSubmit={handleSubmit} className="flex max-w-4xl flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700">
          {editingId ? 'Edit Sub-Investment Type' : 'Add Sub-Investment Type'}
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Asset Management Company</label>
            <select
              name="asset_management_company_id"
              required
              value={form.asset_management_company_id}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select AMC…</option>
              {companies.filter((company) => company.is_active).map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Investment Type</label>
            <input
              name="investment_type"
              required
              value={form.investment_type}
              onChange={handleFormChange}
              placeholder="e.g. Mutual Fund"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Sub-Investment Type Name</label>
            <input
              name="name"
              required
              value={form.name}
              onChange={handleFormChange}
              placeholder="e.g. Open-End Fund"
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Code</label>
            <input
              name="code"
              required
              value={form.code}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Description</label>
            <textarea
              name="description"
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
            {submitting ? (editingId ? 'Updating…' : 'Creating…') : editingId ? 'Update Sub-Investment Type' : 'Add Sub-Investment Type'}
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

export default SubInvestmentTypeManager
