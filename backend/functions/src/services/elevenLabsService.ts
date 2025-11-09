import * as functions from 'firebase-functions'

// Get ElevenLabs API key from Firebase config or environment
const getElevenLabsApiKey = (): string => {
  const config = functions.config()
  const apiKey = config?.elevenlabs?.api_key || process.env.ELEVENLABS_API_KEY || ''
  
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured. Please set it in Firebase Functions config or environment variables.')
  }
  
  return apiKey
}

// Default voice ID (Rachel - female voice, good for narration)
const DEFAULT_VOICE_ID = 'qAZH0aMXY8tw1QufPN0D'

// Default model for low latency (TTS)
const DEFAULT_MODEL = 'eleven_turbo_v2_5'

// Default model for Speech-to-Text
const DEFAULT_STT_MODEL = 'scribe_v1'

interface TranscribeResponse {
  text: string
}

interface SynthesizeOptions {
  voiceId?: string
  model?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

/**
 * Create multipart/form-data body manually for Node.js
 */
function createMultipartFormData(audioBuffer: Buffer, mimeType: string, modelId: string): { body: Buffer; boundary: string } {
  const boundary = `----WebKitFormBoundary${Math.random().toString(36).substring(2, 15)}`
  const CRLF = '\r\n'
  
  const parts: Buffer[] = []
  
  // Add model_id field (required by ElevenLabs STT API)
  parts.push(Buffer.from(`--${boundary}${CRLF}`))
  parts.push(Buffer.from(`Content-Disposition: form-data; name="model_id"${CRLF}${CRLF}`))
  parts.push(Buffer.from(modelId))
  parts.push(Buffer.from(CRLF))
  
  // Add file field (required by ElevenLabs STT API - must be named "file")
  const extension = mimeType.split('/')[1]?.split(';')[0] || 'webm'
  const filename = `audio.${extension}`
  parts.push(Buffer.from(`--${boundary}${CRLF}`))
  parts.push(Buffer.from(`Content-Disposition: form-data; name="file"; filename="${filename}"${CRLF}`))
  parts.push(Buffer.from(`Content-Type: ${mimeType}${CRLF}${CRLF}`))
  parts.push(audioBuffer)
  parts.push(Buffer.from(`${CRLF}--${boundary}--${CRLF}`))
  
  const body = Buffer.concat(parts)
  return { body, boundary }
}

/**
 * Transcribe audio to text using ElevenLabs Speech-to-Text API
 * @param audioBuffer - Audio file buffer (MP3, WAV, etc.)
 * @param mimeType - MIME type of the audio (e.g., 'audio/webm', 'audio/mp3')
 * @param modelId - Model ID for STT (default: 'eleven_multilingual_v2')
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string = 'audio/webm',
  modelId: string = DEFAULT_STT_MODEL
): Promise<string> {
  const apiKey = getElevenLabsApiKey()
  
  // Create multipart form data manually with model_id
  const { body, boundary } = createMultipartFormData(audioBuffer, mimeType, modelId)
  
  try {
    const response = await fetch('https://api.elevenlabs.io/v1/speech-to-text', {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
      },
      body: new Uint8Array(body) as any,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs STT API error: ${response.status} - ${errorText}`)
    }
    
    const data = await response.json() as TranscribeResponse
    return data.text
  } catch (error) {
    console.error('Error transcribing audio:', error)
    throw error instanceof Error ? error : new Error('Failed to transcribe audio')
  }
}

/**
 * Synthesize text to speech using ElevenLabs Text-to-Speech API
 * Returns a ReadableStream of audio data
 * @param text - Text to synthesize
 * @param options - Synthesis options
 * @returns ReadableStream of audio data (MP3 format)
 */
export async function synthesizeSpeech(
  text: string,
  options: SynthesizeOptions = {}
): Promise<ReadableStream<Uint8Array>> {
  const apiKey = getElevenLabsApiKey()
  const voiceId = options.voiceId || DEFAULT_VOICE_ID
  const model = options.model || DEFAULT_MODEL
  
  const requestBody = {
    text,
    model_id: model,
    voice_settings: {
      stability: options.stability ?? 0.5,
      similarity_boost: options.similarityBoost ?? 0.75,
      style: options.style ?? 0.0,
      use_speaker_boost: options.useSpeakerBoost ?? true,
    },
  }
  
  try {
    const response = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        method: 'POST',
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      }
    )
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`ElevenLabs TTS API error: ${response.status} - ${errorText}`)
    }
    
    if (!response.body) {
      throw new Error('Response body is null')
    }
    
    return response.body
  } catch (error) {
    console.error('Error synthesizing speech:', error)
    throw error instanceof Error ? error : new Error('Failed to synthesize speech')
  }
}

/**
 * Synthesize text to speech and return as buffer (non-streaming)
 * Useful for caching or when streaming is not needed
 */
export async function synthesizeSpeechToBuffer(
  text: string,
  options: SynthesizeOptions = {}
): Promise<Buffer> {
  const stream = await synthesizeSpeech(text, options)
  const chunks: Uint8Array[] = []
  const reader = stream.getReader()
  
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      chunks.push(value)
    }
  } finally {
    reader.releaseLock()
  }
  
  // Combine all chunks into a single buffer
  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0)
  const result = new Uint8Array(totalLength)
  let offset = 0
  for (const chunk of chunks) {
    result.set(chunk, offset)
    offset += chunk.length
  }
  
  return Buffer.from(result)
}

