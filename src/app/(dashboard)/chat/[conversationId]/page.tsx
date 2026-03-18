import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import ChatWindow from '@/components/chat/ChatWindow'

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { conversationId } = await params

  const { data: conversation } = await supabase
    .from('chat_conversations')
    .select('*')
    .eq('id', conversationId)
    .eq('user_id', user.id)
    .single()

  if (!conversation) notFound()

  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-lg font-semibold text-gray-900 truncate">
          {conversation.title ?? 'Conversation'}
        </h1>
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col pt-4 overflow-hidden">
          <ChatWindow
            initialMessages={(messages ?? []) as Array<{ role: 'user' | 'assistant'; content: string }>}
            conversationId={conversationId}
          />
        </CardContent>
      </Card>
    </div>
  )
}
