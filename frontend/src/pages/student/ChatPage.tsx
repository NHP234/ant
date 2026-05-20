import { Bot, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState } from 'react'

export default function ChatPage() {
  const [input, setInput] = useState('')

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Trợ lý AI</h2>
        <p className="text-muted-foreground">Hỏi về sách trong thư viện bằng ngôn ngữ tự nhiên</p>
      </div>

      <Card className="min-h-[400px] flex flex-col">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Bot className="h-5 w-5" />
            Trợ lý thư viện
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col items-center justify-center text-center text-muted-foreground space-y-4">
          <Bot className="h-16 w-16 opacity-20" />
          <div>
            <p className="font-medium text-foreground">Tính năng đang phát triển</p>
            <p className="text-sm mt-1">Trợ lý AI sẽ sẵn sàng trong giai đoạn tiếp theo của dự án.</p>
          </div>
        </CardContent>
      </Card>

      <form
        className="flex gap-2"
        onSubmit={(e) => { e.preventDefault(); setInput('') }}
      >
        <Input
          placeholder="Nhập câu hỏi về sách..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled
        />
        <Button type="submit" disabled>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
