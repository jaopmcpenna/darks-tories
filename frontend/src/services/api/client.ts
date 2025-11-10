import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig, AxiosResponse } from 'axios'

// Determine API base URL based on environment
// In production, use Firebase Cloud Functions URL
// In development, use localhost emulator or custom VITE_API_BASE_URL
const getApiBaseUrl = (): string => {
  // If explicitly set via environment variable, use that
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  
  // In production (when not running on localhost), use Firebase Functions URL
  if (import.meta.env.PROD || (typeof window !== 'undefined' && !window.location.hostname.includes('localhost'))) {
    return 'https://us-central1-dark-stories-ai-7f82e.cloudfunctions.net/api'
  }
  
  // Default to localhost emulator for development
  return 'http://127.0.0.1:5001/dark-stories-ai-7f82e/us-central1/api'
}

const API_BASE_URL = getApiBaseUrl()

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Add auth token if available
    // const token = localStorage.getItem('authToken')
    // if (token && config.headers) {
    //   config.headers.Authorization = `Bearer ${token}`
    // }
    return config
  },
  (error: AxiosError) => {
    return Promise.reject(error)
  }
)

// Response interceptor
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    return response
  },
  (error: AxiosError) => {
    // Handle common errors
    if (error.response) {
      // Server responded with error status
      switch (error.response.status) {
        case 401:
          // Unauthorized - handle logout
          console.error('Unauthorized access')
          break
        case 403:
          // Forbidden
          console.error('Access forbidden')
          break
        case 404:
          // Not found
          console.error('Resource not found')
          break
        case 500:
          // Server error
          console.error('Server error')
          break
        default:
          console.error('Request failed:', error.message)
      }
    } else if (error.request) {
      // Request made but no response received
      console.error('No response received:', error.message)
    } else {
      // Error setting up request
      console.error('Error setting up request:', error.message)
    }
    return Promise.reject(error)
  }
)

export default apiClient

