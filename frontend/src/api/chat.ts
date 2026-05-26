import api from './axios'

export interface SourceBook {
  bookId: number
  title: string
  author: string
  relevanceScore: number
}

export interface ChatResponse {
  answer: string
  intent: string
  confidence: number
  sourceBooks: SourceBook[]
}

export interface ChatRequest {
  question: string
  chatHistory: string[]
}

export const chatApi = {
  sendMessage: (data: ChatRequest) =>
    api.post<{ data: ChatResponse }>('/chat', data),
}
