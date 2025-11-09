import { db } from '../config/firebase'
import type { Story, StoryFilters } from '../types/game'

const STORIES_COLLECTION = 'stories'

/**
 * Get stories with optional filters
 */
export async function getStories(filters?: StoryFilters): Promise<Story[]> {
  try {
    console.log(`[storyService] Fetching stories from collection "${STORIES_COLLECTION}" with filters:`, filters)
    let query: FirebaseFirestore.Query = db.collection(STORIES_COLLECTION)

    // Apply filters
    if (filters?.difficulty) {
      query = query.where('difficulty', '==', filters.difficulty)
    }

    if (filters?.category) {
      query = query.where('category', '==', filters.category)
    }

    if (filters?.tags && filters.tags.length > 0) {
      query = query.where('tags', 'array-contains-any', filters.tags)
    }

    const snapshot = await query.get()
    console.log(`[storyService] Found ${snapshot.docs.length} stories in database`)

    let stories: Story[] = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Story[]

    // Filter out excluded IDs (client-side since Firestore doesn't support != with multiple values easily)
    if (filters?.excludeIds && filters.excludeIds.length > 0) {
      const beforeFilter = stories.length
      stories = stories.filter((story) => !filters.excludeIds!.includes(story.id))
      console.log(`[storyService] Filtered out ${beforeFilter - stories.length} completed stories`)
    }

    console.log(`[storyService] Returning ${stories.length} available stories`)
    return stories
  } catch (error) {
    console.error('[storyService] Error fetching stories:', error)
    throw new Error(`Failed to fetch stories: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get a story by ID
 */
export async function getStoryById(id: string): Promise<Story | null> {
  try {
    const doc = await db.collection(STORIES_COLLECTION).doc(id).get()

    if (!doc.exists) {
      return null
    }

    return {
      id: doc.id,
      ...doc.data(),
    } as Story
  } catch (error) {
    console.error('Error fetching story by ID:', error)
    throw new Error(`Failed to fetch story: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Get available stories (not completed)
 */
export async function getAvailableStories(completedIds: string[] = [], filters?: Omit<StoryFilters, 'excludeIds'>): Promise<Story[]> {
  const storyFilters: StoryFilters = {
    ...filters,
    excludeIds: completedIds,
  }

  return getStories(storyFilters)
}

/**
 * Get a random story from available stories
 */
export async function getRandomStory(completedIds: string[] = [], filters?: Omit<StoryFilters, 'excludeIds'>): Promise<Story | null> {
  console.log(`[storyService] Getting random story. Completed IDs: ${completedIds.length}, Filters:`, filters)
  const availableStories = await getAvailableStories(completedIds, filters)

  if (availableStories.length === 0) {
    console.warn('[storyService] No available stories found')
    return null
  }

  // Return a random story
  const randomIndex = Math.floor(Math.random() * availableStories.length)
  const selectedStory = availableStories[randomIndex]
  console.log(`[storyService] Selected random story: "${selectedStory.title}" (ID: ${selectedStory.id})`)
  return selectedStory
}

