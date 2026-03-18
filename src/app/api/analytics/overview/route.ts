import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const from = searchParams.get('from')
  const to = searchParams.get('to')

  let query = supabase
    .from('sales_records')
    .select('total_price_inc_gst, total_price_ex_gst, total_quantity, invoice_no, company, item_ordered')
    .eq('user_id', user.id)

  if (from) query = query.gte('order_date', from)
  if (to) query = query.lte('order_date', to)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const records = data ?? []
  const totalRevenue = records.reduce((sum, r) => sum + parseFloat(String(r.total_price_inc_gst ?? 0)), 0)
  const totalRevenueExGst = records.reduce((sum, r) => sum + parseFloat(String(r.total_price_ex_gst ?? 0)), 0)
  const totalUnits = records.reduce((sum, r) => sum + parseFloat(String(r.total_quantity ?? 0)), 0)
  const uniqueInvoices = new Set(records.map(r => r.invoice_no)).size
  const uniqueCustomers = new Set(records.map(r => r.company).filter(Boolean)).size
  const uniqueProducts = new Set(records.map(r => r.item_ordered)).size
  const avgOrderValue = uniqueInvoices > 0 ? totalRevenue / uniqueInvoices : 0

  return NextResponse.json({
    totalRevenue,
    totalRevenueExGst,
    totalUnits,
    uniqueInvoices,
    uniqueCustomers,
    uniqueProducts,
    avgOrderValue,
    totalRecords: records.length,
  })
}
