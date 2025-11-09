import apiClient from '../api/client'

export interface TranscribeResponse {
  success: boolean
  text?: string
  error?: string
}

/**
 * Transcribe audio to text using backend STT endpoint
 * @param audioBlob - Audio blob from MediaRecorder
 * @param mimeType - MIME type of the audio
 * @returns Transcribed text
 */
export async function transcribeAudio(
  audioBlob: Blob,
  mimeType: string = 'audio/webm'
): Promise<string> {
  try {
    // Convert blob to base64
    const base64Audio = await blobToBase64(audioBlob)
    
    // Remove data URL prefix if present
    const base64Data = base64Audio.includes(',') 
      ? base64Audio.split(',')[1] 
      : base64Audio

    const response = await apiClient.post<TranscribeResponse>('/voice/transcribe', {
      audio: base64Data,
      mimeType,
    })

    if (!response.data.success || !response.data.text) {
      throw new Error(response.data.error || 'Failed to transcribe audio')
    }

    return response.data.text
  } catch (error) {
    console.error('Error transcribing audio:', error)
    throw error instanceof Error ? error : new Error('Failed to transcribe audio')
  }
}

/**
 * Convert blob to base64 string
 */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to convert blob to base64'))
      }
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

