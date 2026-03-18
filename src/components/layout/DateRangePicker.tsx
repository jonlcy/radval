'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { subDays, subMonths, startOfYear, format } from 'date-fns'

const PRESETS = [
  { label: 'Last 30 days', getValue: () => ({ from: format(subDays(new Date(), 30), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Last 90 days', getValue: () => ({ from: format(subDays(new Date(), 90), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'Last 12 months', getValue: () => ({ from: format(subMonths(new Date(), 12), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'This year', getValue: () => ({ from: format(startOfYear(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') }) },
  { label: 'All time', getValue: () => ({ from: '', to: '' }) },
]

export default function DateRangePicker() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const currentFrom = searchParams.get('from') ?? ''
  const currentTo = searchParams.get('to') ?? ''

  const apply = useCallback((from: string, to: string) => {
    const params = new URLSearchParams()
    if (from) params.set('from', from)
    if (to) params.set('to', to)
    router.push(`${pathname}?${params.toString()}`)
  }, [router, pathname])

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {PRESETS.map(preset => {
        const { from, to } = preset.getValue()
        const isActive = from === currentFrom && to === currentTo
        return (
          <button
            key={preset.label}
            onClick={() => apply(from, to)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              isActive
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
            }`}
          >
            {preset.label}
          </button>
        )
      })}

      <span className="text-gray-300 mx-1">|</span>

      <input
        type="date"
        value={currentFrom}
        onChange={e => apply(e.target.value, currentTo)}
        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
        placeholder="From"
      />
      <span className="text-gray-400 text-xs">to</span>
      <input
        type="date"
        value={currentTo}
        onChange={e => apply(currentFrom, e.target.value)}
        className="text-xs border border-gray-300 rounded px-2 py-1 bg-white"
        placeholder="To"
      />
    </div>
  )
}
