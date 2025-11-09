import { Router, Request, Response } from 'express'
import { generateChatResponse, streamChatResponse } from '../services/chatAgent'
import type { ChatRequest, ChatResponse, ChatMessage } from '../types'

const router = Router()

/**
 * POST /api/chat
 * Send a message and get a complete response
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const { messages }: ChatRequest = req.body

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

    // Generate response
    const responseText = await generateChatResponse(messages)

    const responseMessage: ChatMessage = {
      role: 'assistant',
      content: responseText,
      timestamp: new Date().toISOString(),
    }

    const response: ChatResponse = {
      message: responseMessage,
      success: true,
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
    const { messages }: ChatRequest = req.body

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

    // Set headers for streaming
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering

    // Generate streaming response
    const stream = await streamChatResponse(messages)

    // Stream the response
    const reader = stream.getReader()

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          // Send final newline to indicate end of stream
          res.write('\n\n')
          res.end()
          break
        }

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

