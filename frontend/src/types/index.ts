// Common TypeScript types will be exported from here

// Game types
export type GameState = 'before_story_selection' | 'story_ongoing' | 'story_completed'

export interface GameSession {
  gameState: GameState
  selectedStoryId?: string
  completedStoryIds: string[]
  sessionId?: string
  userId?: string
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
  gameSession?: GameSession
}

export interface ChatResponse {
  message: ChatMessage
  success: boolean
  gameState?: GameState
  selectedStoryId?: string
  completedStoryIds?: string[]
}

export interface StreamChunk {
  chunk?: string
  error?: string
  metadata?: {
    gameState?: GameState
    selectedStoryId?: string
    completedStoryIds?: string[]
  }
}

