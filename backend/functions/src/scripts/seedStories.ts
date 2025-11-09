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
    {
      title: 'An open door',
      description: 'When Martin woke up that morning, he was surprised to see the door open. As soon as he crossed the threshold he got beheaded.',
      solution: 'Martin was a canary that had been living in his cage for four months. Silvester -a cat- was waiting for his opportunity to catch Martin and eat him. When their owner left the cage door open by mistake Martin flew out of it and Silvester bit off his small head.',
      difficulty: 'medium',
      category: 'mystery',
      tags: ['door', 'animal', 'death'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'Doctor, doctor',
      description: 'A man goes to the doctor to get the results of some previous tests. The results do not show up any health issues. However, he commits suicide shortly after the visit.',
      solution: 'The patient knew that his wife was cheating on him, but he only knew the lover\'s name. His wife swore to him that this lover did not exist. However when the man left the doctor\'s, he saw the lover\'s name on the report. He realized his wife was cheating on him with the doctor and could not cope with it.',
      difficulty: 'hard',
      category: 'mystery',
      tags: ['doctor', 'suicide', 'betrayal'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'Jumping from a 6th floor',
      description: 'A woman jumps from a windowsill, on a 6th floor. However, she is not injured in any way.',
      solution: 'The woman was about to commit suicide but she changed her mind in the last minute and decided to jump back into her apartment.',
      difficulty: 'medium',
      category: 'mystery',
      tags: ['suicide', 'building', 'woman'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'Splish, splash!',
      description: 'Tim is sailing his boat when his watch falls overboard. He is a great diver. However, he does not manage to retrieve the watch.',
      solution: 'Tim was sailing on the Dead Sea. Due to the high salt concentration, he couldn\'t dive deep enough to get his watch back.',
      difficulty: 'hard',
      category: 'mystery',
      tags: ['sea', 'watch', 'diving'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'The blackout',
      description: 'A woman -at work- is going downstairs, when suddenly there is a blackout. In that very moment she realizes that her husband is about to die.',
      solution: 'The woman worked as an electrician at a hospital and she knew that the emergency generators were broken. Her husband had had a car crash and he was at that hospital, connected to a machine that kept him alive. When the blackout happened she knew that her husband couldn\'t be breathing by himself and therefore that he was dying.',
      difficulty: 'hard',
      category: 'mystery',
      tags: ['blackout', 'hospital', 'death'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'Not now...!',
      description: 'A woman is at home, sad, and watching the street through her window. Soon after, she jumps out of it. Just in that precise moment, she hears the telephone ringing and regrets jumping.',
      solution: 'After a nuclear catastrophe, the woman thought that she was the only person alive and decided to put an end to her life. When the telephone rang she realized that she was not alone. But it was too late for her.',
      difficulty: 'hard',
      category: 'mystery',
      tags: ['suicide', 'nuclear', 'telephone'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'The last train',
      description: 'Oscar was sitting reading his newspaper, when he heard a noise. When he realized what had happened, he bitterly regretted not having caught the train in time. Shortly afterwards, he committed suicide.',
      solution: 'Oscar was broke. He was a train collector and, to solve his economic problems, he was going to sell his most valuable train. He had been cleaning it and did not put it down on the table properly when he finished. When he sat down and began to read his newspaper, he heard how it fell off the table. He could not catch it in time before it crashed into the floor.',
      difficulty: 'hard',
      category: 'mystery',
      tags: ['train', 'suicide', 'collector'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'An unsolved robbery',
      description: 'A guy goes into a drugstore and leaves shortly after with the money from the cash register. The drugstore owner calls the Police Station and, some time later, a police officer recovers the money and takes the guy away. That evening, the three people go to the police station to report a theft.',
      solution: 'The guy was the drugstore owner\'s son. His car had been stolen and he had an important exam. He had been to the drugstore to ask his mother for some money so he could take a taxi. In addition to this, the mother called her husband -who was a police officer- and asked him to bring their son to the exam. He did, and since the son did not need the money any more, he gave it back to his father, who returned it to the mother. At the end of the day, the whole family reported the car theft.',
      difficulty: 'hard',
      category: 'mystery',
      tags: ['robbery', 'police', 'family'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'The accident',
      description: 'A car driver causes an accident when he crashes into a bike, as he was making an unexpected turn at a crossroad. When the policemen arrive, another man gets arrested. The one who was driving is carried home.',
      solution: 'The driver was receiving driving lessons and his instructor told him to make an incorrect turn at a crossroad, crashing into a bike. The policemen considered the driving instructor to be responsible for the accident so they arrested him and took the learner home.',
      difficulty: 'medium',
      category: 'mystery',
      tags: ['accident', 'car', 'police'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'A death in a museum',
      description: 'A man wearing a balaclava runs out of a museum carrying a painting under his arm. A police officer sees him, shoots him dead and commits suicide soon after. A couple of days later, the man with the painting is buried and named favorite son of the city.',
      solution: 'During a cold spell, there is fire in a museum and its director tried to save the most valuable painting from the museum\'s collection. The police officer had not noticed the fire and thought the man with the painting was a thief. He told him to freeze but, since the director was deaf, he did not hear the police officer. When the police officer realized what he had done, he committed suicide.',
      difficulty: 'hard',
      category: 'mystery',
      tags: ['museum', 'police', 'suicide'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'Witness to a kidnapping',
      description: 'A businessman witnesses a kidnapping. However, when he tells the police, they do not believe him.',
      solution: 'After leaving the dentist, the witness was unable to speak properly, since he had numb mouth. The policemen thought that the man was drunk and did not believe a word he said.',
      difficulty: 'medium',
      category: 'mystery',
      tags: ['kidnapping', 'police', 'dentist'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'Another two bite the dust',
      description: 'Two men are beating each other up and both of them suddenly fall to the floor.',
      solution: 'The daughter of one of the boxers had been kidnapped and she would be killed if her father won the fight. At the end of the fight, the boxer\'s opponent fainted and the other boxer -in order not to win the match- threw himself to the floor.',
      difficulty: 'hard',
      category: 'mystery',
      tags: ['boxing', 'kidnapping', 'fight'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'A premature death',
      description: 'A man who was expecting to die in a few days dies sooner than he thought.',
      solution: 'The man was really sick and he had decided to donate his organs to a rich man. Since this rich man\'s son wanted to inherit his father\'s fortune he poisoned the donor so that his organs became unable to work again in his father\'s body.',
      difficulty: 'hard',
      category: 'mystery',
      tags: ['death', 'organ', 'poison'],
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    {
      title: 'Lost',
      description: 'Jack goes on a trip with his compass. After a long walk, he stops to eat a sandwich. He is not able to find his way back afterwards.',
      solution: 'Jack was a scientist who worked near the North Pole. When he went walking, he walked towards the north, and he stopped to eat his sandwich exactly at the North Pole. When he tried to return home, his compass was useless, since every direction pointed South.',
      difficulty: 'medium',
      category: 'mystery',
      tags: ['compass', 'north pole', 'lost'],
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

