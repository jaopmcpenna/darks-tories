import { Router, Request, Response } from 'express'
import { transcribeAudio, synthesizeSpeech } from '../services/elevenLabsService'

const router = Router()

/**
 * POST /api/voice/transcribe
 * Transcribe audio to text using ElevenLabs STT
 * Expects: multipart/form-data with 'audio' field or base64 audio in JSON body
 */
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    let audioBuffer: Buffer
    let mimeType = 'audio/webm'

    // Check if audio is sent as raw buffer (from express.raw middleware)
    if (req.body && Buffer.isBuffer(req.body) && req.body.length > 0) {
      audioBuffer = req.body
      // Try to get mime type from content-type header
      const contentType = req.headers['content-type']
      if (contentType && contentType.includes('audio/')) {
        mimeType = contentType.split('audio/')[1]?.split(';')[0] || mimeType
      }
    } else if (req.body?.audio) {
      // If audio is sent as base64 string in JSON
      if (typeof req.body.audio === 'string') {
        // Check if it's base64
        if (req.body.audio.startsWith('data:')) {
          // Data URL format: data:audio/webm;base64,...
          const matches = req.body.audio.match(/^data:([^;]+);base64,(.+)$/)
          if (matches) {
            mimeType = matches[1]
            audioBuffer = Buffer.from(matches[2], 'base64')
          } else {
            throw new Error('Invalid data URL format')
          }
        } else {
          // Plain base64
          audioBuffer = Buffer.from(req.body.audio, 'base64')
          mimeType = req.body.mimeType || mimeType
        }
      } else {
        throw new Error('Audio must be a base64 string or buffer')
      }
    } else {
      res.status(400).json({
        success: false,
        error: 'Audio data is required. Send as raw audio/* or JSON with base64 "audio" field.',
      })
      return
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      res.status(400).json({
        success: false,
        error: 'Audio buffer is empty',
      })
      return
    }

    // Get optional modelId from request body
    const modelId = req.body?.modelId

    // Transcribe audio
    const text = await transcribeAudio(audioBuffer, mimeType, modelId)

    res.json({
      success: true,
      text,
    })
  } catch (error) {
    console.error('Error in transcribe endpoint:', error)
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcribe audio',
    })
  }
})

/**
 * POST /api/voice/synthesize
 * Synthesize text to speech using ElevenLabs TTS with streaming
 * Expects: JSON body with 'text' field and optional voice settings
 */
router.post('/synthesize', async (req: Request, res: Response) => {
  let reader: ReadableStreamDefaultReader<Uint8Array> | null = null
  
  try {
    const { text, voiceId, model, stability, similarityBoost, style, useSpeakerBoost } = req.body

    if (!text || typeof text !== 'string') {
      res.status(400).json({
        success: false,
        error: 'Text is required',
      })
      return
    }

    // Set headers for streaming audio BEFORE starting the stream
    res.setHeader('Content-Type', 'audio/mpeg')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.setHeader('X-Accel-Buffering', 'no') // Disable nginx buffering
    res.setHeader('Transfer-Encoding', 'chunked')
    
    // Don't let Express close the connection automatically
    res.setTimeout(0) // Disable timeout

    // Get audio stream from ElevenLabs
    const audioStream = await synthesizeSpeech(text, {
      voiceId,
      model,
      stability,
      similarityBoost,
      style,
      useSpeakerBoost,
    })

    // Stream audio chunks to response
    reader = audioStream.getReader()

    // Use a recursive function to handle streaming
    const streamChunks = async (): Promise<void> => {
      try {
        while (true) {
          const { done, value } = await reader!.read()

          if (done) {
            res.end()
            return
          }

          // Check if client disconnected
          if (res.closed || res.destroyed) {
            console.log('Client disconnected during streaming')
            return
          }

          // Write chunk to response
          const canContinue = res.write(Buffer.from(value))
          
          // If buffer is full, wait for drain event
          if (!canContinue) {
            await new Promise<void>((resolve) => {
              res.once('drain', resolve)
            })
          }
        }
      } catch (streamError) {
        console.error('Error streaming audio:', streamError)
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Error streaming audio',
          })
        } else if (!res.closed && !res.destroyed) {
          res.end()
        }
      } finally {
        if (reader) {
          reader.releaseLock()
        }
      }
    }

    // Start streaming
    await streamChunks()
  } catch (error) {
    console.error('Error in synthesize endpoint:', error)
    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to synthesize speech',
      })
    } else if (!res.closed && !res.destroyed) {
      res.end()
    }
    if (reader) {
      reader.releaseLock()
    }
  }
})

export default router

