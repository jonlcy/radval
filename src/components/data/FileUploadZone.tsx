'use client'

import { useState, useCallback } from 'react'
import { Upload, CheckCircle, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type UploadResult = {
  new_records: number
  updated_records: number
  parse_errors: number
  total_rows: number
}

export default function FileUploadZone({ onSuccess }: { onSuccess?: () => void }) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<UploadResult | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) setSelectedFile(file)
  }, [])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Upload failed')
      } else {
        setResult(data)
        setSelectedFile(null)
        onSuccess?.()
        toast.success('Upload complete')
      }
    } catch {
      toast.error('Network error. Please try again.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          'border-2 border-dashed rounded-xl p-10 text-center transition-colors',
          dragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-white'
        )}
      >
        <Upload className="mx-auto h-10 w-10 text-gray-400 mb-3" />
        <p className="text-sm font-medium text-gray-700">
          Drag & drop your CSV or Excel file here
        </p>
        <p className="text-xs text-gray-500 mt-1">or</p>
        <label className="mt-3 inline-block">
          <span className="cursor-pointer text-sm text-blue-600 hover:underline font-medium">
            Browse files
          </span>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={handleFileChange}
          />
        </label>
        <p className="text-xs text-gray-400 mt-2">Supports .csv, .xlsx, .xls</p>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between bg-gray-50 border rounded-lg px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-gray-700">
            <FileText className="h-4 w-4 text-gray-500" />
            <span className="font-medium">{selectedFile.name}</span>
            <span className="text-gray-400">({(selectedFile.size / 1024).toFixed(0)} KB)</span>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelectedFile(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? 'Uploading…' : 'Upload'}
            </Button>
          </div>
        </div>
      )}

      {result && (
        <div className="rounded-lg border bg-green-50 border-green-200 px-4 py-3 space-y-1">
          <div className="flex items-center gap-2 text-green-800 font-medium text-sm">
            <CheckCircle className="h-4 w-4" />
            Upload complete
          </div>
          <div className="text-sm text-green-700 space-y-0.5 pl-6">
            <p>New records added: <strong>{result.new_records}</strong></p>
            <p>Existing records updated: <strong>{result.updated_records}</strong></p>
            {result.parse_errors > 0 && (
              <div className="flex items-center gap-1 text-amber-700 mt-1">
                <AlertCircle className="h-3.5 w-3.5" />
                <span>{result.parse_errors} rows could not be parsed (missing Invoice No or Item Ordered)</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
