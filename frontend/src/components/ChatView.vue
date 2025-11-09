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
      <form @submit.prevent="handleSendMessage" class="input-form">
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
import { ref, nextTick, watch, onMounted } from 'vue'
import { useChatStore } from '../stores/chat'
import type { ChatMessage } from '../types'

const chatStore = useChatStore()
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

// Focus input on mount
onMounted(() => {
  if (inputRef.value) {
    inputRef.value.focus()
  }
  scrollToBottom()
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

