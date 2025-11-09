import apiClient from './client'
import type { ChatMessage, ChatRequest, ChatResponse, StreamChunk, GameSession } from '../../types'

/**
 * Send a message and get a complete response
 */
export async function sendMessage(messages: ChatMessage[], gameSession?: GameSession): Promise<ChatResponse> {
  const request: ChatRequest = {
    messages,
    stream: false,
    gameSession,
  }

  const response = await apiClient.post<ChatResponse>('/chat', request)
  
  if (!response.data.success) {
    throw new Error(response.data.message?.content || 'Failed to send message')
  }

  return response.data
}

/**
 * Stream a message response
 * Returns an async generator that yields chunks of the response
 */
export async function* streamMessage(messages: ChatMessage[], gameSession?: GameSession): AsyncGenerator<string, void, unknown> {
  const request: ChatRequest = {
    messages,
    stream: true,
    gameSession,
  }

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5001/dark-stories-ai-7f82e/us-central1/api'
  const url = `${API_BASE_URL}/chat/stream`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Failed to stream message' }))
    throw new Error(error.message || `HTTP error! status: ${response.status}`)
  }

  if (!response.body) {
    throw new Error('Response body is null')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    while (true) {
      const { done, value } = await reader.read()

      if (done) {
        break
      }

      // Decode the chunk and add to buffer
      buffer += decoder.decode(value, { stream: true })

      // Process complete lines (SSE format: "data: {...}\n\n")
      const lines = buffer.split('\n')
      buffer = lines.pop() || '' // Keep incomplete line in buffer

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6)) as StreamChunk
            
            if (data.error) {
              throw new Error(data.error)
            }
            
            if (data.chunk) {
              yield data.chunk
            }
            
            if (data.metadata) {
              yield { metadata: data.metadata } as any
            }
          } catch (parseError) {
            // Skip invalid JSON lines
            console.warn('Failed to parse SSE data:', line, parseError)
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      const lines = buffer.split('\n')
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6)) as StreamChunk
            
            if (data.error) {
              throw new Error(data.error)
            }
            
            if (data.chunk) {
              yield data.chunk
            }
            
            if (data.metadata) {
              yield { metadata: data.metadata } as any
            }
          } catch (parseError) {
            console.warn('Failed to parse SSE data:', line, parseError)
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }
}

