import { ArrowRight, Bot, Send, User, BookOpen, Loader2, HelpCircle, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { chatApi } from '@/api/chat'
import type { SourceBook } from '@/api/chat'
import BookCover from '@/components/shared/BookCover'

interface Message {
  sender: 'user' | 'bot'
  text: string
  sourceBooks?: SourceBook[]
  intent?: string
  confidence?: number
}

const CHAT_HISTORY_LIMIT = 10

const QUICK_PROMPTS = [
  { text: "Gợi ý sách học Java", icon: BookOpen },
  { text: "Sách tôi đặt mượn đã có chưa?", icon: HelpCircle },
  { text: "Quy định mượn trả", icon: HelpCircle },
]

// ─── Sub-components ─── //

function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
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

/** Source book card – fixed width, no horizontal overflow */
function SourceBookCard({ book, onClick }: { book: SourceBook; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex gap-3 p-3 rounded-xl border border-border/60 hover:border-primary/40 bg-card/50 hover:bg-card shadow-sm transition-all cursor-pointer group text-left w-full"
    >
      <BookCover
        src={book.coverImageUrl}
        title={book.title}
        className="w-12 h-16 rounded-md border border-border/30 overflow-hidden shrink-0"
        fallbackClassName="text-[8px] px-1"
      />
      <div className="min-w-0 flex-1 flex flex-col justify-between">
        <div>
          <p className="font-semibold text-sm text-foreground group-hover:text-primary line-clamp-2 leading-snug">
            {book.title}
          </p>
          <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
            {book.author}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-1">
          Xem chi tiết
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
    </button>
  )
}

/** Welcome empty state shown before any conversation */
function WelcomeState({ onPrompt }: { onPrompt: (text: string) => void }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center px-4 animate-in fade-in duration-500">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6">
        <Sparkles className="h-8 w-8 text-primary" />
      </div>
      <h2 className="text-xl font-bold tracking-tight mb-2">Trợ lý thư viện</h2>
      <p className="text-muted-foreground text-sm max-w-md mb-8 leading-relaxed">
        Tìm kiếm sách, kiểm tra hạn trả, tra cứu đặt mượn — hỏi bất cứ điều gì về thư viện.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg">
        {QUICK_PROMPTS.map((prompt, i) => {
          const Icon = prompt.icon
          return (
            <button
              key={i}
              type="button"
              onClick={() => onPrompt(prompt.text)}
              className="flex items-center gap-2.5 px-4 py-3 rounded-xl border border-border/60 hover:border-primary/40 bg-card/50 hover:bg-card text-sm text-muted-foreground hover:text-foreground transition-all text-left shadow-sm"
            >
              <Icon className="h-4 w-4 shrink-0 text-primary/60" />
              <span className="line-clamp-2">{prompt.text}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Parse bold (**text**) and newlines in message text */
function renderMessageText(text: string) {
  return text.split('\n').map((paragraph, index) => {
    let lastIndex = 0
    let match
    const boldRegex = /\*\*(.*?)\*\*/g
    const parts: (string | JSX.Element)[] = []

    while ((match = boldRegex.exec(paragraph)) !== null) {
      if (match.index > lastIndex) {
        parts.push(paragraph.substring(lastIndex, match.index))
      }
      parts.push(<strong key={match.index} className="font-semibold">{match[1]}</strong>)
      lastIndex = boldRegex.lastIndex
    }

    if (lastIndex < paragraph.length) {
      parts.push(paragraph.substring(lastIndex))
    }

    return (
      <p key={index} className={paragraph.trim() === '' ? 'h-2' : 'min-h-[1rem]'}>
        {parts.length > 0 ? parts : paragraph}
      </p>
    )
  })
}

// ─── Main ChatPage ─── //

export default function ChatPage() {
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [hasStarted, setHasStarted] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading])

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return

    if (!hasStarted) {
      // First message: add the welcome bot message first, then user's
      setHasStarted(true)
      setMessages([
        {
          sender: 'bot',
          text: 'Xin chào! Tôi là trợ lý thư viện Awaken Ant.\n\nTôi có thể hỗ trợ bạn:\n- Tìm kiếm sách theo chủ đề hoặc tác giả\n- Kiểm tra hạn trả sách đang mượn\n- Tra cứu tình trạng đặt mượn\n\nBạn cần tôi hỗ trợ gì?',
        },
        { sender: 'user', text: textToSend },
      ])
    } else {
      setMessages(prev => [...prev, { sender: 'user', text: textToSend }])
    }

    setInput('')
    setIsLoading(true)

    const chatHistory = messages.slice(-CHAT_HISTORY_LIMIT).map(msg =>
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
        sourceBooks: data.sourceBooks ?? [],
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
      inputRef.current?.focus()
    }
  }

  return (
    <div className="flex flex-col h-full -m-4 md:-m-8">
      {/* Chat area — fills available viewport */}
      <div className="flex-1 min-h-0 flex flex-col">
        {!hasStarted ? (
          <WelcomeState onPrompt={handleSend} />
        ) : (
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 space-y-6 scrollbar-thin scrollbar-thumb-muted">
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : ''} animate-in fade-in slide-in-from-bottom-2`}
                >
                  {/* Bot avatar */}
                  {msg.sender === 'bot' && (
                    <div className="h-8 w-8 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0 mt-1">
                      <Bot className="h-4 w-4" />
                    </div>
                  )}

                  <div className={`space-y-3 min-w-0 ${msg.sender === 'user' ? 'max-w-[85%] md:max-w-[75%]' : 'max-w-[90%] md:max-w-[85%]'}`}>
                    {/* Message bubble */}
                    <div className={`p-4 rounded-2xl shadow-sm text-[15px] leading-relaxed break-words ${
                      msg.sender === 'user'
                        ? 'bg-primary text-primary-foreground rounded-tr-sm'
                        : 'bg-muted/70 text-foreground border border-border/50 rounded-tl-sm'
                    }`}>
                      <div className="space-y-1">
                        {renderMessageText(msg.text)}
                      </div>
                    </div>

                    {/* Source books — responsive grid, no horizontal scroll */}
                    {msg.sourceBooks && msg.sourceBooks.length > 0 && (
                      <div className="space-y-2 pl-0.5">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5">
                          <BookOpen className="h-3.5 w-3.5" />
                          Sách liên quan
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {msg.sourceBooks.map((book) => (
                            <SourceBookCard
                              key={book.bookId}
                              book={book}
                              onClick={() => navigate(`/books/${book.bookId}`)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* User avatar */}
                  {msg.sender === 'user' && (
                    <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 mt-1 shadow-sm">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Input bar — always at bottom, full width */}
      <div className="shrink-0 border-t border-border/40 bg-background/80 backdrop-blur-xl px-4 md:px-8 py-3">
        <form
          className="max-w-3xl mx-auto flex gap-2 bg-card border border-border/60 p-1.5 rounded-2xl shadow-sm focus-within:ring-2 focus-within:ring-ring/30 transition-all"
          onSubmit={(e) => { e.preventDefault(); handleSend(input) }}
        >
          <Input
            ref={inputRef}
            placeholder="Hỏi về sách, mượn trả, hay bất cứ điều gì..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={isLoading}
            className="border-0 focus-visible:ring-0 focus-visible:ring-offset-0 bg-transparent flex-1 text-base shadow-none px-4"
          />
          <Button
            type="submit"
            disabled={isLoading || !input.trim()}
            size="icon"
            className="rounded-xl h-10 w-10 shrink-0 transition-all"
            aria-label="Gửi câu hỏi"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
        {hasStarted && (
          <div className="max-w-3xl mx-auto flex flex-wrap gap-1.5 mt-2">
            {QUICK_PROMPTS.map((prompt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSend(prompt.text)}
                disabled={isLoading}
                className="text-xs px-3 py-1.5 rounded-full border border-border/50 bg-card/60 text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all disabled:opacity-50"
              >
                {prompt.text}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
