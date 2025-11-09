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
  res.status(200).json({ status: 'ok', message: 'Dark Stories API is running' })
})

// Import routes (to be created)
// import storiesRoutes from './routes/stories'
// app.use('/api/stories', storiesRoutes)

// Export Cloud Function
export const api = functions.region('us-central1').https.onRequest(app)

