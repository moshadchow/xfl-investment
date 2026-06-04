import { formatBDT0, formatBDT2 } from '../../utils/format'

function ReportTable({ data, loading }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse rounded border border-gray-200 bg-white text-sm">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Investment Amount</th>
            <th className="px-4 py-2 font-medium">Market Value</th>
            <th className="px-4 py-2 font-medium">NAV</th>
            <th className="px-4 py-2 font-medium">Gain/Loss</th>
            <th className="px-4 py-2 font-medium">Company</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={6} className="px-4 py-4 text-center text-gray-400">
                Loading…
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-4 py-4 text-center text-gray-400">
                No entries in this date range.
              </td>
            </tr>
          ) : (
            sorted.map((entry) => {
              const gainLoss =
                entry.investment != null && entry.market_value != null
                  ? Number(entry.investment) - Number(entry.market_value)
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
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </div>
  )
}

export default ReportTable
