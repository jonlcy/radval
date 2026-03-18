import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function buildSystemPrompt(userId: string): Promise<string> {
  const { createClient: createSC } = await import('@/lib/supabase/server')
  const supabase = await createSC()

  // Run all queries in parallel
  const [salesRes, monthlyRes] = await Promise.all([
    supabase
      .from('sales_records')
      .select('total_price_inc_gst, total_price_ex_gst, total_quantity, invoice_no, company, item_ordered, order_date')
      .eq('user_id', userId),
    supabase
      .from('monthly_revenue')
      .select('*')
      .eq('user_id', userId)
      .order('month', { ascending: true }),
  ])

  const records = salesRes.data ?? []
  const monthly = monthlyRes.data ?? []

  if (records.length === 0) {
    return `You are a sales analyst AI assistant. The user has not uploaded any sales data yet. Politely inform them to upload data first via the "Upload Data" section.`
  }

  // Overview stats
  const totalRevenue = records.reduce((s, r) => s + parseFloat(String(r.total_price_inc_gst ?? 0)), 0)
  const totalRevenueExGst = records.reduce((s, r) => s + parseFloat(String(r.total_price_ex_gst ?? 0)), 0)
  const totalUnits = records.reduce((s, r) => s + parseFloat(String(r.total_quantity ?? 0)), 0)
  const uniqueInvoices = new Set(records.map(r => r.invoice_no)).size
  const uniqueCustomers = new Set(records.map(r => r.company).filter(Boolean)).size
  const uniqueProducts = new Set(records.map(r => r.item_ordered)).size
  const avgOrderValue = uniqueInvoices > 0 ? totalRevenue / uniqueInvoices : 0

  // Top 10 products
  const productMap = new Map<string, { total_revenue: number; total_units: number }>()
  for (const r of records) {
    if (!productMap.has(r.item_ordered)) productMap.set(r.item_ordered, { total_revenue: 0, total_units: 0 })
    const p = productMap.get(r.item_ordered)!
    p.total_revenue += parseFloat(String(r.total_price_inc_gst ?? 0))
    p.total_units += parseFloat(String(r.total_quantity ?? 0))
  }
  const topProducts = [...productMap.entries()]
    .map(([item, v]) => ({ item, ...v }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10)

  // Top 10 customers
  const custMap = new Map<string, { total_revenue: number; invoices: Set<string>; last_order: string }>()
  for (const r of records) {
    if (!r.company) continue
    if (!custMap.has(r.company)) custMap.set(r.company, { total_revenue: 0, invoices: new Set(), last_order: r.order_date ?? '' })
    const c = custMap.get(r.company)!
    c.total_revenue += parseFloat(String(r.total_price_inc_gst ?? 0))
    c.invoices.add(r.invoice_no)
    if (r.order_date && r.order_date > c.last_order) c.last_order = r.order_date
  }
  const topCustomers = [...custMap.entries()]
    .map(([company, v]) => ({ company, total_revenue: v.total_revenue, invoice_count: v.invoices.size, last_order: v.last_order }))
    .sort((a, b) => b.total_revenue - a.total_revenue)
    .slice(0, 10)

  // Monthly data (last 24 months)
  const recentMonthly = monthly.slice(-24)

  // Month-over-month trend (last 3 months)
  const lastThree = recentMonthly.slice(-3)
  const trendLines = lastThree.map((m, i) => {
    const prev = lastThree[i - 1]
    const rev = parseFloat(String(m.revenue_inc_gst ?? 0))
    const prevRev = prev ? parseFloat(String(prev.revenue_inc_gst ?? 0)) : null
    const changePct = prevRev && prevRev > 0 ? ((rev - prevRev) / prevRev) * 100 : null
    return `- ${m.month}: $${rev.toFixed(2)}${changePct !== null ? ` (${changePct > 0 ? '+' : ''}${changePct.toFixed(1)}% vs prior month)` : ''}`
  }).join('\n')

  const fmt = (n: number) => `$${n.toFixed(2)}`

  return `You are a sales analyst AI assistant for this business. You have access to their complete sales data summary below. Answer questions accurately and helpfully. When asked to forecast, use trend data to estimate. When asked for reports, use clear markdown formatting.

## Sales Data Summary

**Overall Performance (All Time)**
- Total Revenue (inc GST): ${fmt(totalRevenue)}
- Total Revenue (ex GST): ${fmt(totalRevenueExGst)}
- Total Invoices: ${uniqueInvoices}
- Total Units Sold: ${totalUnits.toFixed(0)}
- Unique Customers: ${uniqueCustomers}
- Unique Products: ${uniqueProducts}
- Average Order Value: ${fmt(avgOrderValue)}
- Total Line Items: ${records.length}

**Monthly Revenue (Last 24 Months)**
${recentMonthly.map(m => `- ${m.month}: ${fmt(parseFloat(String(m.revenue_inc_gst ?? 0)))} (${m.invoice_count} invoices, ${parseFloat(String(m.total_units ?? 0)).toFixed(0)} units)`).join('\n')}

**Recent Trend (Last 3 Months)**
${trendLines}

**Top 10 Products by Revenue**
${topProducts.map((p, i) => `${i + 1}. ${p.item}: ${fmt(p.total_revenue)} revenue, ${p.total_units.toFixed(0)} units`).join('\n')}

**Top 10 Customers by Revenue**
${topCustomers.map((c, i) => `${i + 1}. ${c.company}: ${fmt(c.total_revenue)}, ${c.invoice_count} invoices, last order ${c.last_order || 'unknown'}`).join('\n')}

Answer in plain English. Format currency as $X,XXX.XX. Use markdown for structured reports. When forecasting, be clear that it's an estimate based on recent trends.`
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { messages, conversationId } = await request.json() as {
    messages: Array<{ role: 'user' | 'assistant'; content: string }>
    conversationId: string | null
  }

  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: 'No messages provided' }, { status: 400 })
  }

  const systemPrompt = await buildSystemPrompt(user.id)

  // Limit to last 20 messages to stay within token limits
  const history = messages.slice(-20)

  // Create or use existing conversation
  let convId = conversationId
  if (!convId) {
    const title = messages[0]?.content?.slice(0, 60) ?? 'New conversation'
    const { data: conv } = await supabase
      .from('chat_conversations')
      .insert({ user_id: user.id, title })
      .select('id')
      .single()
    convId = conv?.id ?? null
  }

  // Save the user's last message
  const lastUserMessage = messages[messages.length - 1]
  if (lastUserMessage?.role === 'user' && convId) {
    await supabase.from('chat_messages').insert({
      conversation_id: convId,
      user_id: user.id,
      role: 'user',
      content: lastUserMessage.content,
    })
  }

  // Stream from Claude
  const stream = anthropic.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: systemPrompt,
    messages: history,
  })

  // Collect full response to save to DB
  let fullContent = ''

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
            const text = chunk.delta.text
            fullContent += text
            controller.enqueue(new TextEncoder().encode(text))
          }
        }

        // Save assistant response to DB
        if (convId && fullContent) {
          await supabase.from('chat_messages').insert({
            conversation_id: convId,
            user_id: user.id,
            role: 'assistant',
            content: fullContent,
          })
          // Update conversation updated_at
          await supabase.from('chat_conversations')
            .update({ updated_at: new Date().toISOString() })
            .eq('id', convId)
        }

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Conversation-Id': convId ?? '',
    },
  })
}
