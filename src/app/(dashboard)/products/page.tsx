import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import DateRangePicker from '@/components/layout/DateRangePicker'
import HorizontalBarChart from '@/components/charts/HorizontalBarChart'

async function getTopProducts(userId: string, from?: string, to?: string) {
  const { createClient: createSC } = await import('@/lib/supabase/server')
  const supabase = await createSC()

  let query = supabase
    .from('sales_records')
    .select('item_ordered, packing_size, total_quantity, total_price_inc_gst, invoice_no')
    .eq('user_id', userId)

  if (from) query = query.gte('order_date', from)
  if (to) query = query.lte('order_date', to)

  const { data } = await query

  const productMap = new Map<string, { item_ordered: string; total_units: number; total_revenue: number }>()
  for (const r of data ?? []) {
    if (!productMap.has(r.item_ordered)) {
      productMap.set(r.item_ordered, { item_ordered: r.item_ordered, total_units: 0, total_revenue: 0 })
    }
    const p = productMap.get(r.item_ordered)!
    p.total_units += parseFloat(String(r.total_quantity ?? 0))
    p.total_revenue += parseFloat(String(r.total_price_inc_gst ?? 0))
  }

  return [...productMap.values()].sort((a, b) => b.total_revenue - a.total_revenue)
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const products = await getTopProducts(user.id, params.from, params.to)

  const revenueData = products.slice(0, 15).map(p => ({ label: p.item_ordered, value: p.total_revenue }))
  const unitsData = products.slice(0, 15).sort((a, b) => b.total_units - a.total_units).map(p => ({ label: p.item_ordered, value: p.total_units }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Top Products</h1>
        <p className="text-gray-500 mt-1">Best-performing products by revenue and quantity</p>
      </div>

      <Suspense>
        <DateRangePicker />
      </Suspense>

      {products.length === 0 ? (
        <p className="text-center text-gray-400 py-16">No data for selected period</p>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Revenue (inc GST)</CardTitle>
              <CardDescription>Top 15 products</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={revenueData} valuePrefix="$" color="#1d4ed8" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">By Units Sold</CardTitle>
              <CardDescription>Top 15 products</CardDescription>
            </CardHeader>
            <CardContent>
              <HorizontalBarChart data={unitsData} valuePrefix="" valueSuffix=" units" color="#059669" />
            </CardContent>
          </Card>
        </div>
      )}

      {products.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Products</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-gray-500">
                    <th className="pb-2 font-medium">#</th>
                    <th className="pb-2 font-medium">Product</th>
                    <th className="pb-2 font-medium text-right">Revenue (inc GST)</th>
                    <th className="pb-2 font-medium text-right">Units</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => (
                    <tr key={p.item_ordered} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-2 text-gray-400">{i + 1}</td>
                      <td className="py-2 text-gray-800">{p.item_ordered}</td>
                      <td className="py-2 text-right font-medium">
                        ${p.total_revenue.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 text-right text-gray-600">
                        {p.total_units.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
