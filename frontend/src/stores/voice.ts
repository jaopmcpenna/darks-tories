import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { AudioCapture } from '../services/voice/audioCapture'
import { transcribeAudio } from '../services/voice/stt'
import { synthesizeSpeechStream, playAudio, stopAudio } from '../services/voice/tts'

export const useVoiceStore = defineStore('voice', () => {
  // State
  const isVoiceModeActive = ref(false)
  const isListening = ref(false)
  const isSpeaking = ref(false)
  const currentAudio = ref<HTMLAudioElement | null>(null)
  const audioCapture = ref<AudioCapture | null>(null)
  const error = ref<string | null>(null)

  // Getters
  const canStartListening = computed(() => isVoiceModeActive.value && !isListening.value && !isSpeaking.value)

  // Actions
  function setVoiceModeActive(active: boolean) {
    isVoiceModeActive.value = active
    if (!active) {
      stopListening()
      stopSpeaking()
    }
  }

  async function startListening(): Promise<void> {
    if (isListening.value || isSpeaking.value) {
      return
    }

    try {
      error.value = null
      isListening.value = true

      const capture = new AudioCapture({
        onError: (err) => {
          error.value = err.message
          isListening.value = false
        },
      })

      audioCapture.value = capture
      await capture.startRecording()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to start listening'
      isListening.value = false
      throw err
    }
  }

  async function stopListening(): Promise<string | null> {
    if (!audioCapture.value) {
      // If no capture instance, just reset state
      isListening.value = false
      return null
    }

    // Check if actually recording
    if (!audioCapture.value.isRecording()) {
      // Clean up and reset state
      audioCapture.value.stop()
      audioCapture.value = null
      isListening.value = false
      return null
    }

    try {
      const audioBlob = await audioCapture.value.stopRecording()
      const mimeType = audioCapture.value.getMimeType()
      
      // Transcribe audio
      const text = await transcribeAudio(audioBlob, mimeType)
      
      audioCapture.value = null
      isListening.value = false
      
      return text.trim() || null
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to stop listening'
      // Clean up on error
      if (audioCapture.value) {
        try {
          audioCapture.value.stop()
        } catch (cleanupError) {
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
        (chunk) => {
          // Optional: handle streaming chunks if needed
          // For now, we'll just wait for the full audio
        }
      )

      // Create audio element and play
      const audio = new Audio(audioUrl)
      currentAudio.value = audio

      audio.onended = () => {
        // Clean up
        URL.revokeObjectURL(audioUrl)
        currentAudio.value = null
        isSpeaking.value = false
      }

      audio.onerror = () => {
        error.value = 'Failed to play audio'
        isSpeaking.value = false
        currentAudio.value = null
        URL.revokeObjectURL(audioUrl)
      }

      await audio.play()
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to speak'
      isSpeaking.value = false
      currentAudio.value = null
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
    // Getters
    canStartListening,
    // Actions
    setVoiceModeActive,
    startListening,
    stopListening,
    speak,
    stopSpeaking,
    clearError,
    cleanup,
  }
})

