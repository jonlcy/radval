'use client'

import { useState } from 'react'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import { format, parseISO } from 'date-fns'

type DataPoint = {
  month: string
  revenue: number
  units: number
  invoices: number
}

const fmt = (n: number) =>
  `$${n.toLocaleString('en-AU', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`

export default function SalesOverTimeChart({ data }: { data: DataPoint[] }) {
  const [metric, setMetric] = useState<'revenue' | 'units'>('revenue')
  const [chartType, setChartType] = useState<'bar' | 'line'>('bar')

  const formatted = data.map(d => ({
    ...d,
    label: format(parseISO(d.month), 'MMM yy'),
  }))

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          {(['bar', 'line'] as const).map(t => (
            <button
              key={t}
              onClick={() => setChartType(t)}
              className={`text-xs px-3 py-1.5 rounded-full border ${chartType === t ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              {t === 'bar' ? 'Bar' : 'Line'}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {(['revenue', 'units'] as const).map(m => (
            <button
              key={m}
              onClick={() => setMetric(m)}
              className={`text-xs px-3 py-1.5 rounded-full border ${metric === m ? 'bg-gray-900 text-white border-gray-900' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              {m === 'revenue' ? 'Revenue' : 'Units'}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <ComposedChart data={formatted} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="label" tick={{ fontSize: 12 }} />
          <YAxis
            tickFormatter={metric === 'revenue' ? fmt : undefined}
            tick={{ fontSize: 12 }}
            width={metric === 'revenue' ? 80 : 40}
          />
          <Tooltip
            formatter={(value) => [
              metric === 'revenue' ? fmt(Number(value)) : Number(value).toLocaleString(),
              metric === 'revenue' ? 'Revenue (inc GST)' : 'Units',
            ]}
          />
          {chartType === 'bar' ? (
            <Bar dataKey={metric} fill="#1d4ed8" radius={[3, 3, 0, 0]} />
          ) : (
            <Line
              type="monotone"
              dataKey={metric}
              stroke="#1d4ed8"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
