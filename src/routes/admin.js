import { Router } from 'express'
import { authenticate, authorize } from '../middlewares/auth.js'
import {
  getStats,
  getAllUsers,
  getUserDetail,
  toggleUserStatus,
  getAuditLogs,
  getAccessGrants,
  getBreakGlassLogs,
  getPendingVerifications,
  verifyAccount,
  getPendingVerificationsCount,
} from '../controllers/admin.controller.js'

const router = Router()

router.use(authenticate, authorize('ADMIN'))

router.get('/stats', getStats)
router.get('/users', getAllUsers)
router.get('/users/:id', getUserDetail)
router.put('/users/:id/toggle', toggleUserStatus)
router.get('/audit-logs', getAuditLogs)
router.get('/access-grants', getAccessGrants)
router.get('/break-glass-logs', getBreakGlassLogs)
router.get('/verifications', getPendingVerifications)
router.get('/verifications/count', getPendingVerificationsCount)
router.put('/verifications/:id', verifyAccount)

export default router
