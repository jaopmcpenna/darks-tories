<template>
  <OnboardingView v-if="!userStore.userName" />
  <div v-else class="home-container">
    <div class="user-greeting">
      <h2>Welcome back, {{ userStore.userName }}!</h2>
    </div>
    <ChatView />
  </div>
</template>

<script setup lang="ts">
import ChatView from '../components/ChatView.vue'
import OnboardingView from '../components/OnboardingView.vue'
import { useUserStore } from '../stores/user'

const userStore = useUserStore()
</script>

<style scoped>
.home-container {
  position: relative;
  width: 100%;
  height: 100%;
}

.user-greeting {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 1000;
  background: rgba(34, 34, 34, 0.9);
  backdrop-filter: blur(10px);
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  border: 1px solid #333;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}

.user-greeting h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 500;
  color: #e0e0e0;
}

/* Mobile adjustments */
@media (max-width: 768px) {
  .user-greeting {
    top: 0.5rem;
    right: 0.5rem;
    padding: 0.5rem 1rem;
  }
  
  .user-greeting h2 {
    font-size: 0.875rem;
  }
}
</style>

