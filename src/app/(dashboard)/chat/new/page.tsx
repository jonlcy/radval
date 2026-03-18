import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import ChatWindow from '@/components/chat/ChatWindow'

export default function NewChatPage() {
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">New Chat</h1>
        <p className="text-gray-500 mt-1">Ask anything about your sales data</p>
      </div>
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 flex flex-col pt-4 overflow-hidden">
          <ChatWindow />
        </CardContent>
      </Card>
    </div>
  )
}
