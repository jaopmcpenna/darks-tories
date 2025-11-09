/**
 * Audio capture service using MediaRecorder API
 */

export interface AudioCaptureOptions {
  mimeType?: string
  sampleRate?: number
  onDataAvailable?: (chunk: Blob) => void
  onError?: (error: Error) => void
}

export class AudioCapture {
  private mediaRecorder: MediaRecorder | null = null
  private mediaStream: MediaStream | null = null
  private audioChunks: Blob[] = []
  private options: AudioCaptureOptions

  constructor(options: AudioCaptureOptions = {}) {
    this.options = {
      mimeType: options.mimeType || 'audio/webm;codecs=opus',
      sampleRate: options.sampleRate || 48000,
      ...options,
    }
  }

  /**
   * Request microphone permission and start recording
   */
  async startRecording(): Promise<void> {
    try {
      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: this.options.sampleRate,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      })

      // Find supported MIME type
      const supportedMimeType = this.getSupportedMimeType()
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: supportedMimeType,
        audioBitsPerSecond: 128000,
      })

      this.audioChunks = []

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
          if (this.options.onDataAvailable) {
            this.options.onDataAvailable(event.data)
          }
        }
      }

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        const error = new Error('MediaRecorder error')
        if (this.options.onError) {
          this.options.onError(error)
        }
      }

      // Start recording
      this.mediaRecorder.start(100) // Collect data every 100ms
    } catch (error) {
      const err = error instanceof Error ? error : new Error('Failed to start recording')
      if (this.options.onError) {
        this.options.onError(err)
      }
      throw err
    }
  }

  /**
   * Stop recording and return audio blob
   */
  async stopRecording(): Promise<Blob> {
    return new Promise((resolve, reject) => {
      if (!this.mediaRecorder || this.mediaRecorder.state === 'inactive') {
        reject(new Error('Recording is not active'))
        return
      }

      this.mediaRecorder.onstop = () => {
        // Combine all chunks into a single blob
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        })
        
        // Stop all tracks
        if (this.mediaStream) {
          this.mediaStream.getTracks().forEach((track) => track.stop())
          this.mediaStream = null
        }

        this.mediaRecorder = null
        this.audioChunks = []
        
        resolve(audioBlob)
      }

      this.mediaRecorder.stop()
    })
  }

  /**
   * Check if recording is active
   */
  isRecording(): boolean {
    return this.mediaRecorder?.state === 'recording'
  }

  /**
   * Stop recording without returning blob (cleanup)
   */
  stop(): void {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      this.mediaRecorder.stop()
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop())
      this.mediaStream = null
    }
    this.mediaRecorder = null
    this.audioChunks = []
  }

  /**
   * Get supported MIME type
   */
  private getSupportedMimeType(): string {
    const preferredTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/mp4',
      'audio/wav',
    ]

    for (const mimeType of preferredTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType
      }
    }

    // Fallback to default
    return ''
  }

  /**
   * Get current MIME type
   */
  getMimeType(): string {
    return this.mediaRecorder?.mimeType || 'audio/webm'
  }
}

