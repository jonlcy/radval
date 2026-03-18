import { createClient } from '@/lib/supabase/server'
import FileUploadZone from '@/components/data/FileUploadZone'
import DataSourceList from '@/components/data/DataSourceList'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default async function DataPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: sources } = await supabase
    .from('data_sources')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const { count } = await supabase
    .from('sales_records')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', user!.id)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload Data</h1>
        <p className="text-gray-500 mt-1">
          Import your sales data from CSV or Excel exports. Already-uploaded records will be updated, not duplicated.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Records</CardDescription>
            <CardTitle className="text-3xl">{count?.toLocaleString() ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Data Sources</CardDescription>
            <CardTitle className="text-3xl">{sources?.length ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upload New File</CardTitle>
          <CardDescription>
            Export your Google Sheet as CSV (File → Download → CSV) and upload it here.
            You can safely re-upload the same file — duplicates are handled automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FileUploadZone />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Upload History</CardTitle>
          <CardDescription>All files and data sources you have imported</CardDescription>
        </CardHeader>
        <CardContent>
          <DataSourceList sources={sources ?? []} />
        </CardContent>
      </Card>
    </div>
  )
}
