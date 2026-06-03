import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  ComposedChart,
} from 'recharts'
import client from '../../api/client'
import { formatBDT2 } from '../../utils/format'

const EMPTY_FORM = {
  asset_management_company_id: '',
  investment_type: '',
  sub_investment_type_id: '',
  investment_date: '',
  investment_amount: '',
  market_value: '',
  nav: '',
  gain_loss: '',
}

const EMPTY_FILTERS = {
  asset_management_company_id: '',
  investment_type: '',
  sub_investment_type_id: '',
  from_date: '',
  to_date: '',
}

function formatDate(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString()
}

function formatGainLoss(value) {
  if (value == null || Number.isNaN(Number(value))) return '—'
  return formatBDT2(value)
}

function calculateGainLoss(marketValue, investmentAmount) {
  if (marketValue === '' || investmentAmount === '') return ''
  const market = Number(marketValue)
  const amount = Number(investmentAmount)
  if (Number.isNaN(market) || Number.isNaN(amount)) return ''
  return (market - amount).toFixed(2)
}

function buildPayload(form) {
  return {
    asset_management_company_id: Number(form.asset_management_company_id),
    investment_type: form.investment_type,
    sub_investment_type_id: Number(form.sub_investment_type_id),
    investment_date: form.investment_date,
    market_value: Number(form.market_value),
    nav: Number(form.nav),
  }
}

function InvestmentDetailsManager() {
  const [items, setItems] = useState([])
  const [companies, setCompanies] = useState([])
  const [investmentTypeOptions, setInvestmentTypeOptions] = useState([])
  const [subInvestmentTypeOptions, setSubInvestmentTypeOptions] = useState([])
  const [filterInvestmentTypeOptions, setFilterInvestmentTypeOptions] = useState([])
  const [filterSubInvestmentTypeOptions, setFilterSubInvestmentTypeOptions] = useState([])
  const [form, setForm] = useState(EMPTY_FORM)
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const [editingId, setEditingId] = useState(null)
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState('')
  const [formError, setFormError] = useState('')
  const [sortBy, setSortBy] = useState('investment_date')
  const [sortDir, setSortDir] = useState('desc')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  const chartData = useMemo(
    () =>
      [...items]
        .sort((a, b) => new Date(a.investment_date) - new Date(b.investment_date))
        .map((item) => ({
          date: item.investment_date,
          investment_amount: Number(item.investment_amount),
          market_value: Number(item.market_value),
          gain_loss: Number(item.gain_loss),
        })),
    [items],
  )

  const loadCompanies = useCallback(async () => {
    const res = await client.get('/companies/list')
    setCompanies(res.data)
  }, [])

  const loadInvestmentTypes = useCallback(async (companyId, setter = setInvestmentTypeOptions) => {
    if (!companyId) {
      setter([])
      return
    }
    const res = await client.get('/investments/options/investment-types', {
      params: { asset_management_company_id: Number(companyId) },
    })
    setter(res.data)
  }, [])

  const loadSubInvestmentTypes = useCallback(async (companyId, investmentType, setter = setSubInvestmentTypeOptions) => {
    if (!companyId || !investmentType) {
      setter([])
      return
    }
    const res = await client.get('/investments/options/sub-investment-types', {
      params: {
        asset_management_company_id: Number(companyId),
        investment_type: investmentType,
      },
    })
    setter(res.data)
  }, [])

  const loadItems = useCallback(async () => {
    setLoading(true)
    setActionError('')
    try {
      const params = { sort_by: sortBy, sort_dir: sortDir, page, page_size: pageSize }
      if (filters.asset_management_company_id) params.asset_management_company_id = Number(filters.asset_management_company_id)
      if (filters.investment_type) params.investment_type = filters.investment_type
      if (filters.sub_investment_type_id) params.sub_investment_type_id = Number(filters.sub_investment_type_id)
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

  useEffect(() => {
    loadCompanies().catch((err) => {
      setActionError(err.response?.data?.detail ?? 'Failed to load companies')
    })
  }, [loadCompanies])

  useEffect(() => {
    loadItems()
  }, [loadItems])

  const validateForm = () => {
    if (!form.asset_management_company_id) return 'AMC is required'
    if (!form.investment_type) return 'Investment type is required'
    if (!form.sub_investment_type_id) return 'Sub-investment type is required'
    if (!form.investment_date) return 'Investment date is required'
    if (form.market_value === '' || Number(form.market_value) < 0) return 'Market value must be greater than or equal to zero'
    if (form.nav === '' || Number(form.nav) <= 0) return 'NAV must be greater than zero'
    return ''
  }

  const handleFormChange = (event) => {
    const { name, value } = event.target
    setForm((current) => {
      if (name === 'asset_management_company_id') {
        loadInvestmentTypes(value).catch((err) => setFormError(err.response?.data?.detail ?? 'Failed to load investment types'))
        setSubInvestmentTypeOptions([])
        return {
          ...current,
          asset_management_company_id: value,
          investment_type: '',
          sub_investment_type_id: '',
          investment_amount: '',
          gain_loss: '',
        }
      }
      if (name === 'investment_type') {
        loadSubInvestmentTypes(current.asset_management_company_id, value).catch((err) => setFormError(err.response?.data?.detail ?? 'Failed to load sub-investment types'))
        return {
          ...current,
          investment_type: value,
          sub_investment_type_id: '',
          investment_amount: '',
          gain_loss: '',
        }
      }
      if (name === 'sub_investment_type_id') {
        return {
          ...current,
          sub_investment_type_id: value,
          investment_amount: '',
          gain_loss: '',
        }
      }
      if (name === 'market_value') {
        return { ...current, market_value: value, gain_loss: calculateGainLoss(value, current.investment_amount) }
      }
      return { ...current, [name]: value }
    })
  }

  const handleFilterChange = (event) => {
    const { name, value } = event.target
    setFilters((current) => {
      if (name === 'asset_management_company_id') {
        loadInvestmentTypes(value, setFilterInvestmentTypeOptions).catch((err) => setActionError(err.response?.data?.detail ?? 'Failed to load investment types'))
        setFilterSubInvestmentTypeOptions([])
        return { ...current, asset_management_company_id: value, investment_type: '', sub_investment_type_id: '' }
      }
      if (name === 'investment_type') {
        loadSubInvestmentTypes(current.asset_management_company_id, value, setFilterSubInvestmentTypeOptions).catch((err) => setActionError(err.response?.data?.detail ?? 'Failed to load sub-investment types'))
        return { ...current, investment_type: value, sub_investment_type_id: '' }
      }
      return { ...current, [name]: value }
    })
    setPage(1)
  }

  const resetForm = () => {
    setForm(EMPTY_FORM)
    setInvestmentTypeOptions([])
    setSubInvestmentTypeOptions([])
    setEditingId(null)
    setFormError('')
  }

  const startEdit = async (item) => {
    setEditingId(item.id)
    setFormError('')
    setForm({
      asset_management_company_id: String(item.asset_management_company_id),
      investment_type: item.investment_type,
      sub_investment_type_id: String(item.sub_investment_type_id),
      investment_date: item.investment_date,
      investment_amount: String(item.investment_amount),
      market_value: String(item.market_value),
      nav: String(item.nav),
      gain_loss: String(item.gain_loss),
    })
    try {
      await loadInvestmentTypes(item.asset_management_company_id)
      await loadSubInvestmentTypes(item.asset_management_company_id, item.investment_type)
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to load edit options')
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const error = validateForm()
    if (error) {
      setFormError(error)
      return
    }

    setSubmitting(true)
    setFormError('')
    try {
      const payload = buildPayload(form)
      if (editingId) {
        await client.put(`/investment-details/${editingId}`, payload)
      } else {
        await client.post('/investment-details', payload)
      }
      resetForm()
      await loadItems()
    } catch (err) {
      setFormError(err.response?.data?.detail ?? 'Failed to save investment detail')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete investment detail for ${item.investment_code} on ${item.investment_date}?`)) return
    setActionError('')
    try {
      await client.delete(`/investment-details/${item.id}`)
      await loadItems()
    } catch (err) {
      setActionError(err.response?.data?.detail ?? 'Failed to delete investment detail')
    }
  }

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortDir((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortBy(column)
      setSortDir('asc')
    }
    setPage(1)
  }

  const sortLabel = (column) => (sortBy === column ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '')

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Investment Details</h1>
        <p className="text-sm text-gray-600">Maintain periodic market value, NAV, and gain/loss records.</p>
      </div>

      <form onSubmit={handleSubmit} className="rounded border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-medium text-gray-900">{editingId ? 'Edit Investment Detail' : 'Create Investment Detail'}</h2>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-sm text-blue-600 hover:underline">
              Cancel edit
            </button>
          )}
        </div>
        {formError && <div className="mb-4 rounded bg-red-50 p-3 text-sm text-red-700">{formError}</div>}
        <div className="grid gap-4 md:grid-cols-4">
          <label className="text-sm text-gray-700">
            AMC
            <select name="asset_management_company_id" value={form.asset_management_company_id} onChange={handleFormChange} className="mt-1 w-full rounded border border-gray-300 px-3 py-2">
              <option value="">Select AMC</option>
              {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Investment Type
            <select name="investment_type" value={form.investment_type} onChange={handleFormChange} className="mt-1 w-full rounded border border-gray-300 px-3 py-2">
              <option value="">Select Type</option>
              {investmentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Sub-Investment Type
            <select name="sub_investment_type_id" value={form.sub_investment_type_id} onChange={handleFormChange} className="mt-1 w-full rounded border border-gray-300 px-3 py-2">
              <option value="">Select Sub-Type</option>
              {subInvestmentTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
            </select>
          </label>
          <label className="text-sm text-gray-700">
            Investment Date
            <input type="date" name="investment_date" value={form.investment_date} onChange={handleFormChange} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm text-gray-700">
            Investment Amount
            <input name="investment_amount" value={form.investment_amount || 'Auto-loaded after save'} readOnly className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2" />
          </label>
          <label className="text-sm text-gray-700">
            Market Value
            <input type="number" min="0" step="0.01" name="market_value" value={form.market_value} onChange={handleFormChange} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm text-gray-700">
            NAV
            <input type="number" min="0.0001" step="0.0001" name="nav" value={form.nav} onChange={handleFormChange} className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
          </label>
          <label className="text-sm text-gray-700">
            Gain/Loss
            <input name="gain_loss" value={form.gain_loss} readOnly className="mt-1 w-full rounded border border-gray-300 bg-gray-100 px-3 py-2" />
          </label>
        </div>
        <div className="mt-4 flex justify-end">
          <button type="submit" disabled={submitting} className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">
            {submitting ? 'Saving...' : editingId ? 'Update Detail' : 'Create Detail'}
          </button>
        </div>
      </form>

      <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-lg font-medium text-gray-900">Filters</h2>
        <div className="grid gap-3 md:grid-cols-4 lg:grid-cols-6">
          <select name="asset_management_company_id" value={filters.asset_management_company_id} onChange={handleFilterChange} className="rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="">All AMCs</option>
            {companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
          </select>
          <select name="investment_type" value={filters.investment_type} onChange={handleFilterChange} className="rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="">All Types</option>
            {filterInvestmentTypeOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
          <select name="sub_investment_type_id" value={filters.sub_investment_type_id} onChange={handleFilterChange} className="rounded border border-gray-300 px-3 py-2 text-sm">
            <option value="">All Sub-Types</option>
            {filterSubInvestmentTypeOptions.map((option) => <option key={option.id} value={option.id}>{option.name}</option>)}
          </select>
          <input type="date" name="from_date" value={filters.from_date} onChange={handleFilterChange} className="rounded border border-gray-300 px-3 py-2 text-sm" />
          <input type="date" name="to_date" value={filters.to_date} onChange={handleFilterChange} className="rounded border border-gray-300 px-3 py-2 text-sm" />
        </div>
      </div>

      {chartData.length > 0 && (
        <div className="rounded border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-lg font-medium text-gray-900">Historical Trend</h2>
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="date" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => formatBDT2(value)} />
              <Tooltip formatter={(value) => formatBDT2(value)} />
              <Legend />
              <Line type="monotone" dataKey="investment_amount" name="Investment Amount" stroke="#3b82f6" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="market_value" name="Market Value" stroke="#22c55e" dot={false} strokeWidth={2} />
              <Line type="monotone" dataKey="gain_loss" name="Gain/Loss" stroke="#f97316" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}

      <div className="rounded border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <h2 className="text-lg font-medium text-gray-900">Investment Detail Records</h2>
          <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1) }} className="rounded border border-gray-300 px-2 py-1 text-sm">
            {[10, 25, 50].map((size) => <option key={size} value={size}>{size} / page</option>)}
          </select>
        </div>
        {actionError && <div className="m-4 rounded bg-red-50 p-3 text-sm text-red-700">{actionError}</div>}
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">AMC</th>
                <th className="px-4 py-3">Investment Type</th>
                <th className="px-4 py-3">Sub-Type</th>
                <th className="px-4 py-3">Investment Code</th>
                <th className="px-4 py-3"><button type="button" onClick={() => handleSort('investment_date')}>Investment Date{sortLabel('investment_date')}</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => handleSort('investment_amount')}>Investment Amount{sortLabel('investment_amount')}</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => handleSort('market_value')}>Market Value{sortLabel('market_value')}</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => handleSort('nav')}>NAV{sortLabel('nav')}</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => handleSort('gain_loss')}>Gain/Loss{sortLabel('gain_loss')}</button></th>
                <th className="px-4 py-3"><button type="button" onClick={() => handleSort('created_at')}>Created{sortLabel('created_at')}</button></th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {loading ? (
                <tr><td colSpan="11" className="px-4 py-6 text-center text-gray-500">Loading...</td></tr>
              ) : items.length === 0 ? (
                <tr><td colSpan="11" className="px-4 py-6 text-center text-gray-500">No investment details found.</td></tr>
              ) : items.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">{item.asset_management_company_name ?? '—'}</td>
                  <td className="px-4 py-3">{item.investment_type}</td>
                  <td className="px-4 py-3">{item.sub_investment_type_name ?? '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{item.investment_code}</td>
                  <td className="px-4 py-3">{formatDate(item.investment_date)}</td>
                  <td className="px-4 py-3">{formatBDT2(item.investment_amount)}</td>
                  <td className="px-4 py-3">{formatBDT2(item.market_value)}</td>
                  <td className="px-4 py-3">{formatBDT2(item.nav)}</td>
                  <td className={`px-4 py-3 ${Number(item.gain_loss) < 0 ? 'text-red-600' : 'text-green-700'}`}>{formatGainLoss(item.gain_loss)}</td>
                  <td className="px-4 py-3">{formatDate(item.created_at)}</td>
                  <td className="space-x-2 px-4 py-3">
                    <button type="button" onClick={() => startEdit(item)} className="text-blue-600 hover:underline">View / Edit</button>
                    <button type="button" onClick={() => handleDelete(item)} className="text-red-600 hover:underline">Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-200 p-4 text-sm text-gray-600">
          <span>Page {page} of {totalPages} ({total} records)</span>
          <div className="space-x-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50">Previous</button>
            <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded border border-gray-300 px-3 py-1 disabled:opacity-50">Next</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default InvestmentDetailsManager
