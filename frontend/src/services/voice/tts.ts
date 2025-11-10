export interface SynthesizeOptions {
  voiceId?: string
  model?: string
  stability?: number
  similarityBoost?: number
  style?: number
  useSpeakerBoost?: boolean
}

// Get API base URL (same logic as client.ts)
const getApiBaseUrl = (): string => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // In production (when not running on localhost), use Firebase Functions URL
  if (import.meta.env.PROD || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))) {
    return 'https://us-central1-dark-stories-ai-7f82e.cloudfunctions.net/api'
  }
  
  // Default to localhost emulator for development
  return 'http://127.0.0.1:5001/dark-stories-ai-7f82e/us-central1/api'
}

/**
 * Synthesize text to speech and return audio URL
 * @param text - Text to synthesize
 * @param options - Synthesis options
 * @returns Blob URL of the audio
 */
export async function synthesizeSpeech(
  text: string,
  options: SynthesizeOptions = {}
): Promise<string> {
  try {
    const API_BASE_URL = getApiBaseUrl()
    const url = `${API_BASE_URL}/voice/synthesize`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        ...options,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`TTS API error: ${response.status} - ${errorText}`)
    }

    // Get audio blob
    const audioBlob = await response.blob()
    
    // Create object URL for playback
    const audioUrl = URL.createObjectURL(audioBlob)
    
    return audioUrl
  } catch (error) {
    console.error('Error synthesizing speech:', error)
    throw error instanceof Error ? error : new Error('Failed to synthesize speech')
  }
}

/**
 * Synthesize text to speech with streaming
 * Returns an async generator that yields audio chunks
 * @param text - Text to synthesize
 * @param options - Synthesis options
 * @param onChunk - Callback for each audio chunk received
 * @returns Promise that resolves with the final audio blob URL
 */
export async function synthesizeSpeechStream(
  text: string,
  options: SynthesizeOptions = {},
  onChunk?: (chunk: Uint8Array) => void
): Promise<string> {
  try {
    const API_BASE_URL = getApiBaseUrl()
    const url = `${API_BASE_URL}/voice/synthesize`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        ...options,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`TTS API error: ${response.status} - ${errorText}`)
    }

    if (!response.body) {
      throw new Error('Response body is null')
    }

    // Stream the audio
    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        
        if (done) {
          break
        }

        chunks.push(value)
        
        // Call onChunk callback if provided
        if (onChunk) {
          onChunk(value)
        }
      }
    } finally {
      reader.releaseLock()
    }

    // Combine all chunks into a single blob
    const audioBlob = new Blob(chunks, { type: 'audio/mpeg' })
    const audioUrl = URL.createObjectURL(audioBlob)
    
    return audioUrl
  } catch (error) {
    console.error('Error synthesizing speech stream:', error)
    throw error instanceof Error ? error : new Error('Failed to synthesize speech stream')
  }
}

/**
 * Play audio from URL
 * @param audioUrl - URL of the audio (blob URL or regular URL)
 * @returns Promise that resolves when audio finishes playing
 */
export function playAudio(audioUrl: string): Promise<void> {
  return new Promise((resolve, reject) => {
    // Create audio element with playsinline attribute for mobile Safari
    // This is required for autoplay to work on iOS devices
    const audio = document.createElement('audio')
    audio.src = audioUrl
    audio.setAttribute('playsinline', '')
    audio.setAttribute('webkit-playsinline', '') // For older iOS versions
    audio.preload = 'auto'
    
    audio.onended = () => {
      // Clean up blob URL if it's a blob URL
      if (audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl)
      }
      resolve()
    }
    
    audio.onerror = (error) => {
      reject(new Error(`Failed to play audio: ${error}`))
    }
    
    audio.play().catch(reject)
  })
}

/**
 * Stop currently playing audio
 */
export function stopAudio(audio: HTMLAudioElement | null): void {
  if (audio) {
    audio.pause()
    audio.currentTime = 0
  }
}

