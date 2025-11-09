import { Router, Request, Response } from 'express'
import { getStories } from '../services/storyService'

const router = Router()

/**
 * GET /api/stories
 * Get all stories
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const stories = await getStories()
    
    res.status(200).json({
      success: true,
      stories,
    })
  } catch (error) {
    console.error('[stories] Error fetching stories:', error)
    res.status(500).json({
      success: false,
      message: error instanceof Error ? error.message : 'Failed to fetch stories',
    })
  }
})

export default router

