import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { sendMessage, streamMessage } from '../services/api/chat'
import type { ChatMessage } from '../types'

const STORAGE_KEY = 'darks-tories-chat-history'

export const useChatStore = defineStore('chat', () => {
  // State
  const messages = ref<ChatMessage[]>([])
  const isLoading = ref(false)
  const isStreaming = ref(false)
  const error = ref<string | null>(null)

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
        for await (const chunk of streamMessage(messages.value.slice(0, -1))) {
          assistantMessage.content += chunk
          updateLastMessage(assistantMessage.content)
        }
      } else {
        // Get complete response
        // Send all messages (including the user message we just added)
        const response = await sendMessage(messages.value)
        addAssistantMessage(response.content)
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

  function clearChat() {
    messages.value = []
    error.value = null
    saveHistory()
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

  // Initialize: load history on store creation
  loadHistory()

  return {
    // State
    messages,
    isLoading,
    isStreaming,
    error,
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
    saveHistory,
    loadHistory,
  }
})

