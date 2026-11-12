import { Router } from 'express'
import {
  listPublicDoctors,
  getPublicDoctorProfile,
  getAvailableSlots,
  bookAppointment
} from '../controllers/appointment.controller.js'
import { authenticate, authorize, authorizeAssistant } from '../middlewares/auth.js'
import { assistantBookAppointment, getDoctorAppointments, updateAppointmentStatus } from '../controllers/appointment.controller.js'

const router = Router()

// ─── Public (no auth) ─────────────────────────────────────────────────────────
router.get('/doctors', listPublicDoctors)
router.get('/doctors/:id', getPublicDoctorProfile)
router.get('/doctors/:id/available-slots', getAvailableSlots)
router.post('/appointments/book', bookAppointment)

// ─── Doctor & Assistant: manage appointments ─────────────────────────────────────────
router.get('/appointments', authenticate, authorize('DOCTOR', 'ASSISTANT'), getDoctorAppointments)
router.put('/appointments/:id/status', authenticate, authorize('DOCTOR', 'ASSISTANT'), updateAppointmentStatus)

// ─── Assistant: book on behalf of patient ─────────────────────────────────────
router.post('/assistant/appointments/book', authenticate, authorize('ASSISTANT'), authorizeAssistant, assistantBookAppointment)

export default router
