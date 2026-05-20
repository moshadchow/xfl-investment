import {
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

function formatValue(value, name) {
  if (name === 'NAV') return Number(value).toFixed(2)
  return Number(value).toFixed(0)
}

function ReportChart({ data }) {
  if (data.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={340}>
      <ComposedChart data={data} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => formatValue(v, '')} />
        <Tooltip formatter={formatValue} />
        <Legend />
        <Line
          type="monotone"
          dataKey="investment"
          name="Investment"
          stroke="#3b82f6"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="market_value"
          name="Market Value"
          stroke="#22c55e"
          dot={false}
          strokeWidth={2}
        />
        <Line
          type="monotone"
          dataKey="nav"
          name="NAV"
          stroke="#f97316"
          dot={false}
          strokeWidth={2}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}

export default ReportChart
