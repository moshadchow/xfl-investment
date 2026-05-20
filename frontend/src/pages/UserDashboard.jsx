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

function UserDashboard() {
  const [entries, setEntries] = useState([])
  const [fromDate, setFromDate] = useState(firstOfMonth)
  const [toDate, setToDate] = useState(today)
  const [fetchError, setFetchError] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchEntries = useCallback(async (from, to) => {
    setFetchError(null)
    setLoading(true)
    try {
      const res = await client.get('/report', { params: { from_date: from, to_date: to } })
      setEntries(res.data)
    } catch (err) {
      setFetchError(err.response?.data?.detail ?? 'Failed to load report data')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEntries(fromDate, toDate)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleFilterSubmit(e) {
    e.preventDefault()
    fetchEntries(fromDate, toDate)
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-8">
          <h1 className="mb-8 text-2xl font-bold text-gray-800">My Report</h1>

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
