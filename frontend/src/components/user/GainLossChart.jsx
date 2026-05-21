import {
  BarChart,
  Bar,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatBDT0 } from '../../utils/format'

function GainLossChart({ data }) {
  const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date))
  const chartData = sorted.map((entry, i) => ({
    date: entry.date,
    gainLoss:
      i > 0
        ? Number(entry.market_value) - Number(sorted[i - 1].market_value)
        : 0,
  }))

  if (chartData.length === 0) return null

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} />
        <Tooltip formatter={(value) => formatBDT0(value)} />
        <Bar
          dataKey="gainLoss"
          name="Gain/Loss"
          fill="#8b5cf6"
          radius={[4, 4, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export default GainLossChart
