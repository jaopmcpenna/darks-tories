import { db } from '../config/firebase'
import type { Story } from '../types/game'

/**
 * Seed initial stories into Firestore
 * 
 * Note: When running locally, make sure:
 * - Firebase emulators are running, OR
 * - Firebase Admin credentials are configured via:
 *   - GOOGLE_APPLICATION_CREDENTIALS environment variable pointing to service account key, OR
 *   - Default credentials from gcloud CLI
 */
async function seedStories(force: boolean = false) {
  console.log('='.repeat(60))
  console.log('Starting to seed stories...')
  console.log('='.repeat(60))
  
  // Check Firestore connection
  const firestoreEmulatorHost = process.env.FIRESTORE_EMULATOR_HOST
  const projectId = process.env.GCLOUD_PROJECT || 'dark-stories-ai-7f82e'
  
  if (firestoreEmulatorHost) {
    console.log(`✓ Firestore emulator detected: ${firestoreEmulatorHost}`)
    console.log(`✓ Project ID: ${projectId}`)
    console.log(`  Make sure this matches the project in .firebaserc`)
  } else {
    console.log('⚠ No FIRESTORE_EMULATOR_HOST set - using production Firestore')
    console.log(`✓ Project ID: ${projectId}`)
  }

  // First, list all existing stories for debugging
  console.log('\n📋 Checking existing stories in database...')
  try {
    const allStoriesSnapshot = await db.collection('stories').get()
    console.log(`   Found ${allStoriesSnapshot.size} story/stories in collection`)
    
    if (allStoriesSnapshot.size > 0) {
      console.log('\n   Existing stories:')
      allStoriesSnapshot.forEach((doc) => {
        const data = doc.data()
        console.log(`   - ID: ${doc.id}`)
        console.log(`     Title: ${data.title || '(no title)'}`)
        console.log(`     Difficulty: ${data.difficulty || '(no difficulty)'}`)
        console.log('')
      })
    } else {
      console.log('   No stories found in collection\n')
    }
  } catch (error) {
    console.error('   ⚠ Error checking existing stories:', error)
  }

  const stories: Omit<Story, 'id'>[] = [
    {
      title: 'A glass of water',
      description: 'A man walks into a bar and asks for a glass of water. The waiter pulls out a gun from under the bar and points it at the man\'s head. Then, the man says "thank you" to the waiter and leaves the bar.',
      solution: 'The man entered the bar to get rid of his hiccups by drinking a glass of water. The waiter -who noticed this- took out his gun and pointed it at him to cure them by frightening him. The man -now cured- thanked the waiter and left the bar.',
      difficulty: 'medium',
      category: 'mystery',
      tags: ['bar', 'gun', 'water'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  ]

  console.log(`\nPreparing to add ${stories.length} story/stories...`)
  if (force) {
    console.log('⚠ FORCE mode enabled - will add even if story exists\n')
  } else {
    console.log('')
  }

  let addedCount = 0
  let skippedCount = 0
  let errorCount = 0

  for (const story of stories) {
    try {
      console.log(`Processing story: "${story.title}"...`)
      
      // Check if story with same title already exists
      const existingStories = await db
        .collection('stories')
        .where('title', '==', story.title)
        .get()

      if (!existingStories.empty && !force) {
        console.log(`  ⚠ Story "${story.title}" already exists (found ${existingStories.size} match/es).`)
        existingStories.forEach((doc) => {
          console.log(`     - Existing ID: ${doc.id}`)
        })
        console.log(`  Skipping... (use --force to override)`)
        skippedCount++
        continue
      }

      // If force mode and story exists, delete existing ones first
      if (!existingStories.empty && force) {
        console.log(`  🔄 Force mode: Deleting ${existingStories.size} existing story/stories...`)
        const deletePromises = existingStories.docs.map((doc) => doc.ref.delete())
        await Promise.all(deletePromises)
        console.log(`  ✓ Deleted existing stories`)
      }

      // Add story to Firestore
      console.log(`  → Adding story to Firestore...`)
      const docRef = await db.collection('stories').add(story)
      console.log(`  ✓ Successfully added story "${story.title}" with ID: ${docRef.id}`)
      addedCount++
    } catch (error) {
      console.error(`  ✗ Error adding story "${story.title}":`, error)
      if (error instanceof Error) {
        console.error(`    Error message: ${error.message}`)
        console.error(`    Error stack: ${error.stack}`)
      }
      errorCount++
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('Seed completed!')
  console.log(`  Added: ${addedCount}`)
  console.log(`  Skipped: ${skippedCount}`)
  console.log(`  Errors: ${errorCount}`)
  console.log('='.repeat(60))
  
  return { addedCount, skippedCount, errorCount }
}

// Run seed if executed directly
if (require.main === module) {
  // Check for --force flag
  const force = process.argv.includes('--force') || process.argv.includes('-f')
  
  seedStories(force)
    .then((result) => {
      if (result.errorCount > 0) {
        console.error('\n⚠ Some errors occurred during seeding')
        process.exit(1)
      } else if (result.addedCount === 0 && result.skippedCount === 0) {
        console.error('\n⚠ No stories were processed')
        process.exit(1)
      } else {
        console.log('\n✓ All stories processed successfully!')
        process.exit(0)
      }
    })
    .catch((error) => {
      console.error('\n✗ Fatal error seeding stories:', error)
      if (error instanceof Error) {
        console.error('Error message:', error.message)
        console.error('Error stack:', error.stack)
      }
      process.exit(1)
    })
}

export default seedStories

