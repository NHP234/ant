import { Bot, Send, User, BookOpen, Loader2, HelpCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatApi } from '@/api/chat'
import type { SourceBook } from '@/api/chat'
import PageHeader from '@/components/shared/PageHeader'

interface Message {
  sender: 'user' | 'bot'
  text: string
  sourceBooks?: SourceBook[]
  intent?: string
  confidence?: number
}

const QUICK_PROMPTS = [
  { text: "Gợi ý sách học Java", category: "search" },
  { text: "Sách tôi đặt mượn đã có chưa?", category: "hold" },
  { text: "Quy định mượn trả", category: "general" }
]

function TypingIndicator() {
  return (
    <div className="flex gap-3 max-w-[80%] animate-in fade-in slide-in-from-bottom-2">
      <div className="h-8 w-8 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0">
        <Bot className="h-4 w-4" />
      </div>
      <div className="bg-muted/70 border border-border/50 rounded-2xl rounded-tl-none px-4 py-3 shadow-sm flex items-center gap-1.5 h-10">
        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
    </div>
  )
}

export default function ChatPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Xin chào! Tôi là trợ lý thư viện Awaken Ant.\n\nTôi có thể hỗ trợ bạn:\n- Tìm kiếm sách theo chủ đề hoặc tác giả\n- Kiểm tra hạn trả sách đang mượn\n- Tra cứu tình trạng đặt mượn\n\nBạn cần tôi hỗ trợ gì?',
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    const userMessage: Message = { sender: 'user', text: textToSend }
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    const chatHistory = messages.map(msg => 
      msg.sender === 'user' ? `User: ${msg.text}` : `Bot: ${msg.text}`
    )

    try {
      const response = await chatApi.sendMessage({
        question: textToSend,
        chatHistory: chatHistory
      })

      const data = response.data.data
      const botMessage: Message = {
        sender: 'bot',
        text: data.answer,
        sourceBooks: data.sourceBooks,
        intent: data.intent,
        confidence: data.confidence
      }
      setMessages(prev => [...prev, botMessage])
    } catch {
      setMessages(prev => [...prev, {
        sender: 'bot',
        text: 'Rất tiếc, tôi không thể kết nối tới dịch vụ lúc này. Vui lòng thử lại sau.'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const renderMessageText = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      let lastIndex = 0;
      let match;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      
      while ((match = boldRegex.exec(paragraph)) !== null) {
        if (match.index > lastIndex) {
          parts.push(paragraph.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < paragraph.length) {
        parts.push(paragraph.substring(lastIndex));
      }

      return (
        <p key={index} className={paragraph.trim() === '' ? 'h-2' : 'min-h-[1rem]'}>
          {parts.length > 0 ? parts : paragraph}
        </p>
      )
    })
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] space-y-4 pt-2">
      <PageHeader
        title="Trợ lý thư viện"
        description="Hỗ trợ tìm kiếm sách và giải đáp thắc mắc"
      />

      <Card className="flex-1 flex flex-col overflow-hidden border-border/40 shadow-lg bg-card/60 backdrop-blur-xl rounded-2xl">
        <CardContent className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 min-h-0 scrollbar-thin scrollbar-thumb-muted">
          {messages.map((msg, idx) => (
            <div key={idx} className={`flex gap-3 max-w-[90%] md:max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''} animate-in fade-in slide-in-from-bottom-2`}>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted border border-border text-muted-foreground'
              }`}>
                {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              <div className="space-y-3">
                <div className={`p-4 rounded-2xl shadow-sm text-[15px] leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted/70 text-foreground border border-border/50 rounded-tl-none'
                }`}>
                  <div className="space-y-1">
                    {renderMessageText(msg.text)}
                  </div>
                </div>

                {msg.sourceBooks && msg.sourceBooks.length > 0 && (
                  <div className="pl-1 pt-2 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen className="h-3.5 w-3.5" />
                      Sách liên quan
                    </p>
                    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory hide-scrollbar">
                      {msg.sourceBooks.map((book) => (
                        <div
                          key={book.bookId}
                          onClick={() => navigate(`/books/${book.bookId}`)}
                          className="flex-none w-48 p-3 rounded-xl border border-border/60 hover:border-primary/40 bg-card/50 hover:bg-card shadow-sm transition-all cursor-pointer group snap-start"
                        >
                          <div className="aspect-[2/3] w-full bg-muted rounded mb-3 flex items-center justify-center border border-border/30">
                             <span className="font-medium text-xs text-muted-foreground text-center px-2 line-clamp-3">{book.title}</span>
                          </div>
                          <p className="font-semibold text-sm text-foreground group-hover:text-primary line-clamp-2">
                            {book.title}
                          </p>
                          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                            {book.author}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && <TypingIndicator />}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {messages.length === 1 && !isLoading && (
        <div className="flex flex-wrap gap-2 animate-in fade-in">
          {QUICK_PROMPTS.map((prompt, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => handleSend(prompt.text)}
              className="rounded-full bg-card/60 backdrop-blur border-border/50 hover:border-primary/50 text-muted-foreground hover:text-foreground shadow-sm"
            >
              <HelpCircle className="h-3.5 w-3.5 mr-1.5" />
              {prompt.text}
            </Button>
          ))}
        </div>
      )}

      <form
        className="flex gap-2 bg-card/80 backdrop-blur-xl border border-border/60 p-1.5 rounded-full shadow-lg focus-within:ring-2 focus-within:ring-ring/30 transition-all shrink-0"
        onSubmit={(e) => { e.preventDefault(); handleSend(input); }}
      >
        <Input
          placeholder="Nhập câu hỏi..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent flex-1 text-base shadow-none px-4 rounded-l-full"
        />
        <Button 
          type="submit" 
          disabled={isLoading || !input.trim()} 
          className="rounded-full px-5 py-2 shrink-0 transition-all shadow-sm"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  )
}
