// Common types for the API

export interface ApiResponse<T = unknown> {
  data: T
  message?: string
  success: boolean
}

export interface ApiError {
  message: string
  code?: string
  details?: unknown
}

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

