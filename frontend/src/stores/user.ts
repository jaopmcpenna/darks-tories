import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

const STORAGE_KEY = 'darks-tories-user-name'

export const useUserStore = defineStore('user', () => {
  const userName = ref<string | null>(null)

  function loadUserName() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        userName.value = stored
      }
    } catch (err) {
      console.error('Failed to load user name:', err)
    }
  }

  function saveUserName(name: string) {
    try {
      const trimmedName = name.trim()
      if (trimmedName) {
        userName.value = trimmedName
        localStorage.setItem(STORAGE_KEY, trimmedName)
      }
    } catch (err) {
      console.error('Failed to save user name:', err)
    }
  }

  function clearUserName() {
    try {
      userName.value = null
      localStorage.removeItem(STORAGE_KEY)
    } catch (err) {
      console.error('Failed to clear user name:', err)
    }
  }

  const hasUserName = computed(() => userName.value !== null && userName.value.trim() !== '')

  // Initialize: load name on store creation
  loadUserName()

  return {
    userName,
    loadUserName,
    saveUserName,
    clearUserName,
    hasUserName,
  }
})

