import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import { formatBDT2 } from '../../utils/format'
import { useAuth } from '../../hooks/useAuth'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'redeemed', label: 'Redeemed' },
  { value: 'closed', label: 'Closed' },
]

const EMPTY_FORM = {
  asset_management_company_id: '',
  investment_type_id: '',
  purchase_date: '',
  purchase_units: '',
  investment_amount: '',
  reference_number: '',
  remarks: '',
  status: 'active',
}

const EMPTY_FILTERS = {
  search: '',
  asset_management_company_id: '',
  investment_type_id: '',
  status: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function formatUnits(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return Number(value).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 6,
  })
}

function buildPayload(form, editing = false) {
  const payload = {
    purchase_date: form.purchase_date,
    purchase_units: Number(form.purchase_units),
    investment_amount: Number(form.investment_amount),
    reference_number: form.reference_number.trim() || null,
    remarks: form.remarks.trim() || null,
    status: form.status,
  }
  if (!editing) {
    payload.asset_management_company_id = Number(form.asset_management_company_id)
    payload.investment_type_id = Number(form.investment_type_id)
  }
  return payload
}

function InvestmentManager() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('investments.create')
  const canUpdate = hasPermission('investments.update')
  const canDelete = hasPermission('investments.delete')
  const [items, setItems] = useState([])
  const [companies, setCompanies] = useState([])
  const [investmentTypeOptions, setInvestmentTypeOptions] = useState([])
  const [filterInvestmentTypeOptions, setFilterInvestmentTypeOptions] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editingId, setEditingId] = useState(null)
  const [viewingItem, setViewingItem] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sortBy, setSortBy] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')
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
      if (filters.investment_type_id) params.investment_type_id = Number(filters.investment_type_id)
      if (filters.status) params.status = filters.status

      const res = await client.get('/investments', { params })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to load investments')
    } finally {
      setLoading(false)
    }
  }, [filters, page, pageSize, sortBy, sortDir])

  const loadInvestmentTypeOptions = useCallback(async (companyId, setter = setInvestmentTypeOptions) => {
    if (!companyId) {
      setter([])
      return []
    }
    const res = await client.get('/investments/options/investment-types', {
      params: { asset_management_company_id: Number(companyId) },
    })
    setter(res.data)
    return res.data
  }, [])

  useEffect(() => {
    client.get('/companies/list')
      .then((res) => setCompanies(res.data))
      .catch(() => setActionError('Failed to load companies'))
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    if (filters.asset_management_company_id) {
      loadInvestmentTypeOptions(filters.asset_management_company_id, setFilterInvestmentTypeOptions).catch(() => {
        setFilterInvestmentTypeOptions([])
      })
    } else {
      setFilterInvestmentTypeOptions([])
      setFilters((current) => ({ ...current, investment_type_id: '' }))
    }
  }, [filters.asset_management_company_id, loadInvestmentTypeOptions])

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((current) => ({ ...current, [name]: value }))
  }

  async function handleCompanyChange(e) {
    const companyId = e.target.value
    setForm((current) => ({
      ...current,
      asset_management_company_id: companyId,
      investment_type_id: '',
    }))
    setInvestmentTypeOptions([])
    setFormError(null)
    if (companyId) {
      try {
        await loadInvestmentTypeOptions(companyId)
      } catch {
        setFormError('Failed to load investment types')
      }
    }
  }

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters((current) => {
      if (name === 'asset_management_company_id') {
        return { ...current, asset_management_company_id: value, investment_type_id: '' }
      }
      return { ...current, [name]: value }
    })
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

  async function handleView(item) {
    setActionError(null)
    try {
      const res = await client.get(`/investments/${item.id}`)
      setViewingItem(res.data)
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to load investment details')
    }
  }

  async function handleEdit(item) {
    setEditingId(item.id)
    setViewingItem(null)
    setFormError(null)
    setActionError(null)

    const companyId = String(item.asset_management_company_id)
    const investmentTypeId = String(item.investment_type_id)

    setForm({
      asset_management_company_id: companyId,
      investment_type_id: investmentTypeId,
      purchase_date: item.purchase_date,
      purchase_units: String(item.purchase_units),
      investment_amount: String(item.investment_amount),
      reference_number: item.reference_number ?? '',
      remarks: item.remarks ?? '',
      status: item.status,
    })

    try {
      await loadInvestmentTypeOptions(companyId)
    } catch {
      setFormError('Failed to load investment types for editing')
    }
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setInvestmentTypeOptions([])
    setFormError(null)
  }

  async function handleDelete(item) {
    if (!confirm(`Delete investment ${item.investment_code}?`)) return

    setActionError(null)
    try {
      await client.delete(`/investments/${item.id}`)
      setItems((current) => current.filter((row) => row.id !== item.id))
      setTotal((current) => Math.max(current - 1, 0))
      if (editingId === item.id) handleCancelEdit()
      if (viewingItem?.id === item.id) setViewingItem(null)
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to delete investment')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.asset_management_company_id) {
      setFormError('Asset management company is required')
      return
    }
    if (!form.investment_type_id) {
      setFormError('Investment type is required')
      return
    }
    if (!form.purchase_date) {
      setFormError('Purchase date is required')
      return
    }
    if (!form.purchase_units || Number(form.purchase_units) <= 0) {
      setFormError('Purchase units must be greater than zero')
      return
    }
    if (!form.investment_amount || Number(form.investment_amount) <= 0) {
      setFormError('Investment amount must be greater than zero')
      return
    }
    if (form.reference_number.length > 100) {
      setFormError('Reference number must be 100 characters or fewer')
      return
    }
    if (form.remarks.length > 1000) {
      setFormError('Remarks must be 1000 characters or fewer')
      return
    }

    const payload = buildPayload(form, Boolean(editingId))
    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        const res = await client.put(`/investments/${editingId}`, payload)
        setItems((current) => current.map((row) => (row.id === editingId ? res.data : row)))
        setEditingId(null)
      } else {
        await client.post('/investments', payload)
        await fetchItems()
      }
      setForm(EMPTY_FORM)
      setInvestmentTypeOptions([])
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to save investment')
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

      {viewingItem && (
        <div className="mb-6 rounded border border-gray-200 bg-white p-4 text-sm text-gray-700">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-medium text-gray-800">Investment Details</h3>
            <button onClick={() => setViewingItem(null)} className="text-gray-500 hover:text-gray-700">Close</button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <div><span className="text-gray-500">Code:</span> {viewingItem.investment_code}</div>
            <div><span className="text-gray-500">AMC:</span> {viewingItem.asset_management_company_name ?? '—'}</div>
            <div><span className="text-gray-500">Investment Type:</span> {viewingItem.investment_type_name}</div>
            <div><span className="text-gray-500">Purchase Date:</span> {formatDate(viewingItem.purchase_date)}</div>
            <div><span className="text-gray-500">Units:</span> {formatUnits(viewingItem.purchase_units)}</div>
            <div><span className="text-gray-500">Amount:</span> {formatBDT2(viewingItem.investment_amount)}</div>
            <div><span className="text-gray-500">Reference:</span> {viewingItem.reference_number ?? '—'}</div>
            <div><span className="text-gray-500">Status:</span> {viewingItem.status}</div>
            <div><span className="text-gray-500">Created:</span> {formatDate(viewingItem.created_at)}</div>
            <div className="md:col-span-3"><span className="text-gray-500">Remarks:</span> {viewingItem.remarks ?? '—'}</div>
          </div>
        </div>
      )}

      <div className="mb-4 grid gap-3 rounded border border-gray-200 bg-white p-4 md:grid-cols-5">
        <div>
          <label className="mb-1 block text-xs text-gray-600">Search</label>
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Code, reference, or remarks"
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
          <select
            name="investment_type_id"
            value={filters.investment_type_id}
            onChange={handleFilterChange}
            disabled={!filters.asset_management_company_id}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">All Types</option>
            {filterInvestmentTypeOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.investment_type_name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Status</label>
          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All</option>
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
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
                <button type="button" onClick={() => handleSort('investment_code')}>Investment Code</button>
              </th>
              <th className="px-4 py-2 font-medium">AMC</th>
              <th className="px-4 py-2 font-medium">Investment Type</th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('purchase_date')}>Purchase Date</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('purchase_units')}>Units</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('investment_amount')}>Amount</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('status')}>Status</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('created_at')}>Created</button>
              </th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-gray-400">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-4 text-center text-gray-400">No investments found.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-800">{item.investment_code}</td>
                  <td className="px-4 py-2 text-gray-600">{item.asset_management_company_name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{item.investment_type_name}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.purchase_date)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatUnits(item.purchase_units)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatBDT2(item.investment_amount)}</td>
                  <td className="px-4 py-2 text-gray-600">{item.status}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.created_at)}</td>
                  <td className="flex gap-2 px-4 py-2">
                    <button onClick={() => handleView(item)} className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200">
                      View
                    </button>
                    {canUpdate && (
                      <button onClick={() => handleEdit(item)} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100">
                        Edit
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
        <form onSubmit={handleSubmit} className="flex max-w-5xl flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700">
          {editingId ? 'Edit Investment' : 'Add Investment'}
        </h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Asset Management Company</label>
            <select
              name="asset_management_company_id"
              required
              value={form.asset_management_company_id}
              onChange={handleCompanyChange}
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
            <label className="mb-1 block text-xs text-gray-600">Investment Type</label>
            <select
              name="investment_type_id"
              required
              value={form.investment_type_id}
              onChange={handleFormChange}
              disabled={!form.asset_management_company_id || Boolean(editingId)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select investment type…</option>
              {investmentTypeOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.investment_type_name}</option>
              ))}
            </select>
            {form.asset_management_company_id && investmentTypeOptions.length === 0 && !editingId && (
              <p className="mt-1 text-xs text-amber-600">No active investment types are configured for this company.</p>
            )}
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Purchase Date</label>
            <input
              type="date"
              name="purchase_date"
              required
              value={form.purchase_date}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Purchase Units</label>
            <input
              type="number"
              min="0.000001"
              step="0.000001"
              name="purchase_units"
              required
              value={form.purchase_units}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Investment Amount</label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              name="investment_amount"
              required
              value={form.investment_amount}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Status</label>
            <select
              name="status"
              value={form.status}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Reference Number</label>
            <input
              name="reference_number"
              maxLength={100}
              value={form.reference_number}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Remarks</label>
            <textarea
              name="remarks"
              maxLength={1000}
              value={form.remarks}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {submitting ? (editingId ? 'Updating…' : 'Creating…') : editingId ? 'Update Investment' : 'Add Investment'}
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

export default InvestmentManager
