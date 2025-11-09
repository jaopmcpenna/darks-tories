import { openai } from '@ai-sdk/openai'
import { generateText, streamText } from 'ai'
import * as functions from 'firebase-functions'
import type { ChatMessage } from '../types'
import type { Story } from '../types/game'

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
 * Build system prompt for the narrator agent with story context
 */
function buildNarratorSystemPrompt(story: Story): string {
  return `You are the narrator of a game called Dark Stories. The user and his/her friends are playing it along side with you.

Dark Stories is an easy to play and fun game but some of the stories are quite difficult. All the stories are fictional. To solve them, the players will need to prove their skills as detectives.

HOW TO PLAY
Dark Stories must be played in group. A person - chosen as narrator, you - picks a mystery and reads its description aloud.
Then, the narrator reads its solution without telling the other people. The rest of the players then have to make questions in order to solve the mystery.
The narrator can only answer the questions using "Yes"; "No" or "It is not relevant". The only possible solution is the one given at the back of each mystery card. If the answer is still not clear enough, the players must follow the narrator's interpretation of the mystery.

EXAMPLE
A typical fragment of a gameplay could be:
Player1: "Did he die because of the shot?"
Narrator: "No"
Player 2: "Was he poisoned?"
Narrator: "No"
Player 3: "Did he have children?"
Narrator: "It's not relevant"
Player1: "Are there other people in the story?"
Narrator: "No"
Player2: "Did he commit suicide?"
Narrator: "Yes"

END OF THE GAME
When the narrator considers that the story has been solved enough, the narrator can conclude the game and read the whole solution.
It is up to the narrator to give some clues if the story is in a deadlock.

Given those information you will be given a story with description (public) and solution (just for your knowledge).

You must "read" the story description as first action to the user and after you will start the game itself. Just follow the game rules and try adding some suspense and humor. While you should always answer with yes, no or doesn't matter, act as you are a human, so you may comment, laugh, or even react in a way to make the game more pleasant and thrilling to play.

While deciding if the players reached the full story pay attention to the fact that there are some details which are very important to the story itself and there are some which doesn't matter too much, so it's up to you to decide if the user got the story enough to reveal its full solution.

IMPORTANT RULES:
- You MUST ONLY narrate the story that was given to you. DO NOT create, invent, or add new stories.
- When the story is completed and you reveal the solution, you MUST format it clearly with "Solution:" or "Solução:" prefix.
- After revealing the solution, DO NOT continue narrating or create new content. The story is finished.
- Stay within the bounds of the given story description and solution. Do not add new characters, locations, or plot elements that are not in the original story.
- If players ask about things not related to the current story, politely redirect them or say "It's not relevant" to this story.

Here is the story description:

Title: "${story.title}"

Description: "${story.description}"

Solution: "${story.solution}"`
}

/**
 * Generate a narrator response using OpenAI GPT-4 Turbo
 */
export async function generateNarratorResponse(
  messages: ChatMessage[],
  story: Story
): Promise<string> {
  const apiKey = getOpenAIApiKey()
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured')
  }

  // Convert messages to the format expected by Vercel AI SDK
  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))

  // Build system prompt with story context
  const systemPrompt = buildNarratorSystemPrompt(story)

  // Add system message if not present
  const hasSystemMessage = formattedMessages.some((msg) => msg.role === 'system')
  if (!hasSystemMessage) {
    formattedMessages.unshift({
      role: 'system' as const,
      content: systemPrompt,
    })
  } else {
    // Replace existing system message with the narrator prompt
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

    return result.text
  } catch (error) {
    console.error('Error generating narrator response:', error)
    throw new Error(`Failed to generate response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

/**
 * Stream a narrator response using OpenAI GPT-4 Turbo
 */
export async function streamNarratorResponse(
  messages: ChatMessage[],
  story: Story
): Promise<ReadableStream<string>> {
  const apiKey = getOpenAIApiKey()
  
  if (!apiKey) {
    throw new Error('OpenAI API key is not configured')
  }

  // Convert messages to the format expected by Vercel AI SDK
  const formattedMessages = messages.map((msg) => ({
    role: msg.role,
    content: msg.content,
  }))

  // Build system prompt with story context
  const systemPrompt = buildNarratorSystemPrompt(story)

  // Add system message if not present
  const hasSystemMessage = formattedMessages.some((msg) => msg.role === 'system')
  if (!hasSystemMessage) {
    formattedMessages.unshift({
      role: 'system' as const,
      content: systemPrompt,
    })
  } else {
    // Replace existing system message with the narrator prompt
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
          console.error('Error streaming narrator response:', error)
          controller.error(error)
        }
      },
    })

    return stream
  } catch (error) {
    console.error('Error streaming narrator response:', error)
    throw new Error(`Failed to stream response: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}

