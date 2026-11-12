import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { getDoctors, shareFile } from '../controllers/api.controller.js'
import { getMagicLinkPreview, markReviewedViaMagicLink } from '../controllers/magicLink.controller.js'

const router = Router()

// Public One-Tap Magic Link resolution routes
router.get('/a/:token', getMagicLinkPreview)
router.post('/a/:token/review', markReviewedViaMagicLink)

// GET /api/files/share - Share a specific analysis file with a doctor
router.post('/files/share', authenticate, shareFile)

export default router
