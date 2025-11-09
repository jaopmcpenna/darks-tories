import * as functions from 'firebase-functions'
import express from 'express'
import cors from 'cors'

// Initialize Express app
const app = express()

// Middleware
// CORS configuration - allow all origins for development
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'xi-api-key'],
}))

// Handle preflight requests
app.options('*', cors())

app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
// Support raw body for audio uploads (will be handled as base64 in JSON)
app.use(express.raw({ type: 'audio/*', limit: '50mb' }))

// Health check endpoint
app.get('/health', (req, res) => {
  const config = functions.config()
  const openaiApiKey = config?.openai?.api_key || process.env.OPENAI_API_KEY
  
  const healthStatus = {
    status: 'ok',
    message: 'Dark Stories API is running',
    timestamp: new Date().toISOString(),
    service: 'darks-tories-api',
    version: '1.0.0',
    checks: {
      api: 'healthy',
      openai: openaiApiKey ? 'configured' : 'not_configured',
    },
  }
  
  res.status(200).json(healthStatus)
})

// Import routes
import chatRoutes from './routes/chat'
import voiceRoutes from './routes/voice'
app.use('/chat', chatRoutes)
app.use('/voice', voiceRoutes)

// Export Cloud Function
export const api = functions.region('us-central1').https.onRequest(app)

