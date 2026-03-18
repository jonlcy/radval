import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const limit = parseInt(searchParams.get('limit') ?? '10')

  let query = supabase
    .from('sales_records')
    .select('company, total_price_inc_gst, total_quantity, invoice_no, order_date')
    .eq('user_id', user.id)
    .not('company', 'is', null)

  if (from) query = query.gte('order_date', from)
  if (to) query = query.lte('order_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by company
  const customerMap = new Map<string, {
    company: string
    total_revenue: number
    total_units: number
    invoices: Set<string>
    last_order_date: string
  }>()

  for (const r of data ?? []) {
    const company = r.company!
    if (!customerMap.has(company)) {
      customerMap.set(company, {
        company,
        total_revenue: 0,
        total_units: 0,
        invoices: new Set(),
        last_order_date: r.order_date ?? '',
      })
    }
    const c = customerMap.get(company)!
    c.total_revenue += parseFloat(String(r.total_price_inc_gst ?? 0))
    c.total_units += parseFloat(String(r.total_quantity ?? 0))
    c.invoices.add(r.invoice_no)
    if (r.order_date && r.order_date > c.last_order_date) c.last_order_date = r.order_date
  }

  const customers = Array.from(customerMap.values())
    .map(c => ({
      company: c.company,
      total_revenue: c.total_revenue,
      total_units: c.total_units,
      invoice_count: c.invoices.size,
      last_order_date: c.last_order_date,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit)

  return NextResponse.json(customers)
}
