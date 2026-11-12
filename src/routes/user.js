import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import { getProfile, updateProfile, updatePassword } from '../controllers/user.controller.js'

const router = Router()

router.get('/profile', authenticate, getProfile)
router.put('/profile', authenticate, updateProfile)
router.put('/password', authenticate, updatePassword)

export default router
