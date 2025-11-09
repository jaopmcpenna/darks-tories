import * as functions from 'firebase-functions'
import express from 'express'
import cors from 'cors'

// Initialize Express app
const app = express()

// Middleware
app.use(cors({ origin: true }))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

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
app.use('/api/chat', chatRoutes)

// Export Cloud Function
export const api = functions.region('us-central1').https.onRequest(app)

