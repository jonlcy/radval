'use client'

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts'

type DataPoint = {
  label: string
  value: number
}

type HorizontalBarChartProps = {
  data: DataPoint[]
  valuePrefix?: string
  valueSuffix?: string
  color?: string
}

const CustomYAxisTick = ({ x, y, payload }: { x: number; y: number; payload: { value: string } }) => (
  <g transform={`translate(${x},${y})`}>
    <text x={0} y={0} dy={4} textAnchor="end" fill="#6b7280" fontSize={12}>
      {payload.value.length > 22 ? payload.value.slice(0, 22) + '…' : payload.value}
    </text>
  </g>
)

export default function HorizontalBarChart({
  data,
  valuePrefix = '$',
  valueSuffix = '',
  color = '#1d4ed8',
}: HorizontalBarChartProps) {
  const fmt = (n: number) =>
    `${valuePrefix}${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}${valueSuffix}`

  return (
    <ResponsiveContainer width="100%" height={Math.max(300, data.length * 44)}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 5, right: 80, left: 170, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
        <XAxis
          type="number"
          tickFormatter={fmt}
          tick={{ fontSize: 11 }}
        />
        <YAxis
          type="category"
          dataKey="label"
          tick={<CustomYAxisTick x={0} y={0} payload={{ value: '' }} />}
          width={160}
        />
        <Tooltip formatter={(value) => [fmt(Number(value))]} />
        <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} label={{ position: 'right', formatter: (n: unknown) => fmt(Number(n)), fontSize: 11, fill: '#374151' }} />
      </BarChart>
    </ResponsiveContainer>
  )
}
