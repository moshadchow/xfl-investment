import { useState, useEffect, useCallback } from 'react'
import Navbar from '../components/layout/Navbar'
import Sidebar from '../components/layout/Sidebar'
import ReportTable from '../components/user/ReportTable'
import GainLossChart from '../components/user/GainLossChart'
import client from '../api/client'

function today() {
  return new Date().toISOString().slice(0, 10)
}

function firstOfMonth() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}

function mapInvestmentDetail(entry) {
  return {
    ...entry,
    date: entry.investment_date,
    investment: entry.investment_amount,
    company_name: entry.asset_management_company_name,
  }
}

function UserDashboard() {
  const [entries, setEntries] = useState([])
  const [companies, setCompanies] = useState([])
  const [companyId, setCompanyId] = useState('')
  const [investmentTypes, setInvestmentTypes] = useState([])
  const [investmentTypeId, setInvestmentTypeId] = useState('')
  const [investments, setInvestments] = useState([])
  const [investmentId, setInvestmentId] = useState('')
  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate] = useState(today)
  const [fetchError, setFetchError] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async (from, to, cid) => {
    setFetchError(null)
    setLoading(true)
    try {
      const params = { from_date: from, to_date: to }
      if (cid) params.asset_management_company_id = cid
      if (investmentTypeId) params.investment_type_id = investmentTypeId
      if (investmentId) params.investment_id = investmentId
      const res = await client.get('/investment-details', { params })
      setEntries((res.data.items ?? []).map(mapInvestmentDetail))
    } catch (err) {
      setFetchError(err.response?.data?.detail ?? 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [investmentTypeId, investmentId])

  useEffect(() => {
    fetchEntries(fromDate, toDate, companyId)
    client.get('/companies/list').then((res) => setCompanies(res.data))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch investment types when a company is selected
  useEffect(() => {
    setInvestmentTypeId('')
    setInvestmentId('')
    setInvestments([])
    if (!companyId) {
      setInvestmentTypes([])
      return
    }
    client.get('/investments/options/investment-types', {
      params: { asset_management_company_id: companyId },
    })
      .then((res) => setInvestmentTypes(res.data))
      .catch(() => setInvestmentTypes([]))
  }, [companyId])

  // Fetch investments when investment type is selected
  useEffect(() => {
    setInvestmentId('')
    if (!companyId || !investmentTypeId) {
      setInvestments([])
      return
    }
    client.get('/investment-details/options/investments', {
      params: { asset_management_company_id: companyId, investment_type_id: investmentTypeId },
    })
      .then((res) => setInvestments(res.data))
      .catch(() => setInvestments([]))
  }, [companyId, investmentTypeId])

  function handleFilterSubmit(e) {
    e.preventDefault()
    fetchEntries(fromDate, toDate, companyId)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-8">
          <h1 className="mb-8 text-2xl font-bold text-gray-800">My Investment</h1>

          {/* Date range filter */}
          <form onSubmit={handleFilterSubmit} className="mb-6 rounded border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">From</label>
                <input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">To</label>
                <input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">AMC</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All AMCs</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Investment Type</label>
                <select
                  value={investmentTypeId}
                  onChange={(e) => setInvestmentTypeId(e.target.value)}
                  disabled={!companyId}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">All Types</option>
                  {investmentTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.investment_type_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-600">Investment</label>
                <select
                  value={investmentId}
                  onChange={(e) => setInvestmentId(e.target.value)}
                  disabled={!companyId || !investmentTypeId}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                >
                  <option value="">All Investments</option>
                  {investments.map((inv) => (
                    <option key={inv.id} value={inv.id}>{inv.investment_code}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                className="rounded bg-gray-700 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
              >
                Filter
              </button>
            </div>
          </form>

          {fetchError && (
            <div className="mb-4 flex items-center justify-between rounded bg-red-50 px-4 py-2 text-sm text-red-700">
              <span>{fetchError}</span>
              <button onClick={() => setFetchError(null)} className="ml-4 font-bold">x</button>
            </div>
          )}

          {/* Data table */}
          <div className="mb-8">
            <h2 className="mb-3 text-lg font-semibold text-gray-700">Fund Data</h2>
            <ReportTable data={entries} loading={loading} />
          </div>

          {/* Gain/Loss Chart */}
          {!loading && entries.length > 0 && (
            <div className="mt-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-700">Gain/Loss Chart</h2>
              <div className="rounded border border-gray-200 bg-white p-4">
                <GainLossChart data={entries} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default UserDashboard
