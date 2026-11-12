import { Router } from 'express'
import { authenticate } from '../middlewares/auth.js'
import {
  getMyNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} from '../controllers/notification.controller.js'

const router = Router()

router.get('/',           authenticate, getMyNotifications)
router.get('/unread',     authenticate, getUnreadCount)
router.put('/read-all',   authenticate, markAllAsRead)
router.put('/:id/read',   authenticate, markAsRead)

export default router