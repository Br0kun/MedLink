import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import { getInbox, markReviewed, getInboxCount, getSharedWithMe, getSafetyNetSettings, updateSafetyNetSettings, getDashboardStats } from '../controllers/doctor.controller.js'
import { listChatDoctors, getMessages, sendMessage, getUnreadTotal } from '../controllers/chat.controller.js'
import { getStaff, approveAssistant, banAssistant, getDoctorSchedule, updateDoctorSchedule } from '../controllers/staff_schedule.controller.js'

const router = Router()

router.use(authenticate, authorize('DOCTOR'))

router.get('/stats', getDashboardStats)
router.get('/inbox', getInbox)
router.get('/inbox/count', getInboxCount)
router.get('/shared-with-me', getSharedWithMe)
router.put('/inbox/:id/review', markReviewed)

// Doctor Safety Net settings & notification preferences
router.get('/safety-net-settings', getSafetyNetSettings)
router.put('/safety-net-settings', updateSafetyNetSettings)
router.get('/availability', getSafetyNetSettings)
router.put('/availability', updateSafetyNetSettings)
router.put('/notification-prefs', updateSafetyNetSettings)

// Chat routes
router.get('/chat/doctors', listChatDoctors)
router.get('/chat/unread-total', getUnreadTotal)
router.get('/chat/:otherUserId/messages', getMessages)
router.post('/chat/:otherUserId', sendMessage)

// Staff management
router.get('/staff', getStaff)
router.put('/staff/:id/approve', approveAssistant)
router.put('/staff/:id/ban', banAssistant)

// Schedule management
router.get('/schedule', getDoctorSchedule)
router.put('/schedule', updateDoctorSchedule)

export default router
