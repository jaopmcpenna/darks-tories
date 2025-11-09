// Common TypeScript types will be exported from here

// Chat types
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp?: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  stream?: boolean
}

export interface ChatResponse {
  message: ChatMessage
  success: boolean
}

export interface StreamChunk {
  chunk?: string
  error?: string
}

