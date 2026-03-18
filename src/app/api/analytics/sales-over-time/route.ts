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
    .from('monthly_revenue')
    .select('*')
    .eq('user_id', user.id)
    .order('month', { ascending: true })

  if (from) query = query.gte('month', from)
  if (to) query = query.lte('month', to)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const formatted = (data ?? []).map(row => ({
    month: row.month,
    revenue: parseFloat(String(row.revenue_inc_gst ?? 0)),
    revenueExGst: parseFloat(String(row.revenue_ex_gst ?? 0)),
    units: parseFloat(String(row.total_units ?? 0)),
    invoices: parseInt(String(row.invoice_count ?? 0)),
  }))

  return NextResponse.json(formatted)
}
