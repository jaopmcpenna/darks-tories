// Game-related types

export type StoryDifficulty = 'easy' | 'medium' | 'hard'

export type GameState = 'before_story_selection' | 'story_ongoing' | 'story_completed'

export interface Story {
  id: string
  title: string
  description: string
  solution: string
  difficulty: StoryDifficulty
  category: string
  tags?: string[]
  createdAt?: FirebaseFirestore.Timestamp | Date
  updatedAt?: FirebaseFirestore.Timestamp | Date
}

export interface StoryFilters {
  difficulty?: StoryDifficulty
  category?: string
  tags?: string[]
  excludeIds?: string[]
}

export interface GameSession {
  gameState: GameState
  selectedStoryId?: string
  completedStoryIds: string[]
  sessionId?: string
  userId?: string
}

