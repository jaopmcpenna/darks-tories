import apiClient from './client'

export interface Story {
  id: string
  title: string
  description: string
  solution: string
  difficulty: 'easy' | 'medium' | 'hard'
  category: string
  tags?: string[]
  createdAt?: string
  updatedAt?: string
}

export interface StoriesResponse {
  success: boolean
  stories: Story[]
  message?: string
}

/**
 * Get all stories
 */
export async function getStories(): Promise<Story[]> {
  const response = await apiClient.get<StoriesResponse>('/stories')
  
  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to fetch stories')
  }

  return response.data.stories
}

