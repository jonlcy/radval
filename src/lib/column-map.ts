export const COLUMN_MAP: Record<string, string> = {
  'Order Date': 'order_date',
  'Invoice/Delivery Date': 'invoice_date',
  'Invoice No': 'invoice_no',
  'Invoice No.': 'invoice_no',
  'Company': 'company',
  'Item Ordered': 'item_ordered',
  'Packing Size': 'packing_size',
  'Total Quantity': 'total_quantity',
  'Product Price (w/o GST)': 'product_price_ex_gst',
  'Product Price (w GST)': 'product_price_inc_gst',
  'Total Price (w/o GST)': 'total_price_ex_gst',
  'Total Price (w GST)': 'total_price_inc_gst',
}

export type SalesRecordInsert = {
  order_date: string | null
  invoice_date: string | null
  invoice_no: string
  company: string | null
  item_ordered: string
  packing_size: string | null
  total_quantity: number | null
  product_price_ex_gst: number | null
  product_price_inc_gst: number | null
  total_price_ex_gst: number | null
  total_price_inc_gst: number | null
  raw_row: Record<string, unknown>
}
