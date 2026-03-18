import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import DateRangePicker from '@/components/layout/DateRangePicker'
import HorizontalBarChart from '@/components/charts/HorizontalBarChart'
import { format } from 'date-fns'

async function getTopCustomers(userId: string, from?: string, to?: string) {
  const { createClient: createSC } = await import('@/lib/supabase/server')
  const supabase = await createSC()

  let query = supabase
    .from('sales_records')
    .select('company, total_price_inc_gst, total_quantity, invoice_no, order_date')
    .eq('user_id', userId)
    .not('company', 'is', null)

  if (from) query = query.gte('order_date', from)
  if (to) query = query.lte('order_date', to)

  const { data } = await query

  const custMap = new Map<string, {
    company: string
    total_revenue: number
    total_units: number
    invoices: Set<string>
    last_order: string
  }>()

  for (const r of data ?? []) {
    if (!r.company) continue
    if (!custMap.has(r.company)) {
      custMap.set(r.company, { company: r.company, total_revenue: 0, total_units: 0, invoices: new Set(), last_order: r.order_date ?? '' })
    }
    const c = custMap.get(r.company)!
    c.total_revenue += parseFloat(String(r.total_price_inc_gst ?? 0))
    c.total_units += parseFloat(String(r.total_quantity ?? 0))
    c.invoices.add(r.invoice_no)
    if (r.order_date && r.order_date > c.last_order) c.last_order = r.order_date
  }

  return [...custMap.values()]
    .map(c => ({ ...c, invoice_count: c.invoices.size }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const customers = await getTopCustomers(user.id, params.from, params.to)

  const chartData = customers.slice(0, 15).map(c => ({ label: c.company, value: c.total_revenue }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Top Customers</h1>
        <p className="text-gray-500 mt-1">Your best customers by total revenue</p>
      </div>

      <Suspense>
        <DateRangePicker />
      </Suspense>

      {customers.length === 0 ? (
        <p className="text-center text-gray-400 py-16">No data for selected period</p>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Revenue by Customer</CardTitle>
              <CardDescription>Top 15 customers (inc GST)</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={chartData} valuePrefix="$" color="#7c3aed" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Customers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-gray-500">
                      <th className="pb-2 font-medium">#</th>
                      <th className="pb-2 font-medium">Company</th>
                      <th className="pb-2 font-medium text-right">Revenue (inc GST)</th>
                      <th className="pb-2 font-medium text-right">Invoices</th>
                      <th className="pb-2 font-medium text-right">Last Order</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((c, i) => (
                      <tr key={c.company} className="border-b last:border-0 hover:bg-gray-50">
                        <td className="py-2 text-gray-400">{i + 1}</td>
                        <td className="py-2 text-gray-800">{c.company}</td>
                        <td className="py-2 text-right font-medium">
                          ${c.total_revenue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 text-right text-gray-600">{c.invoice_count}</td>
                        <td className="py-2 text-right text-gray-500">
                          {c.last_order ? format(new Date(c.last_order), 'dd MMM yyyy') : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
