import type { ChatMessage } from '../types'
import type { GameState, GameSession } from '../types/game'

/**
 * Detect game state from conversation messages
 */
export function detectGameState(messages: ChatMessage[], currentState?: GameState, selectedStoryId?: string): GameState {
  // If we have an explicit state, use it (unless we detect a transition)
  if (currentState) {
    // Check for transitions
    // Use only the last assistant message to detect solution (where it would be revealed)
    // This avoids false positives from old messages with "Solution:" from previous stories
    const lastAssistantMessage = [...messages].reverse().find((msg) => msg.role === 'assistant')
    const lastAssistantText = lastAssistantMessage?.content.toLowerCase() || ''
    
    // Check if story has been completed
    if (currentState === 'story_ongoing') {
      // Check only the last assistant message for solution indicators
      const hasSolution = 
        lastAssistantText.includes('solution:') ||
        lastAssistantText.includes('solução:') ||
        lastAssistantText.includes('the answer is') ||
        lastAssistantText.includes('a resposta é') ||
        lastAssistantText.includes('here is the full solution') ||
        lastAssistantText.includes('aqui está a solução completa')
      
      if (hasSolution) {
        console.log('[detectGameState] Story completed detected!', {
          currentState,
          lastAssistantPreview: lastAssistantText.substring(0, 200),
        })
        return 'story_completed'
      }
    }
    
    // Check if we've transitioned to narrator (story selected)
    // IMPORTANT: Only detect this transition if we don't have a selectedStoryId yet
    // This prevents false positives when old story info is still in the messages
    if (currentState === 'before_story_selection') {
      // Only detect story_ongoing if:
      // 1. We don't have a selectedStoryId (meaning this is a new selection, not old data)
      // 2. AND we detect story selection indicators in the LAST assistant message (new selection)
      const lastAssistantMessage = [...messages].reverse().find((msg) => msg.role === 'assistant')
      const lastAssistantText = lastAssistantMessage?.content.toLowerCase() || ''
      
      // Check if the last assistant message contains story selection indicators
      // This ensures we're detecting a NEW story selection, not old story info
      const hasNewStorySelection = 
        (!selectedStoryId) && // No story currently selected
        (
          lastAssistantText.includes('title:') ||
          lastAssistantText.includes('description:') ||
          lastAssistantText.includes('let\'s begin') ||
          lastAssistantText.includes('vamos começar') ||
          lastAssistantText.includes('perfect! let\'s begin') ||
          lastAssistantText.match(/title:\s*["']?[^"']+["']?/i)
        )
      
      if (hasNewStorySelection) {
        console.log('[detectGameState] New story selection detected in last assistant message', {
          currentState,
          hasSelectedStoryId: !!selectedStoryId,
          lastAssistantPreview: lastAssistantText.substring(0, 200),
        })
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

