import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { MessageSquare, Plus } from 'lucide-react'
import { format } from 'date-fns'

export default async function ChatListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: conversations } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">AI Chat</h1>
          <p className="text-gray-500 mt-1">Ask questions about your sales data in plain English</p>
        </div>
        <Link
          href="/chat/new"
          className="flex items-center gap-2 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
        >
          <Plus className="h-4 w-4" />
          New Chat
        </Link>
      </div>

      {!conversations || conversations.length === 0 ? (
        <div className="text-center py-16">
          <MessageSquare className="h-12 w-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No conversations yet</p>
          <p className="text-sm text-gray-400 mt-1">Start a new chat to analyse your sales data</p>
          <Link
            href="/chat/new"
            className="inline-flex items-center gap-2 mt-4 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            Start your first chat
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {conversations.map(conv => (
            <Link key={conv.id} href={`/chat/${conv.id}`}>
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardHeader className="py-3 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-gray-800 truncate">
                      {conv.title ?? 'Untitled conversation'}
                    </CardTitle>
                    <span className="text-xs text-gray-400 shrink-0 ml-4">
                      {format(new Date(conv.updated_at), 'dd MMM yyyy')}
                    </span>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
