import { Bot, Send, User, BookOpen, Loader2, Calendar, HelpCircle, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatApi } from '@/api/chat'
import type { SourceBook } from '@/api/chat'

interface Message {
  sender: 'user' | 'bot'
  text: string
  sourceBooks?: SourceBook[]
  intent?: string
  confidence?: number
}

const QUICK_PROMPTS = [
  { text: "Gợi ý sách học Java cho người mới", category: "search" },
  { text: "Tôi còn bao nhiêu sách phải trả?", category: "borrow" },
  { text: "Sách tôi đặt mượn đã có chưa?", category: "hold" },
  { text: "Quy định mượn trả của thư viện", category: "general" }
]

export default function ChatPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: 'Xin chào! Tôi là **Trợ lý AI** của thư viện **Awaken Ant Library** 🐜.\n\nTôi có thể giúp bạn:\n1. 🔍 **Tìm kiếm sách**: Gợi ý sách theo chủ đề, tác giả, ngôn ngữ tự nhiên.\n2. 📅 **Kiểm tra tài khoản mượn trả**: Tra cứu hạn trả sách, sách đang quá hạn.\n3. 📌 **Kiểm tra đặt trước**: Xem tình trạng yêu cầu giữ chỗ (hold) sách của bạn.\n4. 📚 **Quy chế thư viện**: Giải đáp nội quy, giờ mở cửa, v.v.\n\nBạn cần tôi hỗ trợ thông tin gì hôm nay?',
    }
  ])
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const navigate = useNavigate()

  // Tự động cuộn xuống cuối khi có tin nhắn mới
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    const userMessage: Message = {
      sender: 'user',
      text: textToSend
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setIsLoading(true)

    // Xây dựng chatHistory từ các tin nhắn trước đó (chỉ lấy văn bản thô dạng "User: ..." / "Bot: ...")
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
    } catch (error) {
      console.error("Lỗi khi kết nối chatbot:", error)
      const errorMessage: Message = {
        sender: 'bot',
        text: '❌ **Lỗi kết nối**: Rất tiếc, tôi không thể kết nối tới dịch vụ chatbot lúc này. Vui lòng thử lại sau.'
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  // Hàm helper để render chữ in đậm / Markdown thô cơ bản
  const renderMessageText = (text: string) => {
    return text.split('\n').map((paragraph, index) => {
      // Thay thế **bold**
      let formattedText = paragraph;
      const boldRegex = /\*\*(.*?)\*\*/g;
      const parts = [];
      let lastIndex = 0;
      let match;
      
      while ((match = boldRegex.exec(paragraph)) !== null) {
        if (match.index > lastIndex) {
          parts.push(paragraph.substring(lastIndex, match.index));
        }
        parts.push(<strong key={match.index} className="font-bold text-foreground">{match[1]}</strong>);
        lastIndex = boldRegex.lastIndex;
      }
      
      if (lastIndex < paragraph.length) {
        parts.push(paragraph.substring(lastIndex));
      }

      return (
        <p key={index} className={paragraph.trim() === '' ? 'h-3' : 'min-h-[1rem]'}>
          {parts.length > 0 ? parts : paragraph}
        </p>
      )
    })
  }

  return (
    <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-8rem)] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent flex items-center gap-2">
            <Bot className="h-7 w-7 text-primary animate-pulse" />
            Trợ lý AI Thư viện
          </h2>
          <p className="text-muted-foreground text-sm">Hỏi đáp thông tin sách, mượn trả và đặt trước bằng ngôn ngữ tự nhiên</p>
        </div>
      </div>

      {/* Main Chat Card */}
      <Card className="flex-1 flex flex-col overflow-hidden border-muted/60 shadow-lg bg-card/40 backdrop-blur-md">
        {/* Chat Area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 scrollbar-thin scrollbar-thumb-muted">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex gap-3 max-w-[85%] ${
                msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
              }`}
            >
              {/* Avatar Icon */}
              <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 shadow-sm ${
                msg.sender === 'user' 
                  ? 'bg-primary text-primary-foreground' 
                  : 'bg-muted border border-muted-foreground/10 text-primary'
              }`}>
                {msg.sender === 'user' ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
              </div>

              {/* Message Content Container */}
              <div className="space-y-2">
                <div className={`p-3 rounded-2xl shadow-sm text-sm leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-tr-none'
                    : 'bg-muted/70 text-foreground border border-muted-foreground/5 rounded-tl-none'
                }`}>
                  <div className="space-y-1">
                    {renderMessageText(msg.text)}
                  </div>
                </div>

                {/* Gợi ý Sách Nguồn (RAG Source Books) */}
                {msg.sourceBooks && msg.sourceBooks.length > 0 && (
                  <div className="pl-2 space-y-2 animate-in fade-in-50 duration-300">
                    <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                      <BookOpen className="h-3 w-3 text-primary" />
                      Sách thực tế trong thư viện được gợi ý:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {msg.sourceBooks.map((book) => (
                        <div
                          key={book.bookId}
                          onClick={() => navigate(`/books/${book.bookId}`)}
                          className="flex items-start gap-2.5 p-2 rounded-xl border border-muted-foreground/10 hover:border-primary/50 hover:bg-primary/5 transition-all cursor-pointer group shadow-sm bg-card/60"
                        >
                          <BookOpen className="h-4 w-4 text-muted-foreground group-hover:text-primary shrink-0 mt-0.5" />
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-foreground group-hover:text-primary transition-colors truncate">
                              {book.title}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {book.author}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <div className="w-1.5 h-1.5 rounded-full bg-primary/80" />
                              <span className="text-[9px] font-semibold text-primary">
                                Khớp: {Math.round(book.relevanceScore * 100)}%
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isLoading && (
            <div className="flex gap-3 max-w-[80%]">
              <div className="h-8 w-8 rounded-full bg-muted border border-muted-foreground/10 text-primary flex items-center justify-center shrink-0">
                <Bot className="h-4 w-4" />
              </div>
              <div className="bg-muted/70 border border-muted-foreground/5 rounded-2xl rounded-tl-none p-3 shadow-sm flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-primary animate-spin" />
                <span className="text-xs text-muted-foreground">Trợ lý AI đang tìm kiếm và suy nghĩ...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>
      </Card>

      {/* Quick Prompts */}
      {messages.length === 1 && !isLoading && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {QUICK_PROMPTS.map((prompt, i) => (
            <Button
              key={i}
              variant="outline"
              size="sm"
              onClick={() => handleSend(prompt.text)}
              className="justify-start text-left text-xs h-auto p-2.5 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-foreground shrink-0 border-muted/70 gap-2 flex items-center"
            >
              <HelpCircle className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="truncate">{prompt.text}</span>
            </Button>
          ))}
        </div>
      )}

      {/* Input Area */}
      <form
        className="flex gap-2 bg-background border border-muted/80 p-1.5 rounded-2xl shadow-sm focus-within:ring-1 focus-within:ring-primary/50 focus-within:border-primary transition-all shrink-0"
        onSubmit={(e) => {
          e.preventDefault()
          handleSend(input)
        }}
      >
        <Input
          placeholder="Hỏi về sách lập trình, hạn trả, hoặc sách đặt trước..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent flex-1 text-sm shadow-none"
        />
        <Button 
          type="submit" 
          disabled={isLoading || !input.trim()} 
          className="rounded-xl px-4 py-2 shrink-0 bg-primary hover:bg-primary/95 transition-all"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </Button>
      </form>
    </div>
  )
}
