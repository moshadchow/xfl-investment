import { useState, useEffect, useCallback } from 'react'
import client from '../../api/client'
import { formatBDT0, formatBDT2 } from '../../utils/format'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

const EMPTY_FORM = { date: '', investment: '', market_value: '', nav: '', company_id: '' }

function FundDataForm() {
  const [entries, setEntries] = useState([])
  const [companies, setCompanies] = useState([])
  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate] = useState(today)
  const [form, setForm] = useState(EMPTY_FORM)
  const [editingId, setEditingId] = useState(null)
  const [formError, setFormError] = useState(null)
  const [fetchError, setFetchError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const fetchEntries = useCallback(async (from, to) => {
    setFetchError(null)
    try {
      const res = await client.get('/fund-data', { params: { from_date: from, to_date: to } })
      setEntries(res.data)
    } catch (err) {
      setFetchError(err.response?.data?.detail ?? 'Failed to load entries')
    }
  }, [])

  useEffect(() => {
    fetchEntries(fromDate, toDate)
    client.get('/companies').then((res) => setCompanies(res.data))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterSubmit(e) {
    e.preventDefault()
    fetchEntries(fromDate, toDate)
  }

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((f) => ({ ...f, [name]: value }))
  }

  function handleEdit(entry) {
    setEditingId(entry.id)
    setForm({
      date: entry.date,
      investment: Number(entry.investment).toFixed(0),
      market_value: Number(entry.market_value).toFixed(0),
      nav: Number(entry.nav).toFixed(2),
      company_id: entry.company_id ?? '',
    })
    setFormError(null)
  }

  function handleCancelEdit() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setFormError(null)
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    setFormError(null)
    const payload = {
      date: form.date,
      investment: Number(form.investment),
      market_value: Number(form.market_value),
      nav: Number(form.nav),
      company_id: form.company_id ? Number(form.company_id) : null,
    }
    try {
      if (editingId === null) {
        const res = await client.post('/fund-data', payload)
        setEntries((prev) => [res.data, ...prev])
      } else {
        const res = await client.put(`/fund-data/${editingId}`, payload)
        setEntries((prev) => prev.map((e) => (e.id === editingId ? res.data : e)))
        setEditingId(null)
      }
      setForm(EMPTY_FORM)
    } catch (err) {
      const detail = err.response?.data?.detail
      setFormError(typeof detail === 'string' ? detail : 'Failed to save entry')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(entry) {
    setFetchError(null)
    try {
      await client.delete(`/fund-data/${entry.id}`)
      setEntries((prev) => prev.filter((e) => e.id !== entry.id))
    } catch (err) {
      setFetchError(err.response?.data?.detail ?? 'Failed to delete entry')
    }
  }

  return (
    <div>
      <h2 className="mb-4 text-xl font-semibold text-gray-800">Fund Data</h2>

      {/* Date range filter */}
      <form onSubmit={handleFilterSubmit} className="mb-6 flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-gray-600">From</label>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-gray-600">To</label>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          type="submit"
          className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
        >
          Filter
        </button>
      </form>

      {fetchError && (
        <div className="mb-4 flex items-center justify-between rounded bg-red-50 px-4 py-2 text-sm text-red-700">
          <span>{fetchError}</span>
          <button onClick={() => setFetchError(null)} className="ml-4 font-bold">x</button>
        </div>
      )}

      {/* Entry table */}
      <div className="mb-8 overflow-x-auto">
        <table className="w-full border-collapse rounded border border-gray-200 bg-white text-sm">
          <thead>
            <tr className="bg-gray-100 text-left text-gray-600">
              <th className="px-4 py-2 font-medium">Date</th>
              <th className="px-4 py-2 font-medium">Investment</th>
              <th className="px-4 py-2 font-medium">Market Value</th>
              <th className="px-4 py-2 font-medium">NAV</th>
              <th className="px-4 py-2 font-medium">Gain/Loss</th>
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-4 text-center text-gray-400">
                  No entries in this date range.
                </td>
              </tr>

            ) : (
              [...entries]
                .sort((a, b) => a.date.localeCompare(b.date))
                .map((entry, i, sorted) => {
                  const gainLoss =
                    i > 0
                      ? Number(entry.market_value) - Number(sorted[i - 1].market_value)
                      : null
                  return (
                <tr key={entry.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-800">{entry.date}</td>
                  <td className="px-4 py-2 text-gray-800">{formatBDT0(entry.investment)}</td>
                  <td className="px-4 py-2 text-gray-800">{formatBDT0(entry.market_value)}</td>
                  <td className="px-4 py-2 text-gray-800">{formatBDT2(entry.nav)}</td>
                  <td className="px-4 py-2 text-gray-800">
                    {gainLoss === null ? '—' : formatBDT0(gainLoss)}
                  </td>
                  <td className="px-4 py-2 text-gray-500">{entry.company_name ?? '—'}</td>
                  <td className="flex gap-2 px-4 py-2">
                    <button
                      onClick={() => handleEdit(entry)}
                      className="rounded bg-gray-100 px-2 py-1 text-xs text-gray-700 hover:bg-gray-200"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(entry)}
                      className="rounded bg-red-50 px-2 py-1 text-xs text-red-600 hover:bg-red-100"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
                  )
                })
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit form */}
      <form onSubmit={handleSubmit} className="flex max-w-2xl flex-col gap-3">
        <h3 className="text-sm font-medium text-gray-700">
          {editingId === null ? 'Add Entry' : 'Edit Entry'}
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs text-gray-600">Date</label>
            <input
              type="date"
              name="date"
              required
              value={form.date}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Investment</label>
            <input
              type="number"
              name="investment"
              required
              step="1"
              min="0"
              value={form.investment}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Market Value</label>
            <input
              type="number"
              name="market_value"
              required
              step="1"
              min="0"
              value={form.market_value}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">NAV</label>
            <input
              type="number"
              name="nav"
              required
              step="0.01"
              min="0"
              value={form.nav}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-gray-600">Company</label>
            <select
              name="company_id"
              value={form.company_id}
              onChange={handleFormChange}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">None</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
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
            {submitting ? 'Saving…' : editingId === null ? 'Add Entry' : 'Update Entry'}
          </button>
          {editingId !== null && (
            <button
              type="button"
              onClick={handleCancelEdit}
              className="rounded bg-gray-100 px-4 py-2 text-sm text-gray-700 hover:bg-gray-200"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default FundDataForm
