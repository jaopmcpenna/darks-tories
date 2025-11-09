import type { ChatMessage } from '../types'
import type { GameState, GameSession } from '../types/game'
import { generateStorySelectionResponse, streamStorySelectionResponse } from './storySelectionAgent'
import { generateNarratorResponse, streamNarratorResponse } from './narratorAgent'
import { getStoryById } from './storyService'
import { detectGameState, extractStoryFromMessages, createInitialGameSession, updateGameSession } from '../utils/gameState'

/**
 * Generate a chat response using the appropriate agent based on game state
 */
export async function generateChatResponse(
  messages: ChatMessage[],
  gameSession?: GameSession
): Promise<{ response: string; gameState: GameState; selectedStoryId?: string; completedStoryIds?: string[] }> {
  // Initialize or use provided game session
  let session = gameSession || createInitialGameSession()
  
  // Detect current game state from messages
  const currentState = detectGameState(messages, session.gameState)
  
  // If story was completed in previous interaction, transition back to story selection
  // This happens when user sends a new message after story completion
  if (session.gameState === 'story_completed' && currentState === 'story_completed') {
    // User is sending a new message after story completion - transition to story selection
    session = updateGameSession(session, {
      gameState: 'before_story_selection',
      selectedStoryId: undefined, // Clear selected story to allow new selection
    })
  } else {
    // Update session state
    session = updateGameSession(session, { gameState: currentState })
  }

  let response: string
  let selectedStoryId: string | undefined

  if (session.gameState === 'before_story_selection') {
    // Use story selection agent
    const result = await generateStorySelectionResponse(messages, session.completedStoryIds)
    response = result.response
    
    // Check if story was selected
    if (result.selectedStory) {
      selectedStoryId = result.selectedStory.id
      session = updateGameSession(session, {
        gameState: 'story_ongoing',
        selectedStoryId: result.selectedStory.id,
      })
      
      // Update response to include story transition
      // The story selection agent should have already included this, but we ensure it's there
      // IMPORTANT: Do NOT include the solution - it should only be revealed when the story is completed
      const storyInfo = extractStoryFromMessages([...messages, { role: 'assistant', content: response }])
      if (!storyInfo && result.selectedStory) {
        // If story info wasn't extracted, we need to add it (without solution)
        response = `${response}\n\nTitle: ${result.selectedStory.title}\nDescription: ${result.selectedStory.description}`
      }
    }
  } else if (session.gameState === 'story_ongoing' || session.gameState === 'story_completed') {
    // Use narrator agent - need to get the story
    if (!session.selectedStoryId) {
      // Try to extract story from messages if not in session
      const storyInfo = extractStoryFromMessages(messages)
      if (storyInfo && storyInfo.title) {
        // We have story info but no ID - this is a transition case
        // For now, we'll need to handle this differently
        // Ideally, the story should be stored when selected
        throw new Error('Story ID is required for narrator agent. Please provide selectedStoryId in gameSession.')
      }
      throw new Error('Story ID is required for narrator agent')
    }

    const story = await getStoryById(session.selectedStoryId)
    if (!story) {
      throw new Error(`Story with ID ${session.selectedStoryId} not found`)
    }

    response = await generateNarratorResponse(messages, story)
    
    // Check if story was completed
    const newState = detectGameState([...messages, { role: 'assistant', content: response }], session.gameState)
    if (newState === 'story_completed') {
      // Only add to completedStoryIds if not already there
      const updatedCompletedIds = session.completedStoryIds.includes(session.selectedStoryId!)
        ? session.completedStoryIds
        : [...session.completedStoryIds, session.selectedStoryId!]
      
      session = updateGameSession(session, {
        gameState: 'story_completed',
        completedStoryIds: updatedCompletedIds,
      })
    }
  } else {
    // Fallback to story selection
    const result = await generateStorySelectionResponse(messages, session.completedStoryIds)
    response = result.response
    if (result.selectedStory) {
      selectedStoryId = result.selectedStory.id
      session = updateGameSession(session, {
        gameState: 'story_ongoing',
        selectedStoryId: result.selectedStory.id,
      })
    }
  }

  return {
    response,
    gameState: session.gameState,
    selectedStoryId,
    completedStoryIds: session.completedStoryIds,
  }
}

/**
 * Stream a chat response using the appropriate agent based on game state
 */
export async function streamChatResponse(
  messages: ChatMessage[],
  gameSession?: GameSession
): Promise<ReadableStream<string>> {
  // Initialize or use provided game session
  let session = gameSession || createInitialGameSession()
  
  // Detect current game state from messages
  const currentState = detectGameState(messages, session.gameState)
  
  // If story was completed in previous interaction, transition back to story selection
  // This happens when user sends a new message after story completion
  if (session.gameState === 'story_completed' && currentState === 'story_completed') {
    // User is sending a new message after story completion - transition to story selection
    session = updateGameSession(session, {
      gameState: 'before_story_selection',
      selectedStoryId: undefined, // Clear selected story to allow new selection
    })
  } else {
    // Update session state
    session = updateGameSession(session, { gameState: currentState })
  }

  if (session.gameState === 'before_story_selection') {
    // Use story selection agent
    return streamStorySelectionResponse(messages, session.completedStoryIds)
  } else if (session.gameState === 'story_ongoing' || session.gameState === 'story_completed') {
    // Use narrator agent - need to get the story
    if (!session.selectedStoryId) {
      throw new Error('Story ID is required for narrator agent')
    }

    const story = await getStoryById(session.selectedStoryId)
    if (!story) {
      throw new Error(`Story with ID ${session.selectedStoryId} not found`)
    }

    return streamNarratorResponse(messages, story)
  } else {
    // Fallback to story selection
    return streamStorySelectionResponse(messages, session.completedStoryIds)
  }
}
