import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import { formatBDT2 } from '../../utils/format'

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'pending', label: 'Pending' },
  { value: 'redeemed', label: 'Redeemed' },
  { value: 'closed', label: 'Closed' },
]

const EMPTY_FORM = {
  asset_management_company_id: '',
  investment_type: '',
  sub_investment_type_id: '',
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
  investment_type: '',
  sub_investment_type_id: '',
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

function buildPayload(form) {
  return {
    asset_management_company_id: Number(form.asset_management_company_id),
    investment_type: form.investment_type.trim(),
    sub_investment_type_id: Number(form.sub_investment_type_id),
    purchase_date: form.purchase_date,
    purchase_units: Number(form.purchase_units),
    investment_amount: Number(form.investment_amount),
    reference_number: form.reference_number.trim() || null,
    remarks: form.remarks.trim() || null,
    status: form.status,
  }
}

function InvestmentManager() {
  const [items, setItems] = useState([])
  const [companies, setCompanies] = useState([])
  const [investmentTypeOptions, setInvestmentTypeOptions] = useState([])
  const [filterInvestmentTypeOptions, setFilterInvestmentTypeOptions] = useState([])
  const [subInvestmentTypeOptions, setSubInvestmentTypeOptions] = useState([])
  const [filterSubInvestmentTypeOptions, setFilterSubInvestmentTypeOptions] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editingId, setEditingId] = useState(null)
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
      if (filters.investment_type.trim()) params.investment_type = filters.investment_type.trim()
      if (filters.sub_investment_type_id) params.sub_investment_type_id = Number(filters.sub_investment_type_id)
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

  const loadSubInvestmentTypeOptions = useCallback(async (companyId, investmentType, setter = setSubInvestmentTypeOptions) => {
    if (!companyId || !investmentType.trim()) {
      setter([])
      return []
    }
    const res = await client.get('/investments/options/sub-investment-types', {
      params: {
        asset_management_company_id: Number(companyId),
        investment_type: investmentType.trim(),
      },
    })
    setter(res.data)
    return res.data
  }, [])

  useEffect(() => {
    client.get('/companies')
      .then((res) => setCompanies(res.data))
      .catch(() => setActionError('Failed to load companies'))
  }, [])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    const companyId = filters.asset_management_company_id

    if (!companyId) {
      setFilterInvestmentTypeOptions([])
      setFilterSubInvestmentTypeOptions([])
      return
    }

    loadInvestmentTypeOptions(companyId, setFilterInvestmentTypeOptions)
      .catch(() => setActionError('Failed to load investment type options'))
  }, [filters.asset_management_company_id, loadInvestmentTypeOptions])

  useEffect(() => {
    const companyId = filters.asset_management_company_id
    const investmentType = filters.investment_type

    if (!companyId || !investmentType.trim()) {
      setFilterSubInvestmentTypeOptions([])
      return
    }

    loadSubInvestmentTypeOptions(companyId, investmentType, setFilterSubInvestmentTypeOptions)
      .catch(() => setActionError('Failed to load sub-investment type options'))
  }, [filters.asset_management_company_id, filters.investment_type, loadSubInvestmentTypeOptions])

  async function handleFormChange(e) {
    const { name, value } = e.target

    if (name === 'asset_management_company_id') {
      setForm((current) => ({
        ...current,
        asset_management_company_id: value,
        investment_type: '',
        sub_investment_type_id: '',
      }))
      setSubInvestmentTypeOptions([])
      try {
        await loadInvestmentTypeOptions(value)
      } catch {
        setFormError('Failed to load investment type options')
      }
      return
    }

    if (name === 'investment_type') {
      const nextInvestmentType = value
      setForm((current) => ({
        ...current,
        investment_type: nextInvestmentType,
        sub_investment_type_id: '',
      }))
      try {
        await loadSubInvestmentTypeOptions(form.asset_management_company_id, nextInvestmentType)
      } catch {
        setFormError('Failed to load sub-investment type options')
      }
      return
    }

    setForm((current) => ({ ...current, [name]: value }))
  }

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters((current) => {
      if (name === 'asset_management_company_id') {
        return {
          ...current,
          asset_management_company_id: value,
          investment_type: '',
          sub_investment_type_id: '',
        }
      }
      if (name === 'investment_type') {
        return {
          ...current,
          investment_type: value,
          sub_investment_type_id: '',
        }
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

  async function handleEdit(item) {
    setEditingId(item.id)
    setFormError(null)
    setActionError(null)

    const companyId = String(item.asset_management_company_id)
    const investmentType = item.investment_type
    const subInvestmentTypeId = String(item.sub_investment_type_id)

    setForm({
      asset_management_company_id: companyId,
      investment_type: investmentType,
      sub_investment_type_id: subInvestmentTypeId,
      purchase_date: item.purchase_date,
      purchase_units: String(item.purchase_units),
      investment_amount: String(item.investment_amount),
      reference_number: item.reference_number ?? '',
      remarks: item.remarks ?? '',
      status: item.status,
    })

    try {
      await loadInvestmentTypeOptions(companyId)
      await loadSubInvestmentTypeOptions(companyId, investmentType)
    } catch {
      setFormError('Failed to load dependent options for editing')
    }
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setInvestmentTypeOptions([])
    setSubInvestmentTypeOptions([])
    setFormError(null)
  }

  async function handleDelete(item) {
    if (!confirm('Delete this investment?')) return

    setActionError(null)
    try {
      await client.delete(`/investments/${item.id}`)
      setItems((current) => current.filter((row) => row.id !== item.id))
      setTotal((current) => Math.max(current - 1, 0))
      if (editingId === item.id) handleCancelEdit()
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
    if (!form.investment_type.trim()) {
      setFormError('Investment type is required')
      return
    }
    if (!form.sub_investment_type_id) {
      setFormError('Sub-investment type is required')
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
    if (!form.status) {
      setFormError('Status is required')
      return
    }

    const payload = buildPayload(form)

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
      setSubInvestmentTypeOptions([])
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

      <div className="mb-4 grid gap-3 rounded border border-gray-200 bg-white p-4 md:grid-cols-6">
        <div>
          <label className="mb-1 block text-xs text-gray-600">Search</label>
          <input
            name="search"
            value={filters.search}
            onChange={handleFilterChange}
            placeholder="Type, reference, or remarks"
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
            name="investment_type"
            value={filters.investment_type}
            onChange={handleFilterChange}
            disabled={!filters.asset_management_company_id}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">All Types</option>
            {filterInvestmentTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">Sub-Investment Type</label>
          <select
            name="sub_investment_type_id"
            value={filters.sub_investment_type_id}
            onChange={handleFilterChange}
            disabled={!filters.asset_management_company_id || !filters.investment_type}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">All Sub-Types</option>
            {filterSubInvestmentTypeOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.name}</option>
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
              <th className="px-4 py-2 font-medium">AMC</th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('investment_type')}>Investment Type</button>
              </th>
              <th className="px-4 py-2 font-medium">Sub-Investment Type</th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('purchase_date')}>Purchase Date</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('purchase_units')}>Purchase Units</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('investment_amount')}>Investment Amount</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('status')}>Status</button>
              </th>
              <th className="px-4 py-2 font-medium">
                <button type="button" onClick={() => handleSort('created_at')}>Created Date</button>
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
                  <td className="px-4 py-2 text-gray-600">{item.asset_management_company_name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{item.investment_type}</td>
                  <td className="px-4 py-2 text-gray-600">{item.sub_investment_type_name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.purchase_date)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatUnits(item.purchase_units)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatBDT2(item.investment_amount)}</td>
                  <td className="px-4 py-2 text-gray-600">{item.status}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.created_at)}</td>
                  <td className="flex gap-2 px-4 py-2">
                    <button onClick={() => handleEdit(item)} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100">
                      View / Edit
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

      <form onSubmit={handleSubmit} className="flex max-w-5xl flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700">
          {editingId ? 'Edit Investment' : 'Add Investment'}
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
            <select
              name="investment_type"
              required
              value={form.investment_type}
              onChange={handleFormChange}
              disabled={!form.asset_management_company_id}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select investment type…</option>
              {investmentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Sub-Investment Type</label>
            <select
              name="sub_investment_type_id"
              required
              value={form.sub_investment_type_id}
              onChange={handleFormChange}
              disabled={!form.asset_management_company_id || !form.investment_type}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            >
              <option value="">Select sub-investment type…</option>
              {subInvestmentTypeOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.name} ({option.code})</option>
              ))}
            </select>
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
              name="purchase_units"
              required
              min="0.000001"
              step="0.000001"
              value={form.purchase_units}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Investment Amount</label>
            <input
              type="number"
              name="investment_amount"
              required
              min="0.01"
              step="0.01"
              value={form.investment_amount}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Status</label>
            <select
              name="status"
              required
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
              value={form.reference_number}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-1 block text-xs text-gray-600">Remarks</label>
            <textarea
              name="remarks"
              value={form.remarks}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {formError && (
          <div className="rounded bg-red-50 px-4 py-2 text-sm text-red-700">{formError}</div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 disabled:opacity-50"
          >
            {submitting ? 'Saving…' : editingId ? 'Update Investment' : 'Create Investment'}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default InvestmentManager
