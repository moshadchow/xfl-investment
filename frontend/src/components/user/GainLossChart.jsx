import {
  LineChart,
  Line,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBDT0 } from '../../utils/format'

function GainLossChart({ data }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const chartData = sorted.map((entry) => ({
    date: entry.date,
    gainLoss:
      entry.investment_amount != null && entry.market_value != null
        ? Number(entry.market_value) - Number(entry.investment_amount)
        : 0,
  }))

  if (chartData.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => formatBDT0(value)} />
        <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 8 }} />
        <Line
          type="monotone"
          dataKey="gainLoss"
          name="Gain/Loss"
          stroke="#8b5cf6"
          strokeWidth={2}
          dot={{ r: 4, fill: '#8b5cf6' }}
          activeDot={{ r: 6 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default GainLossChart
