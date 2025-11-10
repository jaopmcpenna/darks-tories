<template>
  <div class="onboarding-container">
    <div class="onboarding-card">
      <h1 class="onboarding-title">Welcome to Dark Stories</h1>
      <p class="onboarding-subtitle">Let's start by getting to know you</p>
      
      <form v-if="!nameSubmitted" @submit.prevent="handleSubmit" class="onboarding-form">
        <div class="input-group">
          <label for="user-name" class="input-label">What's your name?</label>
          <input
            id="user-name"
            v-model="name"
            type="text"
            placeholder="Enter your name"
            class="name-input"
            required
            autofocus
            :disabled="isSubmitting"
          />
        </div>
        
        <button
          type="submit"
          class="submit-btn"
          :disabled="!name.trim() || isSubmitting"
        >
          <span v-if="!isSubmitting">Start Your Adventure</span>
          <span v-else class="loading-text">Starting...</span>
        </button>
      </form>

      <div v-else class="welcome-section">
        <p class="welcome-message">Welcome, {{ savedName }}!</p>
        <button
          @click="playWelcomeMessage"
          class="play-btn"
          :disabled="isPlaying"
        >
          <svg v-if="!isPlaying" class="play-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <svg v-else class="play-icon spinning" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
          <span>{{ isPlaying ? 'Playing...' : 'Play Welcome Message' }}</span>
        </button>
        <p v-if="voiceStore.error" class="error-text">{{ voiceStore.error }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useUserStore } from '../stores/user'
import { useVoiceStore } from '../stores/voice'

const userStore = useUserStore()
const voiceStore = useVoiceStore()
const name = ref('')
const isSubmitting = ref(false)
const nameSubmitted = ref(false)
const savedName = ref('')
const isPlaying = ref(false)

const handleSubmit = () => {
  if (!name.value.trim() || isSubmitting.value) {
    return
  }
  
  isSubmitting.value = true
  
  // Don't save to localStorage yet - just store locally
  const trimmedName = name.value.trim()
  savedName.value = trimmedName
  
  // Small delay for better UX
  setTimeout(() => {
    isSubmitting.value = false
    nameSubmitted.value = true
  }, 300)
}

const playWelcomeMessage = async () => {
  if (isPlaying.value || !savedName.value) {
    return
  }

  try {
    isPlaying.value = true
    voiceStore.clearError()
    
    const welcomeText = `Boas vindas ao Dark Stories, ${savedName.value}`
    await voiceStore.speak(welcomeText)
    
    // After playing, save the name to localStorage so HomeView can show the main screen
    userStore.saveUserName(savedName.value)
  } catch (error) {
    console.error('Error playing welcome message:', error)
    // Even if there's an error, save the name so user can continue
    userStore.saveUserName(savedName.value)
  } finally {
    isPlaying.value = false
  }
}

// Watch for speaking state to update isPlaying
watch(() => voiceStore.isSpeaking, (speaking) => {
  if (!speaking) {
    isPlaying.value = false
  }
})
</script>

<style scoped>
.onboarding-container {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  width: 100vw;
  background: linear-gradient(135deg, #1a1a1a 0%, #2a2a2a 100%);
  padding: 2rem;
}

.onboarding-card {
  background: #222;
  border: 1px solid #333;
  border-radius: 16px;
  padding: 3rem;
  max-width: 500px;
  width: 100%;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
  animation: fade-in 0.5s ease-out;
}

@keyframes fade-in {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.onboarding-title {
  margin: 0 0 0.5rem 0;
  font-size: 2rem;
  font-weight: 700;
  color: #fff;
  text-align: center;
}

.onboarding-subtitle {
  margin: 0 0 2rem 0;
  font-size: 1rem;
  color: #999;
  text-align: center;
}

.onboarding-form {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #e0e0e0;
}

.name-input {
  width: 100%;
  padding: 1rem;
  background: #2a2a2a;
  border: 2px solid #333;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  transition: all 0.2s;
  box-sizing: border-box;
}

.name-input:focus {
  outline: none;
  border-color: #2d5aa0;
  background: #333;
}

.name-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.name-input::placeholder {
  color: #666;
}

.submit-btn {
  width: 100%;
  padding: 1rem;
  background: #2d5aa0;
  border: none;
  border-radius: 8px;
  color: #fff;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.submit-btn:hover:not(:disabled) {
  background: #3d6ab0;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(45, 90, 160, 0.4);
}

.submit-btn:active:not(:disabled) {
  transform: translateY(0);
}

.submit-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.loading-text {
  display: inline-block;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.welcome-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: fade-in 0.5s ease-out;
}

.welcome-message {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: #fff;
  text-align: center;
}

.play-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 2rem;
  background: #4ecdc4;
  border: none;
  border-radius: 8px;
  color: #1a1a1a;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.play-btn:hover:not(:disabled) {
  background: #5eddd4;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(78, 205, 196, 0.4);
}

.play-btn:active:not(:disabled) {
  transform: translateY(0);
}

.play-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.play-icon {
  width: 24px;
  height: 24px;
  flex-shrink: 0;
}

.play-icon.spinning {
  animation: spin-thinking 1.5s linear infinite;
}

@keyframes spin-thinking {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.error-text {
  margin: 0;
  padding: 0.75rem 1rem;
  background: rgba(255, 107, 107, 0.2);
  border: 1px solid #ff6b6b;
  border-radius: 8px;
  color: #ff6b6b;
  font-size: 0.875rem;
  text-align: center;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .onboarding-container {
    padding: 1rem;
  }
  
  .onboarding-card {
    padding: 2rem;
  }
  
  .onboarding-title {
    font-size: 1.5rem;
  }
}
</style>

