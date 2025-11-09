import { Router, Request, Response } from 'express'
import { generateChatResponse, streamChatResponse } from '../services/chatAgent'
import type { ChatRequest, ChatResponse, ChatMessage } from '../types'
import { createInitialGameSession } from '../utils/gameState'

const router = Router()

/**
 * POST /api/chat
 * Send a message and get a complete response
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages, gameSession }: ChatRequest = req.body

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Messages array is required and must not be empty',
      })
      return
    }

    // Validate message structure
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        res.status(400).json({
          success: false,
          message: 'Each message must have role and content',
        })
        return
      }
      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        res.status(400).json({
          success: false,
          message: 'Message role must be user, assistant, or system',
        })
        return
      }
    }

    // Use provided game session or create initial one
    const session = gameSession || createInitialGameSession()

    // Generate response
    const result = await generateChatResponse(messages, session)

    const responseMessage: ChatMessage = {
      role: 'assistant',
      content: result.response,
      timestamp: new Date().toISOString(),
    }

    const response: ChatResponse = {
      message: responseMessage,
      success: true,
      gameState: result.gameState,
      selectedStoryId: result.selectedStoryId,
      completedStoryIds: result.completedStoryIds,
    }

    res.json(response)
    return
  } catch (error) {
    console.error('Error in chat endpoint:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Internal server error',
    })
  }
})

/**
 * POST /api/chat/stream
 * Send a message and get a streaming response
 */
router.post('/stream', async (req: Request, res: Response) => {
  try {
    const { messages, gameSession }: ChatRequest = req.body

    // Validate request
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Messages array is required and must not be empty',
      })
      return
    }

    // Validate message structure
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        res.status(400).json({
          success: false,
          message: 'Each message must have role and content',
        })
        return
      }
      if (!['user', 'assistant', 'system'].includes(msg.role)) {
        res.status(400).json({
          success: false,
          message: 'Message role must be user, assistant, or system',
        })
        return
      }
    }

    // Use provided game session or create initial one
    const session = gameSession || createInitialGameSession()

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

    // Generate streaming response
    const stream = await streamChatResponse(messages, session)
    let fullResponse = ''

    // Stream the response
    const reader = stream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          // After stream completes, detect state and send metadata
          const responseMessage: ChatMessage = {
            role: 'assistant',
            content: fullResponse,
            timestamp: new Date().toISOString(),
          }
          
          // Detect final state from the complete response
          const { detectGameState, extractStoryFromMessages } = await import('../utils/gameState')
          const { generateStorySelectionResponse } = await import('../services/storySelectionAgent')
          const finalState = detectGameState([...messages, responseMessage], session.gameState)
          
          // Try to extract story info from messages to get selectedStoryId
          // This happens when story selection agent transitions to narrator
          const storyInfo = extractStoryFromMessages([...messages, responseMessage])
          
          // Update session with final state
          let updatedSession = { ...session }
          let updatedCompletedStoryIds = session.completedStoryIds
          
          // Check if story was completed
          // Use session.selectedStoryId (the current story being played)
          const currentStoryId = session.selectedStoryId
          
          console.log('[Stream] Detecting completion:', {
            finalState,
            currentStoryId,
            currentGameState: session.gameState,
            responsePreview: fullResponse.substring(0, 200),
          })
          
          if (finalState === 'story_completed' && currentStoryId) {
            // Only add to completedStoryIds if not already there
            if (!updatedCompletedStoryIds.includes(currentStoryId)) {
              updatedCompletedStoryIds = [...updatedCompletedStoryIds, currentStoryId]
              console.log('[Stream] Story completed! Added to completedStoryIds:', {
                storyId: currentStoryId,
                completedStoryIds: updatedCompletedStoryIds,
              })
            } else {
              console.log('[Stream] Story already in completedStoryIds:', currentStoryId)
            }
            updatedSession = {
              ...updatedSession,
              gameState: finalState,
              completedStoryIds: updatedCompletedStoryIds,
            }
          } else if (finalState === 'story_ongoing' && finalState !== session.gameState) {
            // Transitioning to story_ongoing
            updatedSession = {
              ...updatedSession,
              gameState: finalState,
            }
          } else if (finalState !== session.gameState) {
            updatedSession = {
              ...updatedSession,
              gameState: finalState,
            }
          }
          
          // Log if we detected completion but didn't add it
          if (finalState === 'story_completed' && !currentStoryId) {
            console.warn('[Stream] Detected story_completed but no selectedStoryId in session!', {
              session: JSON.stringify(session, null, 2),
            })
          }
          
          // If we're transitioning to story_ongoing but don't have selectedStoryId,
          // we need to get it by calling generateStorySelectionResponse (non-streaming)
          // to get the selectedStoryId
          if (finalState === 'story_ongoing' && !updatedSession.selectedStoryId && storyInfo?.title) {
            try {
              // Make a non-streaming call to get the selectedStoryId
              // This is a workaround for streaming mode
              const selectionResult = await generateStorySelectionResponse(messages, session.completedStoryIds)
              if (selectionResult.selectedStory) {
                updatedSession = {
                  ...updatedSession,
                  selectedStoryId: selectionResult.selectedStory.id,
                }
              }
            } catch (error) {
              console.error('Failed to get selectedStoryId:', error)
              // Continue without selectedStoryId - next request should have it
            }
          }
          
          // Send metadata at the end
          res.write(`data: ${JSON.stringify({ 
            metadata: {
              gameState: updatedSession.gameState,
              selectedStoryId: updatedSession.selectedStoryId,
              completedStoryIds: updatedSession.completedStoryIds,
            }
          })}\n\n`)
          
          // Send final newline to indicate end of stream
          res.write('\n\n')
          res.end()
          break
        }

        // Accumulate full response
        fullResponse += value

        // Send chunk as Server-Sent Events format
        res.write(`data: ${JSON.stringify({ chunk: value })}\n\n`)
      }
    } catch (streamError) {
      console.error('Error streaming response:', streamError)
      res.write(`data: ${JSON.stringify({ error: 'Stream error occurred' })}\n\n`)
      res.end()
    } finally {
      reader.releaseLock()
    }
  } catch (error) {
    console.error('Error in chat stream endpoint:', error)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Internal server error',
      })
    } else {
      res.write(`data: ${JSON.stringify({ error: error instanceof Error ? error.message : 'Internal server error' })}\n\n`)
      res.end()
    }
  }
})

export default router

