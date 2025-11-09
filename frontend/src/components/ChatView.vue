<template>
  <div class="chat-container">
    <div class="chat-header">
      <h1>Dark Stories</h1>
      <p class="subtitle">AI Narrator - Converse e crie histórias escuras</p>
      <button v-if="chatStore.hasMessages" @click="handleClearChat" class="clear-btn">
        Limpar Chat
      </button>
    </div>

    <div ref="messagesContainer" class="messages-container">
      <div v-if="!chatStore.hasMessages" class="welcome-message">
        <p>Olá! Sou seu narrador de histórias escuras.</p>
        <p>Comece uma conversa e eu criarei histórias atmosféricas e envolventes para você.</p>
      </div>

      <div
        v-for="(message, index) in chatStore.messages"
        :key="index"
        :class="['message', `message-${message.role}`]"
      >
        <div class="message-content">
          <div class="message-text" v-html="formatMessage(message.content)"></div>
          <div v-if="message.timestamp" class="message-time">
            {{ formatTime(message.timestamp) }}
          </div>
        </div>
      </div>

      <div v-if="chatStore.isLoading && !chatStore.isStreaming" class="loading-indicator">
        <div class="spinner"></div>
        <span>Pensando...</span>
      </div>

      <div v-if="chatStore.error" class="error-message">
        <p>Erro: {{ chatStore.error }}</p>
      </div>
    </div>

    <div class="input-container">
      <!-- Voice mode button (centered) -->
      <div class="voice-controls">
        <button
          @click="toggleVoiceMode"
          :class="['voice-btn', { active: voiceStore.isVoiceModeActive, listening: voiceStore.isListening, speaking: voiceStore.isSpeaking }]"
          :disabled="chatStore.isLoading"
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
          <svg v-else class="voice-icon" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="23"></line>
            <line x1="8" y1="23" x2="16" y2="23"></line>
          </svg>
        </button>
        <p v-if="voiceStore.isVoiceModeActive" class="voice-status">
          <span v-if="voiceStore.isListening">Gravando... Clique para parar</span>
          <span v-else-if="voiceStore.isSpeaking">Falando...</span>
          <span v-else>Clique para falar</span>
        </p>
      </div>

      <!-- Text input (hidden when voice mode is active) -->
      <form v-if="!voiceStore.isVoiceModeActive" @submit.prevent="handleSendMessage" class="input-form">
        <textarea
          v-model="inputMessage"
          @keydown.enter.exact.prevent="handleSendMessage"
          @keydown.shift.enter.exact.prevent="inputMessage += '\n'"
          @input="handleInputResize"
          placeholder="Digite sua mensagem..."
          :disabled="chatStore.isLoading"
          class="message-input"
          rows="1"
          ref="inputRef"
        ></textarea>
        <button
          type="submit"
          :disabled="!inputMessage.trim() || chatStore.isLoading"
          class="send-btn"
        >
          <span v-if="!chatStore.isLoading">Enviar</span>
          <span v-else>...</span>
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, nextTick, watch, onMounted, onUnmounted } from 'vue'
import { useChatStore } from '../stores/chat'
import { useVoiceStore } from '../stores/voice'

const chatStore = useChatStore()
const voiceStore = useVoiceStore()
const inputMessage = ref('')
const messagesContainer = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLTextAreaElement | null>(null)

const handleInputResize = () => {
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
    inputRef.value.style.height = `${Math.min(inputRef.value.scrollHeight, 150)}px`
  }
}

const handleSendMessage = async () => {
  if (!inputMessage.value.trim() || chatStore.isLoading) {
    return
  }

  const message = inputMessage.value.trim()
  inputMessage.value = ''
  
  // Reset textarea height
  if (inputRef.value) {
    inputRef.value.style.height = 'auto'
  }

  await chatStore.sendChatMessage(message, true)
  
  // Auto-scroll to bottom after message is sent
  await nextTick()
  scrollToBottom()
}

const handleClearChat = () => {
  if (confirm('Tem certeza que deseja limpar o chat?')) {
    chatStore.clearChat()
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const formatMessage = (content: string): string => {
  // Simple markdown-like formatting
  return content
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
}

const formatTime = (timestamp: string): string => {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

// Auto-scroll when new messages arrive
watch(
  () => chatStore.messages.length,
  () => {
    nextTick(() => {
      scrollToBottom()
    })
  }
)

// Auto-scroll during streaming
watch(
  () => chatStore.lastMessage?.content,
  () => {
    if (chatStore.isStreaming) {
      scrollToBottom()
    }
  }
)

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
          await nextTick()
          scrollToBottom()
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

// Removed automatic restart of listening - user must click to speak again

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

// Focus input on mount
onMounted(() => {
  if (inputRef.value && !voiceStore.isVoiceModeActive) {
    inputRef.value.focus()
  }
  scrollToBottom()
})

// Cleanup on unmount
onUnmounted(() => {
  voiceStore.cleanup()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  max-width: 900px;
  margin: 0 auto;
  background: #1a1a1a;
  color: #e0e0e0;
}

.chat-header {
  padding: 1.5rem;
  border-bottom: 1px solid #333;
  background: #222;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.chat-header h1 {
  margin: 0;
  font-size: 1.8rem;
  color: #fff;
}

.subtitle {
  margin: 0;
  font-size: 0.9rem;
  color: #999;
}

.clear-btn {
  align-self: flex-start;
  margin-top: 0.5rem;
  padding: 0.5rem 1rem;
  background: #444;
  color: #fff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: #555;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.messages-container::-webkit-scrollbar {
  width: 8px;
}

.messages-container::-webkit-scrollbar-track {
  background: #1a1a1a;
}

.messages-container::-webkit-scrollbar-thumb {
  background: #444;
  border-radius: 4px;
}

.messages-container::-webkit-scrollbar-thumb:hover {
  background: #555;
}

.welcome-message {
  text-align: center;
  padding: 3rem 1rem;
  color: #999;
  line-height: 1.6;
}

.message {
  display: flex;
  flex-direction: column;
  max-width: 80%;
  animation: fadeIn 0.3s ease-in;
}

.message-user {
  align-self: flex-end;
}

.message-assistant {
  align-self: flex-start;
}

.message-content {
  padding: 1rem 1.25rem;
  border-radius: 12px;
  line-height: 1.6;
}

.message-user .message-content {
  background: #2d5aa0;
  color: #fff;
  border-bottom-right-radius: 4px;
}

.message-assistant .message-content {
  background: #2a2a2a;
  color: #e0e0e0;
  border-bottom-left-radius: 4px;
}

.message-text {
  word-wrap: break-word;
  white-space: pre-wrap;
}

.message-text :deep(strong) {
  font-weight: 600;
}

.message-text :deep(em) {
  font-style: italic;
}

.message-time {
  font-size: 0.75rem;
  margin-top: 0.5rem;
  opacity: 0.7;
}

.loading-indicator {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  color: #999;
  font-size: 0.9rem;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #444;
  border-top-color: #2d5aa0;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-message {
  padding: 1rem;
  background: #4a1f1f;
  color: #ff6b6b;
  border-radius: 8px;
  border: 1px solid #6a2f2f;
}

.input-container {
  padding: 1.5rem;
  border-top: 1px solid #333;
  background: #222;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.voice-controls {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.voice-btn {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  border: 3px solid #444;
  background: #2a2a2a;
  color: #e0e0e0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  position: relative;
}

.voice-btn:hover:not(:disabled) {
  border-color: #2d5aa0;
  background: #333;
  transform: scale(1.05);
}

.voice-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.voice-btn.active {
  border-color: #2d5aa0;
  background: #2d5aa0;
  color: #fff;
}

.voice-btn.listening {
  border-color: #ff6b6b;
  background: #ff6b6b;
  animation: pulse 1.5s ease-in-out infinite;
}

.voice-btn.speaking {
  border-color: #4ecdc4;
  background: #4ecdc4;
  animation: pulse 1s ease-in-out infinite;
}

.voice-icon {
  width: 32px;
  height: 32px;
}

.voice-icon.listening .pulse {
  animation: pulse-circle 1.5s ease-in-out infinite;
}

.voice-status {
  margin: 0;
  font-size: 0.9rem;
  color: #999;
  text-align: center;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(45, 90, 160, 0.7);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(45, 90, 160, 0);
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

.input-form {
  display: flex;
  gap: 0.75rem;
  align-items: flex-end;
}

.message-input {
  flex: 1;
  padding: 0.75rem 1rem;
  background: #2a2a2a;
  color: #e0e0e0;
  border: 1px solid #444;
  border-radius: 8px;
  font-family: inherit;
  font-size: 1rem;
  resize: none;
  min-height: 44px;
  max-height: 150px;
  overflow-y: auto;
  transition: border-color 0.2s;
}

.message-input:focus {
  outline: none;
  border-color: #2d5aa0;
}

.message-input:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.message-input::placeholder {
  color: #666;
}

.send-btn {
  padding: 0.75rem 1.5rem;
  background: #2d5aa0;
  color: #fff;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  min-width: 80px;
}

.send-btn:hover:not(:disabled) {
  background: #3d6ab0;
}

.send-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Responsive */
@media (max-width: 768px) {
  .chat-container {
    height: 100vh;
  }

  .message {
    max-width: 90%;
  }

  .chat-header h1 {
    font-size: 1.5rem;
  }
}
</style>

