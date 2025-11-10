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
  private startTime: number = 0

  constructor(options: AudioCaptureOptions = {}) {
    this.options = {
      mimeType: options.mimeType || 'audio/webm;codecs=opus',
      sampleRate: options.sampleRate || 48000,
      ...options,
    }
  }

  /**
   * Check if running on iOS
   */
  private isIOS(): boolean {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
           (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }

  /**
   * Request microphone permission and start recording
   */
  async startRecording(): Promise<void> {
    try {
      console.log('[AudioCapture] Starting recording...')
      
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

      console.log('[AudioCapture] Microphone access granted')
      console.log('[AudioCapture] Audio tracks:', this.mediaStream.getAudioTracks().length)
      
      // Log track info
      this.mediaStream.getAudioTracks().forEach((track, index) => {
        console.log(`[AudioCapture] Track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: track.getSettings(),
        })
      })

      // Find supported MIME type
      const supportedMimeType = this.getSupportedMimeType()
      console.log('[AudioCapture] Supported MIME type:', supportedMimeType)
      
      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType: supportedMimeType,
        audioBitsPerSecond: 128000,
      })

      this.audioChunks = []
      this.startTime = Date.now()

      // Handle data available
      this.mediaRecorder.ondataavailable = (event) => {
        console.log('[AudioCapture] Data available:', {
          size: event.data.size,
          type: event.data.type,
          chunks: this.audioChunks.length,
        })
        
        if (event.data.size > 0) {
          this.audioChunks.push(event.data)
          if (this.options.onDataAvailable) {
            this.options.onDataAvailable(event.data)
          }
        } else {
          console.warn('[AudioCapture] Received empty data chunk')
        }
      }

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('[AudioCapture] MediaRecorder error:', event)
        const error = new Error('MediaRecorder error')
        if (this.options.onError) {
          this.options.onError(error)
        }
      }

      // Handle start event
      this.mediaRecorder.onstart = () => {
        console.log('[AudioCapture] Recording started, state:', this.mediaRecorder?.state)
      }

      // Handle stop event
      this.mediaRecorder.onstop = () => {
        console.log('[AudioCapture] Recording stopped')
        console.log('[AudioCapture] Total chunks:', this.audioChunks.length)
        console.log('[AudioCapture] Total size:', this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0))
      }

      // Start recording
      // iOS Safari works better without timeslice or with larger timeslice
      const timeslice = this.isIOS() ? undefined : 100
      console.log('[AudioCapture] Starting with timeslice:', timeslice)
      this.mediaRecorder.start(timeslice)
      
      // Verify recording started
      setTimeout(() => {
        if (this.mediaRecorder) {
          console.log('[AudioCapture] Recording state after start:', this.mediaRecorder.state)
          if (this.mediaRecorder.state !== 'recording') {
            console.error('[AudioCapture] Recording did not start properly!')
          }
        }
      }, 100)
      
    } catch (error) {
      console.error('[AudioCapture] Error starting recording:', error)
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
      if (!this.mediaRecorder) {
        reject(new Error('MediaRecorder is not initialized'))
        return
      }

      const currentState = this.mediaRecorder.state
      console.log('[AudioCapture] Stopping recording, current state:', currentState)
      console.log('[AudioCapture] Recording duration:', Date.now() - this.startTime, 'ms')
      console.log('[AudioCapture] Current chunks:', this.audioChunks.length)

      if (currentState === 'inactive') {
        // Already stopped, try to return what we have
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
          })
          console.log('[AudioCapture] Returning existing blob, size:', audioBlob.size)
          this.cleanup()
          resolve(audioBlob)
        } else {
          // Return empty blob instead of rejecting
          const audioBlob = new Blob([], {
            type: this.mediaRecorder?.mimeType || 'audio/webm',
          })
          console.log('[AudioCapture] Returning empty blob (inactive state)')
          this.cleanup()
          resolve(audioBlob)
        }
        return
      }

      // Set timeout to prevent hanging
      let timeoutCleared = false
      const timeout = setTimeout(() => {
        if (!timeoutCleared) {
          console.error('[AudioCapture] Stop timeout - forcing cleanup')
          timeoutCleared = true
          if (this.audioChunks.length > 0) {
            const audioBlob = new Blob(this.audioChunks, {
              type: this.mediaRecorder?.mimeType || 'audio/webm',
            })
            this.cleanup()
            resolve(audioBlob)
          } else {
            this.cleanup()
            reject(new Error('Timeout waiting for recording to stop'))
          }
        }
      }, 5000) // 5 second timeout

      // Set up stop handler
      this.mediaRecorder.onstop = () => {
        timeoutCleared = true
        clearTimeout(timeout)
        
        console.log('[AudioCapture] onstop fired')
        console.log('[AudioCapture] Final chunks count:', this.audioChunks.length)
        console.log('[AudioCapture] Total size:', this.audioChunks.reduce((sum, chunk) => sum + chunk.size, 0))

        // For iOS, request final data if needed
        if (this.isIOS() && this.audioChunks.length === 0) {
          console.warn('[AudioCapture] No chunks collected on iOS, this may indicate a problem')
        }

        // Combine all chunks into a single blob
        const audioBlob = new Blob(this.audioChunks, {
          type: this.mediaRecorder?.mimeType || 'audio/webm',
        })
        
        console.log('[AudioCapture] Final blob size:', audioBlob.size, 'bytes')
        console.log('[AudioCapture] Final blob type:', audioBlob.type)
        
        // Stop all tracks
        this.cleanup()
        
        resolve(audioBlob)
      }

      // Stop recording
      try {
        this.mediaRecorder.stop()
        console.log('[AudioCapture] stop() called')
      } catch (error) {
        clearTimeout(timeout)
        console.error('[AudioCapture] Error calling stop():', error)
        reject(error instanceof Error ? error : new Error('Failed to stop recording'))
      }
    })
  }

  /**
   * Cleanup resources
   */
  private cleanup(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => {
        track.stop()
        console.log('[AudioCapture] Stopped track:', track.label)
      })
      this.mediaStream = null
    }
    this.mediaRecorder = null
    this.audioChunks = []
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
    console.log('[AudioCapture] stop() called (cleanup)')
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop()
      } catch (error) {
        console.error('[AudioCapture] Error stopping recorder:', error)
      }
    }
    this.cleanup()
  }

  /**
   * Get supported MIME type
   */
  private getSupportedMimeType(): string {
    // iOS Safari typically supports mp4/aac
    const preferredTypes = this.isIOS() 
      ? [
          'audio/mp4',
          'audio/mp4;codecs=mp4a.40.2',
          'audio/aac',
          'audio/webm',
          'audio/webm;codecs=opus',
        ]
      : [
          'audio/webm;codecs=opus',
          'audio/webm',
          'audio/ogg;codecs=opus',
          'audio/mp4',
          'audio/wav',
        ]

    for (const mimeType of preferredTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        console.log('[AudioCapture] Selected MIME type:', mimeType)
        return mimeType
      }
    }

    // Fallback to default (empty string lets browser choose)
    console.warn('[AudioCapture] No preferred MIME type supported, using default')
    return ''
  }

  /**
   * Get current MIME type
   */
  getMimeType(): string {
    return this.mediaRecorder?.mimeType || 'audio/webm'
  }
}

