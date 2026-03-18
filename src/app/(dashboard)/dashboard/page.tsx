import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import KPICard from '@/components/charts/KPICard'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { ArrowRight } from 'lucide-react'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams
  const { from, to } = params

  let overview = null
  let topProducts: Array<{ item_ordered: string; packing_size: string | null; total_revenue: number; total_units: number }> = []
  let topCustomers: Array<{ company: string; total_revenue: number; invoice_count: number }> = []

  const { data: salesData } = await supabase
    .from('sales_records')
    .select('total_price_inc_gst, total_price_ex_gst, total_quantity, invoice_no, company, item_ordered')
    .eq('user_id', user.id)
    .gte('order_date', from ?? '1900-01-01')
    .lte('order_date', to ?? '2100-12-31')

  if (salesData && salesData.length > 0) {
    const totalRevenue = salesData.reduce((s, r) => s + parseFloat(String(r.total_price_inc_gst ?? 0)), 0)
    const totalRevenueExGst = salesData.reduce((s, r) => s + parseFloat(String(r.total_price_ex_gst ?? 0)), 0)
    const totalUnits = salesData.reduce((s, r) => s + parseFloat(String(r.total_quantity ?? 0)), 0)
    const uniqueInvoices = new Set(salesData.map(r => r.invoice_no)).size
    const uniqueCustomers = new Set(salesData.map(r => r.company).filter(Boolean)).size
    const uniqueProducts = new Set(salesData.map(r => r.item_ordered)).size
    overview = {
      totalRevenue,
      totalRevenueExGst,
      totalUnits,
      uniqueInvoices,
      uniqueCustomers,
      uniqueProducts,
      avgOrderValue: uniqueInvoices > 0 ? totalRevenue / uniqueInvoices : 0,
    }

    // Top products
    const productMap = new Map<string, { item_ordered: string; packing_size: string | null; total_revenue: number; total_units: number }>()
    for (const r of salesData) {
      const key = r.item_ordered
      if (!productMap.has(key)) productMap.set(key, { item_ordered: r.item_ordered, packing_size: null, total_revenue: 0, total_units: 0 })
      const p = productMap.get(key)!
      p.total_revenue += parseFloat(String(r.total_price_inc_gst ?? 0))
      p.total_units += parseFloat(String(r.total_quantity ?? 0))
    }
    topProducts = [...productMap.values()].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 5)

    // Top customers
    const custMap = new Map<string, { company: string; total_revenue: number; invoice_count: Set<string> }>()
    for (const r of salesData) {
      if (!r.company) continue
      if (!custMap.has(r.company)) custMap.set(r.company, { company: r.company, total_revenue: 0, invoice_count: new Set() })
      const c = custMap.get(r.company)!
      c.total_revenue += parseFloat(String(r.total_price_inc_gst ?? 0))
      c.invoice_count.add(r.invoice_no)
    }
    topCustomers = [...custMap.values()]
      .map(c => ({ company: c.company, total_revenue: c.total_revenue, invoice_count: c.invoice_count.size }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, 5)
  }

  const fmt = (n: number) => `$${n.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const hasData = overview !== null

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">Overview of your sales performance</p>
        </div>
        {overview === null && (
          <Link href="/data" className="text-sm text-blue-600 hover:underline flex items-center gap-1">
            Upload data to get started <ArrowRight className="h-3 w-3" />
          </Link>
        )}
      </div>

      {overview === null ? (
        <div className="text-center py-20 text-gray-400">
          <p className="text-lg font-medium">No data yet</p>
          <p className="text-sm mt-1">Upload your first sales file to see your dashboard</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <KPICard title="Total Revenue (inc GST)" value={fmt(overview.totalRevenue)} subtitle={`${fmt(overview.totalRevenueExGst)} ex GST`} />
            <KPICard title="Total Invoices" value={overview.uniqueInvoices.toLocaleString()} subtitle="unique orders" />
            <KPICard title="Units Sold" value={overview.totalUnits.toLocaleString(undefined, { maximumFractionDigits: 0 })} />
            <KPICard title="Avg Order Value" value={fmt(overview.avgOrderValue)} subtitle="per invoice" />
            <KPICard title="Customers" value={overview.uniqueCustomers.toLocaleString()} />
            <KPICard title="Products" value={overview.uniqueProducts.toLocaleString()} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Top Products</CardTitle>
                  <Link href="/products" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <CardDescription>By revenue (inc GST)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topProducts.map((p, i) => (
                    <div key={p.item_ordered} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                        <span className="text-gray-700 truncate max-w-[200px]">{p.item_ordered}</span>
                      </div>
                      <span className="font-medium text-gray-900 shrink-0">{fmt(p.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Top Customers</CardTitle>
                  <Link href="/customers" className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                    View all <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
                <CardDescription>By revenue (inc GST)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topCustomers.map((c, i) => (
                    <div key={c.company} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-4">{i + 1}.</span>
                        <span className="text-gray-700 truncate max-w-[200px]">{c.company}</span>
                      </div>
                      <span className="font-medium text-gray-900 shrink-0">{fmt(c.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
