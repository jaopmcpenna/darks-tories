import type { ChatMessage } from '../types'
import type { GameState, GameSession } from '../types/game'

/**
 * Detect game state from conversation messages
 */
export function detectGameState(messages: ChatMessage[], currentState?: GameState): GameState {
  // If we have an explicit state, use it (unless we detect a transition)
  if (currentState) {
    // Check for transitions
    const conversationText = messages.map((msg) => msg.content).join(' ').toLowerCase()
    
    // Check if story has been completed
    if (currentState === 'story_ongoing') {
      const hasSolution = 
        conversationText.includes('solution:') ||
        conversationText.includes('solução:') ||
        conversationText.includes('the answer is') ||
        conversationText.includes('a resposta é') ||
        conversationText.includes('here is the full solution') ||
        conversationText.includes('aqui está a solução completa')
      
      if (hasSolution) {
        console.log('[detectGameState] Story completed detected!', {
          currentState,
          conversationTextPreview: conversationText.substring(0, 300),
        })
        return 'story_completed'
      }
    }
    
    // Check if we've transitioned to narrator (story selected)
    if (currentState === 'before_story_selection') {
      if (
        conversationText.includes('title:') ||
        conversationText.includes('description:') ||
        conversationText.includes('let\'s begin') ||
        conversationText.includes('vamos começar') ||
        conversationText.includes('perfect! let\'s begin') ||
        conversationText.match(/title:\s*["']?[^"']+["']?/i)
      ) {
        return 'story_ongoing'
      }
    }
    
    return currentState
  }

  // Default: start with story selection
  return 'before_story_selection'
}

/**
 * Extract story ID from messages (if story was selected)
 */
export function extractStoryId(messages: ChatMessage[]): string | undefined {
  const text = messages.map((msg) => msg.content).join('\n')
  
  // Look for story ID pattern in messages
  const storyIdMatch = text.match(/story[_-]?id[:\s]+([a-zA-Z0-9_-]+)/i)
  if (storyIdMatch) {
    return storyIdMatch[1]
  }
  
  return undefined
}

/**
 * Check if we should transition to narrator agent
 */
export function shouldTransitionToNarrator(messages: ChatMessage[]): boolean {
  const conversationText = messages.map((msg) => msg.content).join(' ').toLowerCase()
  
  // Check for indicators that story was selected and game should start
  const transitionIndicators = [
    'title:',
    'description:',
    'let\'s begin',
    'vamos começar',
    'perfect! let\'s begin',
    'now let\'s start',
    'agora vamos começar',
  ]
  
  return transitionIndicators.some((indicator) => conversationText.includes(indicator))
}

/**
 * Extract story information from messages (for transition)
 */
export function extractStoryFromMessages(messages: ChatMessage[]): {
  title?: string
  description?: string
  solution?: string
} | null {
  // Try to extract story information from the last assistant message
  const lastAssistantMessage = [...messages].reverse().find((msg) => msg.role === 'assistant')
  if (!lastAssistantMessage) {
    return null
  }
  
  const text = lastAssistantMessage.content
  
  // Extract title
  const titleMatch = text.match(/title:\s*["']?([^"'\n]+)["']?/i)
  const title = titleMatch ? titleMatch[1].trim() : undefined
  
  // Extract description
  const descMatch = text.match(/description:\s*["']?([^"']+)["']?/i)
  const description = descMatch ? descMatch[1].trim() : undefined
  
  // Extract solution
  const solMatch = text.match(/solution:\s*["']?([^"']+)["']?/i)
  const solution = solMatch ? solMatch[1].trim() : undefined
  
  if (title || description || solution) {
    return { title, description, solution }
  }
  
  return null
}

/**
 * Create initial game session
 */
export function createInitialGameSession(sessionId?: string, userId?: string): GameSession {
  return {
    gameState: 'before_story_selection',
    completedStoryIds: [],
    sessionId,
    userId,
  }
}

/**
 * Update game session state
 */
export function updateGameSession(
  session: GameSession,
  updates: Partial<Pick<GameSession, 'gameState' | 'selectedStoryId' | 'completedStoryIds'>>
): GameSession {
  return {
    ...session,
    ...updates,
  }
}

