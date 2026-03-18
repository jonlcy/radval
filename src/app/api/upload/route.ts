import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { createClient } from '@/lib/supabase/server'
import { COLUMN_MAP, type SalesRecordInsert } from '@/lib/column-map'
import { parseDate, parseNumber } from '@/lib/parse-date'

function mapRow(rawRow: Record<string, unknown>): SalesRecordInsert | null {
  const mapped: Record<string, unknown> = {}

  for (const [header, field] of Object.entries(COLUMN_MAP)) {
    if (header in rawRow) {
      mapped[field] = rawRow[header]
    }
  }

  // Require at minimum invoice_no and item_ordered
  const invoiceNo = String(mapped['invoice_no'] ?? '').trim()
  const itemOrdered = String(mapped['item_ordered'] ?? '').trim()
  if (!invoiceNo || !itemOrdered) return null

  return {
    invoice_no: invoiceNo,
    item_ordered: itemOrdered,
    order_date: parseDate(mapped['order_date']),
    invoice_date: parseDate(mapped['invoice_date']),
    company: mapped['company'] ? String(mapped['company']).trim() : null,
    packing_size: mapped['packing_size'] ? String(mapped['packing_size']).trim() : null,
    total_quantity: parseNumber(mapped['total_quantity']),
    product_price_ex_gst: parseNumber(mapped['product_price_ex_gst']),
    product_price_inc_gst: parseNumber(mapped['product_price_inc_gst']),
    total_price_ex_gst: parseNumber(mapped['total_price_ex_gst']),
    total_price_inc_gst: parseNumber(mapped['total_price_inc_gst']),
    raw_row: rawRow,
  }
}

export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const fileName = file.name
  const ext = fileName.split('.').pop()?.toLowerCase()

  let rows: Record<string, unknown>[] = []

  if (ext === 'csv') {
    const text = await file.text()
    const result = Papa.parse<Record<string, unknown>>(text, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    })
    rows = result.data
  } else if (ext === 'xlsx' || ext === 'xls') {
    const buffer = await file.arrayBuffer()
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true })
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { raw: false, dateNF: 'yyyy-mm-dd' })
  } else {
    return NextResponse.json({ error: 'Only CSV and Excel (.xlsx/.xls) files are supported.' }, { status: 400 })
  }

  if (rows.length === 0) {
    return NextResponse.json({ error: 'File is empty or has no readable rows.' }, { status: 400 })
  }

  // Create a data_source record
  const sourceType = ext === 'csv' ? 'csv_upload' : 'excel_upload'
  const { data: source, error: sourceError } = await supabase
    .from('data_sources')
    .insert({ user_id: user.id, source_type: sourceType, file_name: fileName })
    .select('id')
    .single()

  if (sourceError) {
    return NextResponse.json({ error: 'Failed to create data source.' }, { status: 500 })
  }

  // Map and filter rows
  const records: SalesRecordInsert[] = []
  const parseErrors: number[] = []
  rows.forEach((row, i) => {
    const mapped = mapRow(row)
    if (mapped) records.push(mapped)
    else parseErrors.push(i + 2) // +2 for 1-index + header row
  })

  if (records.length === 0) {
    return NextResponse.json({
      error: 'No valid rows found. Check that your file has the correct column headers.',
      parseErrors,
    }, { status: 422 })
  }

  // Batch upsert (500 rows at a time)
  let newCount = 0
  let updatedCount = 0
  const BATCH = 500

  for (let i = 0; i < records.length; i += BATCH) {
    const batch = records.slice(i, i + BATCH).map(r => ({
      ...r,
      user_id: user.id,
      data_source_id: source.id,
    }))

    const { data: upserted, error: upsertError } = await supabase
      .from('sales_records')
      .upsert(batch, { onConflict: 'user_id,invoice_no,item_ordered', ignoreDuplicates: false })
      .select('id, created_at, updated_at')

    if (upsertError) {
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // Count new vs updated by comparing created_at ≈ updated_at (within 1 second)
    upserted?.forEach(r => {
      const diff = Math.abs(new Date(r.updated_at).getTime() - new Date(r.created_at).getTime())
      if (diff < 1000) newCount++
      else updatedCount++
    })
  }

  // Update the data source record count
  await supabase
    .from('data_sources')
    .update({ records_imported: newCount + updatedCount, last_synced_at: new Date().toISOString() })
    .eq('id', source.id)

  return NextResponse.json({
    success: true,
    new_records: newCount,
    updated_records: updatedCount,
    parse_errors: parseErrors.length,
    total_rows: rows.length,
  })
}
