import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import DateRangePicker from '@/components/layout/DateRangePicker'
import SalesOverTimeChart from '@/components/charts/SalesOverTimeChart'

async function getSalesData(userId: string, from?: string, to?: string) {
  const { createClient: createSC } = await import('@/lib/supabase/server')
  const supabase = await createSC()

  let query = supabase
    .from('monthly_revenue')
    .select('*')
    .eq('user_id', userId)
    .order('month', { ascending: true })

  if (from) query = query.gte('month', from)
  if (to) query = query.lte('month', to)

  const { data } = await query
  return (data ?? []).map(row => ({
    month: row.month,
    revenue: parseFloat(String(row.revenue_inc_gst ?? 0)),
    revenueExGst: parseFloat(String(row.revenue_ex_gst ?? 0)),
    units: parseFloat(String(row.total_units ?? 0)),
    invoices: parseInt(String(row.invoice_count ?? 0)),
  }))
}

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const salesData = await getSalesData(user.id, params.from, params.to)

  const totalRevenue = salesData.reduce((s, d) => s + d.revenue, 0)
  const totalUnits = salesData.reduce((s, d) => s + d.units, 0)
  const fmt = (n: number) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales Over Time</h1>
        <p className="text-gray-500 mt-1">Monthly revenue and unit trends</p>
      </div>

      <Suspense>
        <DateRangePicker />
      </Suspense>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Revenue</p>
            <p className="text-xl font-bold mt-1">{fmt(totalRevenue)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Total Units</p>
            <p className="text-xl font-bold mt-1">{totalUnits.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Months of Data</p>
            <p className="text-xl font-bold mt-1">{salesData.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide font-medium">Avg Monthly Revenue</p>
            <p className="text-xl font-bold mt-1">{salesData.length > 0 ? fmt(totalRevenue / salesData.length) : '$0'}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Monthly Performance</CardTitle>
          <CardDescription>Toggle between bar and line charts, and switch between revenue and units</CardDescription>
        </CardHeader>
        <CardContent>
          {salesData.length === 0 ? (
            <p className="text-center text-gray-400 py-16">No data for selected period</p>
          ) : (
            <SalesOverTimeChart data={salesData} />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
