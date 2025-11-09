<template>
  <div class="chat-container" :class="{ 'sidebar-open': sidebarOpen }">
    <!-- Stories Sidebar -->
    <div class="stories-sidebar" :class="{ 'sidebar-open': sidebarOpen }">
      <div class="sidebar-header">
        <h2>Stories</h2>
        <button @click="sidebarOpen = !sidebarOpen" class="toggle-sidebar-btn">
          <svg v-if="sidebarOpen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M18 6L6 18M6 6l12 12"></path>
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12h18M3 6h18M3 18h18"></path>
          </svg>
        </button>
      </div>
      <div v-if="sidebarOpen" class="sidebar-content">
        <div v-if="loadingStories" class="loading-stories">
          <div class="spinner-small"></div>
          <span>Loading stories...</span>
        </div>
        <div v-else-if="storiesError" class="stories-error">
          <p>Error loading stories: {{ storiesError }}</p>
        </div>
        <div v-else-if="stories.length === 0" class="no-stories">
          <p>No stories available</p>
        </div>
        <div v-else class="stories-list">
          <div
            v-for="story in stories"
            :key="story.id"
            :class="['story-item', { completed: isCompleted(story.id) }]"
          >
            <div class="story-header">
              <h3 class="story-title">{{ story.title }}</h3>
              <span v-if="isCompleted(story.id)" class="completed-badge">✓</span>
            </div>
            <p class="story-description">{{ story.description }}</p>
            <div class="story-meta">
              <span class="story-difficulty" :class="story.difficulty">{{ story.difficulty }}</span>
              <span class="story-category">{{ story.category }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Floating Toggle Button (when sidebar is closed) -->
    <button
      v-if="!sidebarOpen"
      @click="sidebarOpen = true"
      class="floating-toggle-btn"
      type="button"
      title="Show Stories"
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M3 12h18M3 6h18M3 18h18"></path>
      </svg>
    </button>

    <!-- Voice Circle -->
    <div class="voice-circle-wrapper">
      <button
        @click="toggleVoiceMode"
        :class="['voice-circle', { 
          active: voiceStore.isVoiceModeActive, 
          listening: voiceStore.isListening, 
          speaking: voiceStore.isSpeaking,
          thinking: chatStore.isLoading || chatStore.isStreaming
        }]"
        :disabled="chatStore.isLoading && !voiceStore.isListening && !voiceStore.isSpeaking"
        type="button"
      >
        <svg v-if="!voiceStore.isVoiceModeActive" class="voice-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
        <svg v-else-if="voiceStore.isListening" class="voice-icon listening" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="3" class="pulse"></circle>
        </svg>
        <svg v-else-if="voiceStore.isSpeaking" class="voice-icon speaking" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
        </svg>
        <svg v-else-if="chatStore.isLoading || chatStore.isStreaming" class="voice-icon thinking" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"></circle>
          <circle cx="12" cy="12" r="3"></circle>
        </svg>
        <svg v-else class="voice-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
          <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
          <line x1="12" y1="19" x2="12" y2="23"></line>
          <line x1="8" y1="23" x2="16" y2="23"></line>
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'
import { useVoiceStore } from '../stores/voice'
import { getStories } from '../services/api/stories'
import type { Story } from '../services/api/stories'

const chatStore = useChatStore()
const voiceStore = useVoiceStore()

// Stories sidebar state
const sidebarOpen = ref(true)
const stories = ref<Story[]>([])
const loadingStories = ref(false)
const storiesError = ref<string | null>(null)

// Check if a story is completed
const isCompleted = (storyId: string): boolean => {
  return chatStore.gameSession.completedStoryIds.includes(storyId)
}

// Load stories on mount
onMounted(async () => {
  await loadStories()
  
  // Watch for changes in completed stories to update the UI
  watch(
    () => chatStore.gameSession.completedStoryIds,
    () => {
      // Stories list will automatically update due to reactivity
    }
  )
})

// Load stories from API
const loadStories = async () => {
  loadingStories.value = true
  storiesError.value = null
  try {
    stories.value = await getStories()
  } catch (error) {
    storiesError.value = error instanceof Error ? error.message : 'Failed to load stories'
    console.error('Error loading stories:', error)
  } finally {
    loadingStories.value = false
  }
}

// Voice mode handlers
const toggleVoiceMode = async () => {
  if (voiceStore.isVoiceModeActive) {
    // If currently listening, stop and process
    if (voiceStore.isListening) {
      try {
        const transcribedText = await voiceStore.stopListening()
        if (transcribedText && transcribedText.trim()) {
          // Send the transcribed message
          await chatStore.sendChatMessage(transcribedText, true)
        }
        // Keep voice mode active but DON'T restart listening automatically
        // User needs to click again to speak
      } catch (error) {
        console.error('Error handling voice input:', error)
        // Only deactivate if it's a critical error (not just empty transcription)
        if (error instanceof Error && !error.message.includes('empty')) {
          voiceStore.setVoiceModeActive(false)
        }
      }
    } else if (voiceStore.isSpeaking) {
      // If speaking, stop the audio
      voiceStore.stopSpeaking()
    } else {
      // Not listening and not speaking - start listening
      try {
        await voiceStore.startListening()
      } catch (error) {
        console.error('Failed to start listening:', error)
        voiceStore.setVoiceModeActive(false)
      }
    }
  } else {
    // Activate voice mode but DON'T start listening automatically
    // User needs to click to start speaking
    voiceStore.setVoiceModeActive(true)
    voiceStore.clearError()
  }
}

// Track the last message we've spoken to avoid duplicate playback
const lastSpokenMessageId = ref<string | null>(null)

// Auto-play audio when assistant message arrives (if voice mode is active)
// Watch both lastMessage content and streaming state to ensure we only play after streaming completes
watch(
  () => [chatStore.lastMessage?.content, chatStore.isStreaming, chatStore.isLoading, chatStore.lastMessage?.timestamp],
  async ([, isStreaming, isLoading, timestamp]) => {
    const message = chatStore.lastMessage
    const messageId: string | null = (timestamp && typeof timestamp === 'string') 
      ? timestamp 
      : (message ? `${message.role}-${message.content.slice(0, 20)}` : null)
    
    // Only play audio if:
    // 1. Message exists and is from assistant
    // 2. Voice mode is active
    // 3. Not currently speaking
    // 4. Message has content
    // 5. Streaming has finished (not streaming and not loading)
    // 6. We haven't already spoken this message
    if (
      message &&
      message.role === 'assistant' &&
      voiceStore.isVoiceModeActive &&
      !voiceStore.isSpeaking &&
      message.content.trim() &&
      !isStreaming &&
      !isLoading &&
      messageId !== lastSpokenMessageId.value
    ) {
      try {
        lastSpokenMessageId.value = messageId
        await voiceStore.speak(message.content)
        // After speaking, DON'T restart listening automatically
        // User needs to click again to speak
      } catch (error) {
        console.error('Error speaking message:', error)
      }
    }
  },
  { immediate: false }
)

// Cleanup on unmount
onUnmounted(() => {
  voiceStore.cleanup()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  width: 100vw;
  background: #1a1a1a;
  color: #e0e0e0;
  position: relative;
}

/* Stories Sidebar */
.stories-sidebar {
  position: fixed;
  left: 0;
  top: 0;
  height: 100vh;
  width: 350px;
  background: #222;
  border-right: 1px solid #333;
  display: flex;
  flex-direction: column;
  z-index: 100;
  transition: transform 0.3s ease;
}

.stories-sidebar:not(.sidebar-open) {
  transform: translateX(-100%);
}

.sidebar-header {
  padding: 1.5rem;
  border-bottom: 1px solid #333;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #2a2a2a;
}

.sidebar-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: #fff;
}

.toggle-sidebar-btn {
  background: transparent;
  border: none;
  color: #e0e0e0;
  cursor: pointer;
  padding: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: background 0.2s;
}

.toggle-sidebar-btn:hover {
  background: #333;
}

.toggle-sidebar-btn svg {
  width: 24px;
  height: 24px;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.sidebar-content::-webkit-scrollbar {
  width: 8px;
}

.sidebar-content::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.sidebar-content::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.sidebar-content::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.loading-stories,
.stories-error,
.no-stories {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  color: #999;
  text-align: center;
}

.loading-stories {
  gap: 1rem;
}

.spinner-small {
  width: 24px;
  height: 24px;
  border: 2px solid #444;
  border-top-color: #2d5aa0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.stories-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.story-item {
  padding: 1rem;
  background: #2a2a2a;
  border-radius: 8px;
  border: 1px solid #333;
  transition: all 0.2s;
}

.story-item:hover {
  background: #333;
  border-color: #444;
}

.story-item.completed {
  opacity: 0.7;
  border-color: #4ecdc4;
}

.story-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.5rem;
}

.story-title {
  margin: 0;
  font-size: 1.1rem;
  font-weight: 600;
  color: #fff;
  flex: 1;
}

.completed-badge {
  background: #4ecdc4;
  color: #1a1a1a;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.story-description {
  margin: 0.5rem 0;
  color: #ccc;
  font-size: 0.9rem;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.story-meta {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex-wrap: wrap;
}

.story-difficulty {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-transform: uppercase;
}

.story-difficulty.easy {
  background: #2d5aa0;
  color: #fff;
}

.story-difficulty.medium {
  background: #ffa500;
  color: #1a1a1a;
}

.story-difficulty.hard {
  background: #ff6b6b;
  color: #fff;
}

.story-category {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  background: #444;
  color: #ccc;
}

.voice-circle-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  margin-left: 0;
  transition: margin-left 0.3s ease;
  padding-left: 0;
}

.chat-container.sidebar-open .voice-circle-wrapper {
  margin-left: 350px;
}

.floating-toggle-btn {
  position: fixed;
  top: 1rem;
  left: 1rem;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #2d5aa0;
  color: #fff;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 99;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}

.floating-toggle-btn:hover {
  background: #3d6ab0;
  transform: scale(1.1);
}

.floating-toggle-btn svg {
  width: 24px;
  height: 24px;
}

.voice-circle {
  width: 160px;
  height: 160px;
  border-radius: 50%;
  border: 4px solid #444;
  background: #2a2a2a;
  color: #e0e0e0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
  padding: 0;
  margin: 0;
}

.voice-circle:hover:not(:disabled) {
  border-color: #2d5aa0;
  background: #333;
  transform: scale(1.05);
}

.voice-circle:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-circle.active {
  border-color: #2d5aa0;
  background: #2d5aa0;
  color: #fff;
}

.voice-circle.listening {
  border-color: #ff6b6b;
  background: #ff6b6b;
  animation: pulse-listening 1.5s ease-in-out infinite;
}

.voice-circle.speaking {
  border-color: #4ecdc4;
  background: #4ecdc4;
  animation: pulse-speaking 1s ease-in-out infinite;
}

.voice-circle.thinking {
  border-color: #2d5aa0;
  background: #2d5aa0;
  animation: float-thinking 2s ease-in-out infinite;
}

.voice-icon {
  width: 64px;
  height: 64px;
  transition: transform 0.3s ease;
}

.voice-icon.listening .pulse {
  animation: pulse-circle 1.5s ease-in-out infinite;
}

.voice-icon.thinking {
  animation: spin-thinking 1.5s linear infinite;
}

@keyframes pulse-listening {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(255, 107, 107, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 20px rgba(255, 107, 107, 0);
  }
}

@keyframes pulse-speaking {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(78, 205, 196, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 20px rgba(78, 205, 196, 0);
  }
}

@keyframes float-thinking {
  0%, 100% {
    transform: translateY(0px) scale(1);
  }
  50% {
    transform: translateY(-10px) scale(1.02);
  }
}

@keyframes pulse-circle {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(1.2);
  }
}

@keyframes spin-thinking {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

/* Responsive */
@media (max-width: 768px) {
  .voice-circle {
    width: 140px;
    height: 140px;
  }

  .voice-icon {
    width: 56px;
    height: 56px;
  }
}
</style>

