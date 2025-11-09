import * as admin from 'firebase-admin'
import * as functions from 'firebase-functions'

// Get project ID from Firebase config or environment
function getProjectId(): string {
  // Try to get from Firebase Functions config (when running in emulator/cloud)
  try {
    const config = functions.config()
    if (config?.project?.project_id) {
      return config.project.project_id
    }
  } catch (error) {
    // Not in Firebase Functions context, continue
  }

  // Try to get from environment variable (set by Firebase CLI)
  if (process.env.GCLOUD_PROJECT) {
    return process.env.GCLOUD_PROJECT
  }

  // Try to get from Firebase config file
  if (process.env.FIREBASE_CONFIG) {
    try {
      const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG)
      if (firebaseConfig.projectId) {
        return firebaseConfig.projectId
      }
    } catch (error) {
      // Invalid JSON, continue
    }
  }

  // Default project ID (should match .firebaserc)
  return 'dark-stories-ai-7f82e'
}

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  const projectId = getProjectId()
  const isEmulator = !!process.env.FIRESTORE_EMULATOR_HOST

  try {
    // Try to initialize with default credentials (for production)
    admin.initializeApp()
  } catch (error) {
    // If initialization fails, initialize with project ID (for emulator or when no credentials)
    // This allows the script to run without credentials when using emulator
    admin.initializeApp({
      projectId: projectId,
    })
  }

  // Log connection info for debugging
  if (isEmulator) {
    console.log(`[firebase] Connected to Firestore emulator at ${process.env.FIRESTORE_EMULATOR_HOST}`)
    console.log(`[firebase] Using project ID: ${projectId}`)
  }
  
  // Note: When running locally with emulator, set FIRESTORE_EMULATOR_HOST environment variable
  // Example: FIRESTORE_EMULATOR_HOST=localhost:8081
  // Firebase Admin SDK will automatically connect to the emulator when this variable is set
}

export const db = admin.firestore()
export default admin

