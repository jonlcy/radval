import { parse, isValid } from 'date-fns'

const DATE_FORMATS = [
  'd/M/yyyy',
  'dd/MM/yyyy',
  'MM/dd/yyyy',
  'yyyy-MM-dd',
  'dd-MM-yyyy',
  'MM-dd-yyyy',
  'd/M/yy',
  'dd/MM/yy',
]

// Excel serial date: days since 1900-01-01 (with leap year bug)
function fromExcelSerial(serial: number): Date {
  const excelEpoch = new Date(1899, 11, 30)
  return new Date(excelEpoch.getTime() + serial * 86400000)
}

export function parseDate(raw: unknown): string | null {
  if (raw === null || raw === undefined || raw === '') return null

  // Excel serial number (e.g. 45370)
  if (typeof raw === 'number') {
    const d = fromExcelSerial(raw)
    if (isValid(d)) return d.toISOString().split('T')[0]
    return null
  }

  if (raw instanceof Date) {
    if (isValid(raw)) return raw.toISOString().split('T')[0]
    return null
  }

  const str = String(raw).trim()
  if (!str) return null

  for (const fmt of DATE_FORMATS) {
    const parsed = parse(str, fmt, new Date())
    if (isValid(parsed)) return parsed.toISOString().split('T')[0]
  }

  // Last resort: native Date parsing
  const fallback = new Date(str)
  if (isValid(fallback)) return fallback.toISOString().split('T')[0]

  return null
}

export function parseNumber(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === '') return null
  const n = typeof raw === 'number' ? raw : parseFloat(String(raw).replace(/[,$]/g, ''))
  return isNaN(n) ? null : n
}
