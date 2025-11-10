import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AudioCapture } from '../services/voice/audioCapture'
import { transcribeAudio } from '../services/voice/stt'
import { synthesizeSpeechStream, stopAudio } from '../services/voice/tts'

export const useVoiceStore = defineStore('voice', () => {
  // State
  const isVoiceModeActive = ref(false)
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const audioCapture = ref<AudioCapture | null>(null)
  const error = ref<string | null>(null)
  const hasUserInteracted = ref(false) // Track if user has interacted (for autoplay policy)

  // Getters
  const canStartListening = computed(() => isVoiceModeActive.value && !isListening.value && !isSpeaking.value)

  // Actions
  function setVoiceModeActive(active: boolean) {
    isVoiceModeActive.value = active
    // Mark user interaction when activating voice mode (click counts as interaction)
    if (active) {
      hasUserInteracted.value = true
    }
    if (!active) {
      stopListening()
      stopSpeaking()
    }
  }

  function markUserInteraction() {
    hasUserInteracted.value = true
  }

  async function startListening(): Promise<void> {
    if (isListening.value || isSpeaking.value) {
      console.log('[VoiceStore] Already listening or speaking, skipping')
      return
    }

    try {
      console.log('[VoiceStore] Starting listening...')
      error.value = null
      isListening.value = true

      const capture = new AudioCapture({
        onError: (err) => {
          console.error('[VoiceStore] AudioCapture error:', err)
          error.value = err.message
          isListening.value = false
        },
      })

      audioCapture.value = capture
      await capture.startRecording()
      console.log('[VoiceStore] Listening started successfully')
    } catch (err) {
      console.error('[VoiceStore] Error starting listening:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to start listening'
      
      // Provide more user-friendly error messages
      if (errorMessage.includes('Permission denied') || errorMessage.includes('NotAllowedError')) {
        error.value = 'Permissão do microfone negada. Por favor, permita o acesso ao microfone nas configurações.'
      } else if (errorMessage.includes('NotFoundError') || errorMessage.includes('No microphone')) {
        error.value = 'Nenhum microfone encontrado. Por favor, verifique se há um microfone conectado.'
      } else {
        error.value = errorMessage
      }
      
      isListening.value = false
      throw err
    }
  }

  async function stopListening(): Promise<string | null> {
    console.log('[VoiceStore] stopListening called')
    
    if (!audioCapture.value) {
      console.warn('[VoiceStore] No audio capture instance')
      // If no capture instance, just reset state
      isListening.value = false
      return null
    }

    try {
      console.log('[VoiceStore] Stopping recording...')
      const audioBlob = await audioCapture.value.stopRecording()
      const mimeType = audioCapture.value.getMimeType()
      
      console.log('[VoiceStore] Recording stopped, blob size:', audioBlob.size, 'bytes')
      console.log('[VoiceStore] MIME type:', mimeType)
      
      // Transcribe audio
      console.log('[VoiceStore] Transcribing audio...')
      const text = await transcribeAudio(audioBlob, mimeType)
      
      console.log('[VoiceStore] Transcription result:', text)
      
      audioCapture.value = null
      isListening.value = false
      
      return text.trim() || null
    } catch (err) {
      console.error('[VoiceStore] Error stopping listening:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to stop listening'
      
      // Provide more user-friendly error messages
      if (errorMessage.includes('Timeout')) {
        error.value = 'Tempo limite excedido ao parar a gravação. Por favor, tente novamente.'
      } else {
        error.value = errorMessage
      }
      
      // Clean up on error
      if (audioCapture.value) {
        try {
          audioCapture.value.stop()
        } catch (cleanupError) {
          console.error('[VoiceStore] Error during cleanup:', cleanupError)
          // Ignore cleanup errors
        }
        audioCapture.value = null
      }
      isListening.value = false
      throw err
    }
  }

  async function speak(text: string): Promise<void> {
    if (isSpeaking.value) {
      // Stop current audio if speaking
      stopSpeaking()
    }

    try {
      error.value = null
      isSpeaking.value = true

      // Synthesize speech with streaming
      const audioUrl = await synthesizeSpeechStream(
        text,
        {
          model: 'eleven_turbo_v2_5', // Low latency model
        },
        () => {
          // Optional: handle streaming chunks if needed
          // For now, we'll just wait for the full audio
        }
      )

      // Create audio element with playsinline attribute for mobile Safari
      // This is required for autoplay to work on iOS devices
      const audio = document.createElement('audio')
      audio.src = audioUrl
      audio.setAttribute('playsinline', '')
      audio.setAttribute('webkit-playsinline', '') // For older iOS versions
      audio.preload = 'auto'
      currentAudio.value = audio

      audio.onended = () => {
        // Clean up
        URL.revokeObjectURL(audioUrl)
        currentAudio.value = null
        isSpeaking.value = false
      }

      audio.onerror = (event) => {
        const errorMsg = 'Failed to play audio'
        console.error('[VoiceStore] Audio playback error:', event)
        error.value = errorMsg
        isSpeaking.value = false
        currentAudio.value = null
        URL.revokeObjectURL(audioUrl)
      }

      // Try to play audio
      try {
        // Only attempt autoplay if user has interacted
        if (!hasUserInteracted.value) {
          throw new Error('User interaction required to play audio')
        }
        
        await audio.play()
      } catch (playError) {
        // Handle autoplay policy errors
        const errorMsg = playError instanceof Error 
          ? playError.message 
          : 'Failed to play audio'
        
        // Check if it's an autoplay policy error
        const isAutoplayError = errorMsg.includes('play') || 
                                errorMsg.includes('user interaction') ||
                                errorMsg.includes('NotAllowedError') ||
                                errorMsg.includes('User interaction required')
        
        if (isAutoplayError) {
          // Don't show error immediately - try to recover when user interacts
          console.warn('[VoiceStore] Autoplay blocked, will retry on next user interaction')
          error.value = null // Clear error, we'll retry later
          
          // Store the audio URL to retry later
          // Clean up current attempt but keep the audio ready
          URL.revokeObjectURL(audioUrl)
          currentAudio.value = null
          isSpeaking.value = false
          
          // Return without throwing - this allows the caller to handle gracefully
          return
        } else {
          error.value = errorMsg
        }
        
        // Clean up
        URL.revokeObjectURL(audioUrl)
        currentAudio.value = null
        isSpeaking.value = false
        
        throw playError instanceof Error ? playError : new Error(errorMsg)
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to speak'
      error.value = errorMsg
      isSpeaking.value = false
      currentAudio.value = null
      
      // Log error with better serialization
      console.error('[VoiceStore] Error in speak function:', {
        message: errorMsg,
        error: err instanceof Error ? {
          name: err.name,
          message: err.message,
          stack: err.stack
        } : err
      })
      
      throw err
    }
  }

  function stopSpeaking(): void {
    if (currentAudio.value) {
      stopAudio(currentAudio.value)
      currentAudio.value = null
    }
    isSpeaking.value = false
  }

  function clearError(): void {
    error.value = null
  }

  // Cleanup on store destruction
  function cleanup(): void {
    if (audioCapture.value) {
      audioCapture.value.stop()
      audioCapture.value = null
    }
    stopSpeaking()
    isVoiceModeActive.value = false
    isListening.value = false
  }

  return {
    // State
    isVoiceModeActive,
    isListening,
    isSpeaking,
    currentAudio,
    error,
    hasUserInteracted,
    // Getters
    canStartListening,
    // Actions
    setVoiceModeActive,
    markUserInteraction,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearError,
    cleanup,
  }
})

