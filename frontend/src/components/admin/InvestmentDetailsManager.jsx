import { useCallback, useEffect, useState } from 'react'
import client from '../../api/client'
import { formatBDT0, formatBDT2 } from '../../utils/format'
import { useAuth } from '../../hooks/useAuth'

const EMPTY_FORM = {
  asset_management_company_id: '',
  investment_type_id: '',
  investment_id: '',
  investment_date: '',
  investment_amount: '',
  market_value: '',
  nav: '',
  gain_loss: '',
}

const EMPTY_FILTERS = {
  search: '',
  asset_management_company_id: '',
  investment_type_id: '',
  investment_id: '',
  from_date: '',
  to_date: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function calculateGainLoss(marketValue, investmentAmount) {
  const market = Number(marketValue)
  const amount = Number(investmentAmount)
  if (Number.isNaN(market) || Number.isNaN(amount)) return ''
  return String(market - amount)
}

function buildCreatePayload(form) {
  return {
    investment_id: Number(form.investment_id),
    investment_date: form.investment_date,
    market_value: Number(form.market_value),
    nav: Number(form.nav),
  }
}

function buildUpdatePayload(form) {
  return {
    investment_date: form.investment_date,
    market_value: Number(form.market_value),
    nav: Number(form.nav),
  }
}

function InvestmentDetailsManager() {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('investment_details.create')
  const canUpdate = hasPermission('investment_details.update')
  const canDelete = hasPermission('investment_details.delete')
  const [items, setItems] = useState([])
  const [companies, setCompanies] = useState([])
  const [investmentTypeOptions, setInvestmentTypeOptions] = useState([])
  const [investmentOptions, setInvestmentOptions] = useState([])
  const [filterInvestmentTypeOptions, setFilterInvestmentTypeOptions] = useState([])
  const [filterInvestmentOptions, setFilterInvestmentOptions] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editingId, setEditingId] = useState(null)
  const [actionError, setActionError] = useState(null)
  const [formError, setFormError] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [sortBy, setSortBy] = useState('investment_date')
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
      if (filters.investment_id) params.investment_id = Number(filters.investment_id)
      if (filters.from_date) params.from_date = filters.from_date
      if (filters.to_date) params.to_date = filters.to_date

      const res = await client.get('/investment-details', { params })
      setItems(res.data.items)
      setTotal(res.data.total)
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to load investment details')
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

  const loadInvestmentOptions = useCallback(async (companyId, investmentTypeId, setter = setInvestmentOptions) => {
    if (!companyId || !investmentTypeId) {
      setter([])
      return []
    }
    const res = await client.get('/investment-details/options/investments', {
      params: {
        asset_management_company_id: Number(companyId),
        investment_type_id: Number(investmentTypeId),
      },
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
      setFilterInvestmentOptions([])
      setFilters((current) => ({ ...current, investment_type_id: '', investment_id: '' }))
    }
  }, [filters.asset_management_company_id, loadInvestmentTypeOptions])

  useEffect(() => {
    if (filters.asset_management_company_id && filters.investment_type_id) {
      loadInvestmentOptions(filters.asset_management_company_id, filters.investment_type_id, setFilterInvestmentOptions).catch(() => {
        setFilterInvestmentOptions([])
      })
    } else {
      setFilterInvestmentOptions([])
      setFilters((current) => ({ ...current, investment_id: '' }))
    }
  }, [filters.asset_management_company_id, filters.investment_type_id, loadInvestmentOptions])

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((current) => {
      const next = { ...current, [name]: value }
      if (name === 'market_value') {
        next.gain_loss = calculateGainLoss(value, current.investment_amount)
      }
      return next
    })
  }

  async function handleCompanyChange(e) {
    const companyId = e.target.value
    setForm((current) => ({
      ...current,
      asset_management_company_id: companyId,
      investment_type_id: '',
      investment_id: '',
      investment_amount: '',
      gain_loss: '',
    }))
    setInvestmentTypeOptions([])
    setInvestmentOptions([])
    setFormError(null)
    if (companyId) {
      try {
        await loadInvestmentTypeOptions(companyId)
      } catch {
        setFormError('Failed to load investment types')
      }
    }
  }

  async function handleInvestmentTypeChange(e) {
    const investmentTypeId = e.target.value
    setForm((current) => ({
      ...current,
      investment_type_id: investmentTypeId,
      investment_id: '',
      investment_amount: '',
      gain_loss: '',
    }))
    setInvestmentOptions([])
    setFormError(null)
    if (form.asset_management_company_id && investmentTypeId) {
      try {
        await loadInvestmentOptions(form.asset_management_company_id, investmentTypeId)
      } catch {
        setFormError('Failed to load investments')
      }
    }
  }

  function handleInvestmentChange(e) {
    const investmentId = e.target.value
    const investment = investmentOptions.find((item) => String(item.id) === investmentId)
    const investmentAmount = investment ? String(investment.investment_amount) : ''
    setForm((current) => ({
      ...current,
      investment_id: investmentId,
      investment_amount: investmentAmount,
      gain_loss: calculateGainLoss(current.market_value, investmentAmount),
    }))
  }

  function handleFilterChange(e) {
    const { name, value } = e.target
    setFilters((current) => {
      if (name === 'asset_management_company_id') {
        return { ...current, asset_management_company_id: value, investment_type_id: '', investment_id: '' }
      }
      if (name === 'investment_type_id') {
        return { ...current, investment_type_id: value, investment_id: '' }
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
    const investmentTypeId = String(item.investment_type_id)
    const investmentId = String(item.investment_id)
    setForm({
      asset_management_company_id: companyId,
      investment_type_id: investmentTypeId,
      investment_id: investmentId,
      investment_date: item.investment_date,
      investment_amount: String(item.investment_amount),
      market_value: String(item.market_value),
      nav: String(item.nav),
      gain_loss: String(item.gain_loss),
    })
    try {
      await loadInvestmentTypeOptions(companyId)
      await loadInvestmentOptions(companyId, investmentTypeId)
    } catch {
      setFormError('Failed to load investment options for editing')
    }
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setInvestmentTypeOptions([])
    setInvestmentOptions([])
    setFormError(null)
  }

  async function handleDelete(item) {
    if (!confirm(`Delete investment detail for ${item.investment_code} on ${item.investment_date}?`)) return

    setActionError(null)
    try {
      await client.delete(`/investment-details/${item.id}`)
      setItems((current) => current.filter((row) => row.id !== item.id))
      setTotal((current) => Math.max(current - 1, 0))
      if (editingId === item.id) handleCancelEdit()
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to delete investment detail')
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()

    if (!form.investment_id) {
      setFormError('Investment is required')
      return
    }
    if (!form.investment_date) {
      setFormError('Investment date is required')
      return
    }
    if (form.market_value === '' || Number(form.market_value) < 0) {
      setFormError('Market value must be greater than or equal to zero')
      return
    }
    if (!form.nav || Number(form.nav) <= 0) {
      setFormError('NAV must be greater than zero')
      return
    }

    setSubmitting(true)
    setFormError(null)
    try {
      if (editingId) {
        const res = await client.put(`/investment-details/${editingId}`, buildUpdatePayload(form))
        setItems((current) => current.map((row) => (row.id === editingId ? res.data : row)))
        setEditingId(null)
      } else {
        await client.post('/investment-details', buildCreatePayload(form))
        await fetchItems()
      }
      setForm(EMPTY_FORM)
      setInvestmentTypeOptions([])
      setInvestmentOptions([])
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to save investment detail')
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
            placeholder="Investment code"
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
          <label className="mb-1 block text-xs text-gray-600">Investment</label>
          <select
            name="investment_id"
            value={filters.investment_id}
            onChange={handleFilterChange}
            disabled={!filters.asset_management_company_id || !filters.investment_type_id}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="">All Investments</option>
            {filterInvestmentOptions.map((option) => (
              <option key={option.id} value={option.id}>{option.investment_code}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">From</label>
          <input type="date" name="from_date" value={filters.from_date} onChange={handleFilterChange} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">To</label>
          <input type="date" name="to_date" value={filters.to_date} onChange={handleFilterChange} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      </div>

      <div className="mb-6 overflow-x-auto">
        <div className="mb-2 flex justify-end">
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value))
              setPage(1)
            }}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value={10}>10</option>
            <option value={25}>25</option>
            <option value={50}>50</option>
          </select>
        </div>
        <table className="w-full border-collapse rounded border border-gray-200 bg-white text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600">
              <th className="px-4 py-2 font-medium">Investment Code</th>
              <th className="px-4 py-2 font-medium">AMC</th>
              <th className="px-4 py-2 font-medium">Investment Type</th>
              <th className="px-4 py-2 font-medium"><button type="button" onClick={() => handleSort('investment_date')}>Date</button></th>
              <th className="px-4 py-2 font-medium"><button type="button" onClick={() => handleSort('investment_amount')}>Investment Amount</button></th>
              <th className="px-4 py-2 font-medium"><button type="button" onClick={() => handleSort('market_value')}>Market Value</button></th>
              <th className="px-4 py-2 font-medium"><button type="button" onClick={() => handleSort('nav')}>NAV</button></th>
              <th className="px-4 py-2 font-medium"><button type="button" onClick={() => handleSort('gain_loss')}>Gain/Loss</button></th>
              <th className="px-4 py-2 font-medium">Created</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} className="px-4 py-4 text-center text-gray-400">Loading…</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-4 text-center text-gray-400">No investment details found.</td>
              </tr>
            ) : (
              items.map((item) => (
                <tr key={item.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-800">{item.investment_code}</td>
                  <td className="px-4 py-2 text-gray-600">{item.asset_management_company_name ?? '—'}</td>
                  <td className="px-4 py-2 text-gray-600">{item.investment_type_name}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.investment_date)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatBDT0(item.investment_amount)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatBDT0(item.market_value)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatBDT2(item.nav)}</td>
                  <td className={`px-4 py-2 ${Number(item.gain_loss) >= 0 ? 'text-green-600' : 'text-red-600'}`}>{formatBDT0(item.gain_loss)}</td>
                  <td className="px-4 py-2 text-gray-600">{formatDate(item.created_at)}</td>
                  <td className="flex gap-2 px-4 py-2">
                    {canUpdate && (
                      <button onClick={() => handleEdit(item)} className="rounded bg-blue-50 px-2 py-1 text-xs text-blue-600 hover:bg-blue-100">View / Edit</button>
                    )}
                    {canDelete && (
                      <button onClick={() => handleDelete(item)} className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100">Delete</button>
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
          <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded bg-gray-100 px-3 py-1 disabled:opacity-50">Previous</button>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => current + 1)} className="rounded bg-gray-100 px-3 py-1 disabled:opacity-50">Next</button>
        </div>
      </div>

      {(canCreate || (canUpdate && editingId)) && (
        <form onSubmit={handleSubmit} className="flex max-w-5xl flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700">{editingId ? 'Edit Investment Detail' : 'Add Investment Detail'}</h3>
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Asset Management Company</label>
            <select name="asset_management_company_id" required value={form.asset_management_company_id} onChange={handleCompanyChange} disabled={Boolean(editingId)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
              <option value="">Select AMC…</option>
              {companies.filter((company) => company.is_active).map((company) => (
                <option key={company.id} value={company.id}>{company.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Investment Type</label>
            <select name="investment_type_id" required value={form.investment_type_id} onChange={handleInvestmentTypeChange} disabled={!form.asset_management_company_id || Boolean(editingId)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
              <option value="">Select investment type…</option>
              {investmentTypeOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.investment_type_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Investment</label>
            <select name="investment_id" required value={form.investment_id} onChange={handleInvestmentChange} disabled={!form.asset_management_company_id || !form.investment_type_id || Boolean(editingId)} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100">
              <option value="">Select investment…</option>
              {investmentOptions.map((option) => (
                <option key={option.id} value={option.id}>{option.investment_code}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Investment Date</label>
            <input type="date" name="investment_date" required value={form.investment_date} onChange={handleFormChange} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Investment Amount</label>
            <input value={form.investment_amount ? formatBDT0(form.investment_amount) : ''} readOnly placeholder="Auto-loaded from investment" className="w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Market Value</label>
            <input type="number" min="0" step="0.01" name="market_value" required value={form.market_value} onChange={handleFormChange} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">NAV</label>
            <input type="number" min="0.0001" step="0.0001" name="nav" required value={form.nav} onChange={handleFormChange} className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Gain/Loss</label>
            <input value={form.gain_loss ? formatBDT0(form.gain_loss) : ''} readOnly className="w-full rounded border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-600" />
          </div>
        </div>
        {formError && <p className="text-sm text-red-600">{formError}</p>}
        <div className="flex gap-2">
          <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
            {submitting ? (editingId ? 'Updating…' : 'Creating…') : editingId ? 'Update Investment Detail' : 'Add Investment Detail'}
          </button>
          {editingId && <button type="button" onClick={handleCancelEdit} className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-300">Cancel</button>}
        </div>
        </form>
      )}
    </div>
  )
}

export default InvestmentDetailsManager
