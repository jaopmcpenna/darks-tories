import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sendMessage, streamMessage } from '../services/api/chat'
import type { ChatMessage, GameSession, GameState } from '../types'

const STORAGE_KEY = 'darks-tories-chat-history'
const SESSION_STORAGE_KEY = 'darks-tories-game-session'

export const useChatStore = defineStore('chat', () => {
  // State
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)
  const gameSession = ref<GameSession>({
    gameState: 'before_story_selection',
    completedStoryIds: [],
  })

  // Getters
  const hasMessages = computed(() => messages.value.length > 0)
  const lastMessage = computed(() => 
    messages.value.length > 0 ? messages.value[messages.value.length - 1] : null
  )

  // Actions
  function addMessage(message: ChatMessage) {
    messages.value.push({
      ...message,
      timestamp: message.timestamp || new Date().toISOString(),
    })
    saveHistory()
  }

  function addUserMessage(content: string) {
    const message: ChatMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString(),
    }
    addMessage(message)
    return message
  }

  function addAssistantMessage(content: string) {
    const message: ChatMessage = {
      role: 'assistant',
      content,
      timestamp: new Date().toISOString(),
    }
    addMessage(message)
    return message
  }

  function updateLastMessage(content: string) {
    if (messages.value.length > 0) {
      const lastMsg = messages.value[messages.value.length - 1]
      if (lastMsg.role === 'assistant') {
        lastMsg.content = content
        saveHistory()
      }
    }
  }

  async function sendChatMessage(content: string, useStreaming = true) {
    if (!content.trim()) {
      return
    }

    // Add user message
    addUserMessage(content.trim())

    // Set loading state
    isLoading.value = true
    isStreaming.value = useStreaming
    error.value = null

    try {
      if (useStreaming) {
        // Stream the response
        // Create assistant message placeholder (will be updated during streaming)
        const assistantMessage = addAssistantMessage('')
        
        // Send all messages except the empty assistant message we just added
        // Include gameSession in the request
        let streamMetadata: { gameState?: GameState; selectedStoryId?: string; completedStoryIds?: string[] } | undefined
        for await (const chunk of streamMessage(messages.value.slice(0, -1), gameSession.value)) {
          if (typeof chunk === 'string') {
            assistantMessage.content += chunk
            updateLastMessage(assistantMessage.content)
          } else if (chunk && 'metadata' in chunk) {
            // Store metadata to update session after stream completes
            streamMetadata = chunk.metadata
            console.log('[Frontend] Received stream metadata:', streamMetadata)
          }
        }
        
        // Update gameSession with metadata received from stream
        if (streamMetadata) {
          console.log('[Frontend] Updating game session with:', streamMetadata)
          updateGameSession(streamMetadata.gameState, streamMetadata.selectedStoryId, streamMetadata.completedStoryIds)
        }
      } else {
        // Get complete response
        // Send all messages (including the user message we just added)
        // Include gameSession in the request
        const response = await sendMessage(messages.value, gameSession.value)
        addAssistantMessage(response.message.content)
        
        // Update gameSession if we received gameState or selectedStoryId
        if (response.gameState || response.selectedStoryId !== undefined || response.completedStoryIds) {
          updateGameSession(response.gameState, response.selectedStoryId, response.completedStoryIds)
        }
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to send message'
      console.error('Error sending message:', err)
      
      // Remove the empty assistant message if it was added
      if (messages.value.length > 0 && messages.value[messages.value.length - 1].content === '') {
        messages.value.pop()
      }
    } finally {
      isLoading.value = false
      isStreaming.value = false
    }
  }

  function updateGameSession(newGameState?: GameState, selectedStoryId?: string, completedStoryIds?: string[]) {
    if (newGameState) {
      // If transitioning back to story selection after completion, clear selectedStoryId
      const previousState = gameSession.value.gameState
      if (newGameState === 'before_story_selection' && previousState === 'story_completed') {
        gameSession.value.selectedStoryId = undefined
      }
      gameSession.value.gameState = newGameState
    }
    if (selectedStoryId !== undefined) {
      if (selectedStoryId) {
        gameSession.value.selectedStoryId = selectedStoryId
      } else {
        // If selectedStoryId is explicitly set to undefined/null, clear it
        gameSession.value.selectedStoryId = undefined
      }
    }
    if (completedStoryIds !== undefined) {
      gameSession.value.completedStoryIds = completedStoryIds
    }
    saveSession()
  }

  function clearChat() {
    messages.value = []
    error.value = null
    gameSession.value = {
      gameState: 'before_story_selection',
      completedStoryIds: [],
    }
    saveHistory()
    saveSession()
  }

  function saveHistory() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.value))
    } catch (err) {
      console.error('Failed to save chat history:', err)
    }
  }

  function loadHistory() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as ChatMessage[]
        if (Array.isArray(parsed)) {
          messages.value = parsed
        }
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
  }

  function saveSession() {
    try {
      localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(gameSession.value))
    } catch (err) {
      console.error('Failed to save game session:', err)
    }
  }

  function loadSession() {
    try {
      const stored = localStorage.getItem(SESSION_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored) as GameSession
        if (parsed && parsed.gameState) {
          gameSession.value = parsed
        }
      }
    } catch (err) {
      console.error('Failed to load game session:', err)
    }
  }

  // Initialize: load history and session on store creation
  loadHistory()
  loadSession()

  return {
    // State
    messages,
    isLoading,
    isStreaming,
    error,
    gameSession,
    // Getters
    hasMessages,
    lastMessage,
    // Actions
    addMessage,
    addUserMessage,
    addAssistantMessage,
    updateLastMessage,
    sendChatMessage,
    clearChat,
    updateGameSession,
    saveHistory,
    loadHistory,
    saveSession,
    loadSession,
  }
})

