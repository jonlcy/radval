'use client'

import { FileSpreadsheet, FileText, Database } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'

type DataSource = {
  id: string
  source_type: string
  file_name: string | null
  records_imported: number
  last_synced_at: string | null
  created_at: string
}

const TYPE_CONFIG = {
  csv_upload: { label: 'CSV', icon: FileText, color: 'bg-blue-100 text-blue-800' },
  excel_upload: { label: 'Excel', icon: FileSpreadsheet, color: 'bg-green-100 text-green-800' },
  google_sheets: { label: 'Google Sheets', icon: Database, color: 'bg-yellow-100 text-yellow-800' },
}

export default function DataSourceList({ sources }: { sources: DataSource[] }) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-gray-500 py-4 text-center">
        No data uploaded yet. Upload a file above to get started.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      {sources.map(source => {
        const config = TYPE_CONFIG[source.source_type as keyof typeof TYPE_CONFIG] ?? TYPE_CONFIG.csv_upload
        const Icon = config.icon
        return (
          <div
            key={source.id}
            className="flex items-center justify-between p-3 border rounded-lg bg-white hover:bg-gray-50"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-gray-500" />
              <div>
                <p className="text-sm font-medium text-gray-800">
                  {source.file_name ?? 'Google Sheets Sync'}
                </p>
                <p className="text-xs text-gray-400">
                  Uploaded {format(new Date(source.created_at), 'dd MMM yyyy, h:mm a')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${config.color}`}>
                {config.label}
              </span>
              <Badge variant="secondary">
                {source.records_imported.toLocaleString()} records
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}
