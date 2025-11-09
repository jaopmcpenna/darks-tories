import { openai } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import * as functions from 'firebase-functions'
import type { ChatMessage } from '../types'
import { getRandomStory, getAvailableStories } from './storyService'
import type { StoryDifficulty } from '../types/game'

// Get OpenAI API key from Firebase config or environment
const getOpenAIApiKey = (): string => {
  const config = functions.config()
  const apiKey = config?.openai?.api_key || process.env.OPENAI_API_KEY || ''
  
  // Set environment variable for Vercel AI SDK
  if (apiKey && !process.env.OPENAI_API_KEY) {
    process.env.OPENAI_API_KEY = apiKey
  }
  
  return apiKey
}

/**
 * Build system prompt for the story selection agent
 */
function buildStorySelectionSystemPrompt(availableStoriesCount: number, allStoriesCompleted: boolean = false): string {
  if (allStoriesCompleted) {
    return `You are a friendly assistant helping players with the Dark Stories game.

IMPORTANT: All available stories have been completed! There are no more stories available to play.

When the user asks to play or select a story, you MUST inform them politely and clearly that:
- They have completed all available stories
- There are no more stories to play at this time
- Congratulate them on completing all the stories
- Be friendly and encouraging

Do NOT try to select a story or transition to narrator mode. Simply inform them that all stories have been completed.

Be friendly, congratulatory, and understanding.`
  }

  return `You are a friendly assistant helping players choose a story for the Dark Stories game.

Dark Stories is an easy to play and fun game but some of the stories are quite difficult. All the stories are fictional. To solve them, the players will need to prove their skills as detectives.

HOW THE GAME WORKS:
- A narrator (which will be an AI) picks a mystery and reads its description aloud
- The narrator knows the solution but doesn't tell the players
- Players ask yes/no questions to solve the mystery
- The narrator can only answer with "Yes", "No", or "It's not relevant"
- When players solve the mystery, the narrator reveals the full solution

YOUR ROLE:
1. Welcome the user and explain what Dark Stories is
2. Ask if they'd like you to choose a story for them
3. Ask about their preferences:
   - Difficulty level (easy, medium, or hard)
   - Whether they're playing alone or with friends
   - Any specific themes or categories they might like
4. Once you understand their preferences, choose an appropriate story from the available ${availableStoriesCount} stories
5. When you've chosen a story, you MUST transition to the narrator by:
   - Confirming the story choice
   - Saying something like "Perfect! Let's begin. [Story Title]"
   - Then immediately reading the story description exactly as provided
   - After reading the description, say something like "Now, let's start! Ask me questions and I'll answer with Yes, No, or It's not relevant."

IMPORTANT TRANSITION RULES:
- When you're ready to start the game, you MUST include the story information in your response
- Format: "Title: [title]\\nDescription: [description]"
- DO NOT include the solution - that is only for the narrator agent to know
- After providing this information, the narrator agent will take over
- Be enthusiastic and create anticipation!

IMPORTANTT CONVERSATION FLOW:
- Be synthetic and concise.
- Explore one question at time.

Be friendly, conversational, and help create excitement about the game!`
}

/**
 * Extract preferences from conversation messages
 */
function extractPreferences(messages: ChatMessage[]): {
  difficulty?: StoryDifficulty
  playingWithFriends?: boolean
} {
  const conversationText = messages
    .filter((msg) => msg.role === 'user')
    .map((msg) => msg.content.toLowerCase())
    .join(' ')

  const preferences: {
    difficulty?: StoryDifficulty
    playingWithFriends?: boolean
  } = {}

  // Extract difficulty
  if (conversationText.includes('easy') || conversationText.includes('fácil')) {
    preferences.difficulty = 'easy'
  } else if (conversationText.includes('hard') || conversationText.includes('difícil') || conversationText.includes('difficult')) {
    preferences.difficulty = 'hard'
  } else if (conversationText.includes('medium') || conversationText.includes('médio') || conversationText.includes('intermediate')) {
    preferences.difficulty = 'medium'
  }

  // Extract playing with friends
  if (conversationText.includes('friend') || conversationText.includes('amigo') || conversationText.includes('group') || conversationText.includes('grupo')) {
    preferences.playingWithFriends = true
  } else if (conversationText.includes('alone') || conversationText.includes('sozinho') || conversationText.includes('solo')) {
    preferences.playingWithFriends = false
  }

  return preferences
}

/**
 * Generate a story selection response using OpenAI GPT-4 Turbo
 */
export async function generateStorySelectionResponse(
  messages: ChatMessage[],
  completedStoryIds: string[] = []
): Promise<{ response: string; selectedStory?: { id: string; title: string; description: string; solution: string } }> {
  const apiKey = getOpenAIApiKey()
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured')
  }

  // Convert messages to the format expected by Vercel AI SDK
  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))

  // Check if we need to select a story (user has indicated readiness)
  const lastUserMessage = messages.filter((msg) => msg.role === 'user').pop()
  const conversationText = messages.map((msg) => msg.content).join(' ').toLowerCase()
  
  // Check if user is ready to start (has answered questions or explicitly asked to start)
  const isReadyToSelect = 
    conversationText.includes('yes') || 
    conversationText.includes('sim') ||
    conversationText.includes('start') ||
    conversationText.includes('começar') ||
    conversationText.includes('choose') ||
    conversationText.includes('escolher') ||
    (messages.length > 4 && lastUserMessage && lastUserMessage.content.length > 10)

  let selectedStory: { id: string; title: string; description: string; solution: string } | undefined
  let allStoriesCompleted = false

  // Check if there are any available stories first
  const availableStories = await getAvailableStories(completedStoryIds)
  const availableStoriesCount = availableStories.length

  if (availableStoriesCount === 0) {
    console.log('[storySelectionAgent] No available stories - all stories have been completed!')
    allStoriesCompleted = true
  }

  // If ready, select a story
  if (isReadyToSelect && !allStoriesCompleted) {
    console.log('[storySelectionAgent] User is ready to select a story. Fetching from database...')
    const preferences = extractPreferences(messages)
    console.log('[storySelectionAgent] Extracted preferences:', preferences)
    
    const story = await getRandomStory(completedStoryIds, {
      difficulty: preferences.difficulty,
    })

    if (story) {
      console.log(`[storySelectionAgent] Story selected from database: "${story.title}" (ID: ${story.id})`)
      selectedStory = {
        id: story.id,
        title: story.title,
        description: story.description,
        solution: story.solution,
      }

      // Add story context to the last message
      // NOTE: Do NOT include the solution here - it's only for the narrator agent
      const contextMessage = `Available story selected:
Title: ${story.title}
Description: ${story.description}

Now transition to narrator mode and read the story description to start the game. The narrator agent will have access to the solution separately.`
      
      formattedMessages.push({
        role: 'user' as const,
        content: contextMessage,
      })
    } else {
      console.warn('[storySelectionAgent] No story found in database!')
      allStoriesCompleted = true
    }
  } else {
    console.log('[storySelectionAgent] User not ready to select story yet')
  }

  // Build system prompt
  const systemPrompt = buildStorySelectionSystemPrompt(
    allStoriesCompleted ? 0 : availableStoriesCount,
    allStoriesCompleted
  )

  // Add system message if not present
  const hasSystemMessage = formattedMessages.some((msg) => msg.role === 'system')
  if (!hasSystemMessage) {
    formattedMessages.unshift({
      role: 'system' as const,
      content: systemPrompt,
    })
  } else {
    // Replace existing system message
    const systemIndex = formattedMessages.findIndex((msg) => msg.role === 'system')
    if (systemIndex >= 0) {
      formattedMessages[systemIndex] = {
        role: 'system' as const,
        content: systemPrompt,
      }
    }
  }

  try {
    const result = await generateText({
      model: openai('gpt-4.1'),
      messages: formattedMessages as any,
      temperature: 0.8,
      maxTokens: 1000,
    })

    return {
      response: result.text,
      selectedStory,
    }
  } catch (error) {
    console.error('Error generating story selection response:', error)
    throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Stream a story selection response using OpenAI GPT-4 Turbo
 * Returns both the stream and the selected story (if any)
 */
export async function streamStorySelectionResponse(
  messages: ChatMessage[],
  completedStoryIds: string[] = []
): Promise<{ stream: ReadableStream<string>; selectedStory?: { id: string; title: string; description: string; solution: string } }> {
  const apiKey = getOpenAIApiKey()
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured')
  }

  // Convert messages to the format expected by Vercel AI SDK
  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))

  // Check if we need to select a story (user has indicated readiness)
  const lastUserMessage = messages.filter((msg) => msg.role === 'user').pop()
  const conversationText = messages.map((msg) => msg.content).join(' ').toLowerCase()
  
  // Check if user is ready to start (has answered questions or explicitly asked to start)
  const isReadyToSelect = 
    conversationText.includes('yes') || 
    conversationText.includes('sim') ||
    conversationText.includes('start') ||
    conversationText.includes('começar') ||
    conversationText.includes('choose') ||
    conversationText.includes('escolher') ||
    (messages.length > 4 && lastUserMessage && lastUserMessage.content.length > 10)

  // Check if there are any available stories first
  const availableStories = await getAvailableStories(completedStoryIds)
  const availableStoriesCount = availableStories.length
  let allStoriesCompleted = false
  let selectedStory: { id: string; title: string; description: string; solution: string } | undefined

  if (availableStoriesCount === 0) {
    console.log('[storySelectionAgent] No available stories - all stories have been completed!')
    allStoriesCompleted = true
  }

  // If ready, select a story from the database
  if (isReadyToSelect && !allStoriesCompleted) {
    console.log('[storySelectionAgent] User is ready to select a story. Fetching from database...')
    const preferences = extractPreferences(messages)
    console.log('[storySelectionAgent] Extracted preferences:', preferences)
    
    const story = await getRandomStory(completedStoryIds, {
      difficulty: preferences.difficulty,
    })

    if (story) {
      console.log(`[storySelectionAgent] Story selected from database: "${story.title}" (ID: ${story.id})`)
      selectedStory = {
        id: story.id,
        title: story.title,
        description: story.description,
        solution: story.solution,
      }
      // Add story context to the last message
      // NOTE: Do NOT include the solution here - it's only for the narrator agent
      const contextMessage = `Available story selected:
Title: ${story.title}
Description: ${story.description}

Now transition to narrator mode and read the story description to start the game. The narrator agent will have access to the solution separately.`
      
      formattedMessages.push({
        role: 'user' as const,
        content: contextMessage,
      })
    } else {
      console.warn('[storySelectionAgent] No story found in database!')
      allStoriesCompleted = true
    }
  } else {
    console.log('[storySelectionAgent] User not ready to select story yet')
  }

  // Build system prompt
  const systemPrompt = buildStorySelectionSystemPrompt(
    allStoriesCompleted ? 0 : availableStoriesCount,
    allStoriesCompleted
  )

  // Add system message if not present
  const hasSystemMessage = formattedMessages.some((msg) => msg.role === 'system')
  if (!hasSystemMessage) {
    formattedMessages.unshift({
      role: 'system' as const,
      content: systemPrompt,
    })
  } else {
    // Replace existing system message
    const systemIndex = formattedMessages.findIndex((msg) => msg.role === 'system')
    if (systemIndex >= 0) {
      formattedMessages[systemIndex] = {
        role: 'system' as const,
        content: systemPrompt,
      }
    }
  }

  try {
    const result = await streamText({
      model: openai('gpt-4.1'),
      messages: formattedMessages as any,
      temperature: 0.8,
      maxTokens: 1000,
    })

    // Convert the stream to a ReadableStream<string>
    const stream = new ReadableStream<string>({
      async start(controller) {
        try {
          for await (const chunk of result.textStream) {
            controller.enqueue(chunk)
          }
          controller.close()
        } catch (error) {
          console.error('Error streaming story selection response:', error)
          controller.error(error)
        }
      },
    })

    return { stream, selectedStory }
  } catch (error) {
    console.error('Error streaming story selection response:', error)
    throw new Error(`Failed to stream response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

