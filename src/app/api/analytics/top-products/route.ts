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

  // Query sales_records directly to support date filtering
  let query = supabase
    .from('sales_records')
    .select('item_ordered, packing_size, total_quantity, total_price_inc_gst, invoice_no')
    .eq('user_id', user.id)

  if (from) query = query.gte('order_date', from)
  if (to) query = query.lte('order_date', to)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Aggregate by product
  const productMap = new Map<string, {
    item_ordered: string
    packing_size: string | null
    total_units: number
    total_revenue: number
    invoice_count: Set<string>
  }>()

  for (const r of data ?? []) {
    const key = `${r.item_ordered}::${r.packing_size ?? ''}`
    if (!productMap.has(key)) {
      productMap.set(key, {
        item_ordered: r.item_ordered,
        packing_size: r.packing_size,
        total_units: 0,
        total_revenue: 0,
        invoice_count: new Set(),
      })
    }
    const p = productMap.get(key)!
    p.total_units += parseFloat(String(r.total_quantity ?? 0))
    p.total_revenue += parseFloat(String(r.total_price_inc_gst ?? 0))
    p.invoice_count.add(r.invoice_no)
  }

  const products = Array.from(productMap.values())
    .map(p => ({
      item_ordered: p.item_ordered,
      packing_size: p.packing_size,
      total_units: p.total_units,
      total_revenue: p.total_revenue,
      times_ordered: p.invoice_count.size,
    }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, limit)

  return NextResponse.json(products)
}
