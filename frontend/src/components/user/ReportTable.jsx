function ReportTable({ data, loading }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse rounded border border-gray-200 bg-white text-sm">
        <thead>
          <tr className="bg-gray-100 text-left text-gray-600">
            <th className="px-4 py-2 font-medium">Date</th>
            <th className="px-4 py-2 font-medium">Investment</th>
            <th className="px-4 py-2 font-medium">Market Value</th>
            <th className="px-4 py-2 font-medium">NAV</th>
            <th className="px-4 py-2 font-medium">Gain/Loss</th>
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
                Loading…
              </td>
            </tr>
          ) : sorted.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-4 text-center text-gray-400">
                No entries in this date range.
              </td>
            </tr>
          ) : (
            sorted.map((entry, i) => {
              const gainLoss =
                i > 0
                  ? Number(entry.market_value) - Number(sorted[i - 1].market_value)
                  : null
              return (
                <tr key={entry.id} className="border-t border-gray-200">
                  <td className="px-4 py-2 text-gray-800">{entry.date}</td>
                  <td className="px-4 py-2 text-gray-800">{Number(entry.investment).toFixed(0)}</td>
                  <td className="px-4 py-2 text-gray-800">{Number(entry.market_value).toFixed(0)}</td>
                  <td className="px-4 py-2 text-gray-800">{Number(entry.nav).toFixed(2)}</td>
                  <td className="px-4 py-2 text-gray-800">
                    {gainLoss === null ? '—' : gainLoss.toFixed(0)}
                  </td>
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
